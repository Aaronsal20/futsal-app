'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Container,
  Title,
  Stack,
  Table,
  Text,
  Group,
  Button,
  Card,
  Loader,
  Divider,
  Badge,
  Notification,
  Modal,
  Select,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Timeline,
  ActionIcon,
  Tooltip,
  Center,
  RingProgress,
  ScrollArea,
  Avatar,
  Tabs,
  rem
} from '@mantine/core'
import { 
  IconBallFootball, 
  IconRectangleVertical, 
  IconClock, 
  IconTrophy, 
  IconPlayerPlay, 
  IconCalendarEvent,
  IconShirt,
  IconUser
} from '@tabler/icons-react'
import styles from '../../../tournament.module.css';


const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export default function LiveTournamentPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<any>(null)
  const [view, setView] = useState<'table' | 'stats'>('table')
  const [fixtures, setFixtures] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [playerStats, setPlayerStats] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [activeFixture, setActiveFixture] = useState<any>(null)
  const [matchTime, setMatchTime] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [selectingPlayer, setSelectingPlayer] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [endTournamentModalOpen, setEndTournamentModalOpen] = useState(false)
  const [mvpPlayerId, setMvpPlayerId] = useState<string | null>(null)
  const [goldenGlovePlayerId, setGoldenGlovePlayerId] = useState<string | null>(null)
  const [goldenBootPlayer, setGoldenBootPlayer] = useState<any>(null)
  const [finalWinnerId, setFinalWinnerId] = useState<string | null>(null)

  const [penaltyShootout, setPenaltyShootout] = useState<{
    active: boolean
    team1Score: number
    team2Score: number
  }>({
    active: false,
    team1Score: 0,
    team2Score: 0,
  })



  useEffect(() => {
    let interval: any
    if (timerRunning) {
      interval = setInterval(() => {
        setMatchTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerRunning])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // ---- Fetch Tournament ----
      const { data: tData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()
      setTournament(tData)

      const { data: eventData, error: eventError } = await supabase
        .from('match_events')
        .select('*')
        .eq('tournament_id', id)

      if (eventError) {
        console.error('error fetching events', eventError)
      } else {
        setEvents(eventData || []) // <- set events in state
      }



      // ---- Fetch Fixtures ----

      const { data: fData, error } = await supabase
        .from('fixtures')
        .select(`
    id,
    status,
    started_at,
    scheduled_time,
    team1_id,
    round,
    team2_id,
    team1:team1_id(name, color),
    team2:team2_id(name, color)
  `)
        .eq('tournament_id', id)
        .not('team1_id', 'is', null)
        .not('team2_id', 'is', null)
        .order('scheduled_time', { ascending: true })

      setFixtures(fData || [])

      // ---- Check if any match is live ----
      const liveMatch = fData?.find((f) => f.status === 'live')
      if (liveMatch) {
        setActiveFixture(liveMatch)

        // Calculate elapsed time
        if (liveMatch.started_at) {
          const elapsed = Math.floor(
            (Date.now() - new Date(liveMatch.started_at).getTime()) / 1000
          )
          setMatchTime(elapsed)
          setTimerRunning(true)
        }
      }

      // ---- Fetch Teams ----
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('tournament_id', id)
      console.log('🚀 ~ fetchData ~ teamData:', teamData)
      setTeams(teamData || [])

      // ---- Fetch Players ----
      // We try to fetch by auction_id first if available, otherwise tournament_id
      let playersQuery = supabase
        .from('auction_players')
        .select(`
          id,
          tournament_id,
          team_id,
          player:player_id (id, first_name, last_name)
        `)
        .not('team_id', 'is', null)

      if (tData?.auction_id) {
        playersQuery = playersQuery.eq('auction_id', tData.auction_id)
      } else {
        playersQuery = playersQuery.eq('tournament_id', id)
      }

      const { data: playersData, error: playersError } = await playersQuery

      if (playersError) {
        console.error('Error fetching players:', playersError)
      }

      const mappedPlayers = (playersData || [])
        .filter((ap) => ap.player) // Ensure player data exists
        .map((ap) => ({
          id: ap.player.id,
          first_name: ap.player.first_name,
          last_name: ap.player.last_name,
          team_id: ap.team_id,
        }))
      console.log('🚀 ~ fetchData ~ mappedPlayers:', mappedPlayers)

      setPlayers(mappedPlayers)

      setLoading(false)
    }

    fetchData()
  }, [id])

  // ---- Calculate Stats Effect ----
  useEffect(() => {
    if (teams.length === 0) return

    // 1. Team Stats
    const stats: any = {}
    teams.forEach((t) => {
      stats[t.id] = {
        team_id: t.id,
        name: t.name,
        played: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      }
    })

    fixtures.forEach((fix) => {
      const team1Goals =
        events.filter(
          (e) =>
            e.fixture_id === fix.id &&
            e.team_id === fix.team1_id &&
            e.event_type === 'goal'
        ).length || 0

      const team2Goals =
        events.filter(
          (e) =>
            e.fixture_id === fix.id &&
            e.team_id === fix.team2_id &&
            e.event_type === 'goal'
        ).length || 0

      if (fix.status === 'completed') {
        if (stats[fix.team1_id]) {
          stats[fix.team1_id].played++
          stats[fix.team1_id].gf += team1Goals
          stats[fix.team1_id].ga += team2Goals
        }
        if (stats[fix.team2_id]) {
          stats[fix.team2_id].played++
          stats[fix.team2_id].gf += team2Goals
          stats[fix.team2_id].ga += team1Goals
        }

        if (stats[fix.team1_id] && stats[fix.team2_id]) {
          if (team1Goals > team2Goals) stats[fix.team1_id].points += 3
          else if (team2Goals > team1Goals) stats[fix.team2_id].points += 3
          else {
            stats[fix.team1_id].points++
            stats[fix.team2_id].points++
          }
        }
      }
    })

    Object.values(stats).forEach((s: any) => {
      s.gd = s.gf - s.ga
    })

    setTeamStats(Object.values(stats))

    // 2. Player Stats
    const playerGoalCounts: Record<string, number> = {}
    events.forEach((e) => {
      if (e.event_type === 'goal') {
        playerGoalCounts[e.player_id] = (playerGoalCounts[e.player_id] || 0) + 1
      }
    })

    const playerStatsData = Object.entries(playerGoalCounts)
      .map(([playerId, goals]) => {
        const player = players.find(p => p.id == playerId)
        return {
          id: playerId,
          name: player ? `${player.first_name} ${player.last_name}` : 'Unknown Player',
          team: player ? (teams.find(t => t.id == player.team_id)?.name ?? '-') : '-',
          goals,
        }
      })
      .sort((a, b) => b.goals - a.goals)

    setPlayerStats(playerStatsData)
  }, [teams, fixtures, events, players])

  const handleAddEvent = async (type: string, teamId: string) => {
    if (!activeFixture) return

    setSelectedEventType(type)
    setSelectedTeamId(teamId)
    setSelectingPlayer(true)
  }

  const confirmAddEvent = async () => {
    if (!selectedPlayerId || !activeFixture) return

    const { data, error } = await supabase
      .from("match_events")
      .insert([
        {
          fixture_id: activeFixture.id,
          tournament_id: id,
          team_id: selectedTeamId,
          event_type: selectedEventType,
          player_id: selectedPlayerId,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("insert event error", error)
      setMessage("Error adding event")
    } else {
      setEvents((prev) => [...prev, data])
      setMessage(`${selectedEventType?.replace("_", " ")} added!`)
    }

    // reset modal state
    setSelectingPlayer(false)
    setSelectedPlayerId(null)
    setSelectedTeamId(null)
    setSelectedEventType(null)
  }

  const handleEndMatch = async () => {
    if (!activeFixture) return
    setTimerRunning(false)

    const team1Goals = events.filter(
      (e) =>
        e.fixture_id === activeFixture.id &&
        e.team_id === activeFixture.team1_id &&
        e.event_type === 'goal'
    ).length

    const team2Goals = events.filter(
      (e) =>
        e.fixture_id === activeFixture.id &&
        e.team_id === activeFixture.team2_id &&
        e.event_type === 'goal'
    ).length

    // ======================================================
    // 1️⃣ If penalty shootout is active → decide winner here
    // ======================================================
    if (penaltyShootout.active) {
      if (penaltyShootout.team1Score === penaltyShootout.team2Score) {
        setMessage('Penalty shootout cannot end in a draw!')
        return
      }

      const winner =
        penaltyShootout.team1Score > penaltyShootout.team2Score
          ? activeFixture.team1_id
          : activeFixture.team2_id

      const loser =
        winner === activeFixture.team1_id
          ? activeFixture.team2_id
          : activeFixture.team1_id

      // Complete match
      await supabase
        .from('fixtures')
        .update({
          status: 'completed',
          started_at: null,
          winner_team_id: winner,
          loser_team_id: loser,
        })
        .eq('id', activeFixture.id)

      // Continue to playoff flow
      await handlePlayoffProgression(activeFixture, winner, loser)

      // If this was the final, trigger end tournament flow
      if (activeFixture.round === 'final') {
        setFinalWinnerId(winner)
        // Calculate Golden Boot
        const topScorer = [...playerStats].sort((a, b) => b.goals - a.goals)[0]
        setGoldenBootPlayer(topScorer)
        setEndTournamentModalOpen(true)
      }

      // Reset state
      setMessage(
        `Penalty shootout complete! ${winner === activeFixture.team1_id
          ? activeFixture.team1.name
          : activeFixture.team2.name
        } wins!`
      )
      setPenaltyShootout({ active: false, team1Score: 0, team2Score: 0 })
      setActiveFixture(null)
      setMatchTime(0)
      return
    }

    // ======================================================
    // 2️⃣ Regular time result (No penalties yet)
    // ======================================================

    // Knockout rounds → draw triggers penalty shootout
    const knockoutRounds = ['play_off_1', 'play_off_2', 'play_off_3', 'final', 'semi_1', 'semi_2']

    if (knockoutRounds.includes(activeFixture.round) && team1Goals === team2Goals) {
      setMessage('Match drawn! Starting penalty shootout…')
      setPenaltyShootout({ active: true, team1Score: 0, team2Score: 0 })
      return
    }

    // Normal win
    const winner = team1Goals > team2Goals ? activeFixture.team1_id : activeFixture.team2_id
    const loser = winner === activeFixture.team1_id ? activeFixture.team2_id : activeFixture.team1_id

    await supabase
      .from('fixtures')
      .update({
        status: 'completed',
        started_at: null,
        winner_team_id: winner,
        loser_team_id: loser,
      })
      .eq('id', activeFixture.id)

    // Update local fixtures state to trigger stats recalculation
    setFixtures((prev) =>
      prev.map((f) =>
        f.id === activeFixture.id ? { ...f, status: 'completed' } : f
      )
    )

    // Playoff logic
    await handlePlayoffProgression(activeFixture, winner, loser)

    // If this was the final, trigger end tournament flow
    if (activeFixture.round === 'final') {
      setFinalWinnerId(winner)
      // Calculate Golden Boot
      const topScorer = [...playerStats].sort((a, b) => b.goals - a.goals)[0]
      setGoldenBootPlayer(topScorer)
      setEndTournamentModalOpen(true)
    }

    // Refresh fixtures to show new/updated matches
    const { data: fData } = await supabase
      .from('fixtures')
      .select(`
        id,
        status,
        started_at,
        scheduled_time,
        team1_id,
        round,
        team2_id,
        team1:team1_id(name, color),
        team2:team2_id(name, color)
      `)
      .eq('tournament_id', id)
      .not('team1_id', 'is', null)
      .not('team2_id', 'is', null)
      .order('scheduled_time', { ascending: true })

    if (fData) setFixtures(fData)

    setMessage('Match ended successfully!')
    setActiveFixture(null)
    setMatchTime(0)
  }


  const handlePlayoffProgression = async (fixture: any, winner: number, loser: number) => {
    // PLAYOFF 1 → Winner goes to Final | Loser stored for Playoff 3
    if (fixture.round === 'play_off_1') {
      await supabase.from('fixtures').insert({
        tournament_id: id,
        team1_id: winner,
        team2_id: null,
        round: 'final',
        status: 'scheduled',
        scheduled_time: new Date().toISOString(),
      })

      await supabase.from('tournament_meta').upsert({
        tournament_id: id,
        key: 'play_off_1_loser',
        value: loser,
      })
    }

    // PLAYOFF 2 → Winner plays stored loser from Playoff 1
    if (fixture.round === 'play_off_2') {
      const { data } = await supabase
        .from('tournament_meta')
        .select('value')
        .eq('tournament_id', id)
        .eq('key', 'play_off_1_loser')
        .single()

      if (!data?.value) return

      await supabase.from('fixtures').insert({
        tournament_id: id,
        team1_id: data.value,
        team2_id: winner,
        round: 'play_off_3',
        status: 'scheduled',
        scheduled_time: new Date().toISOString(),
      })
    }

    // PLAYOFF 3 → Winner fills final's empty spot
    if (fixture.round === 'play_off_3') {
      await supabase
        .from('fixtures')
        .update({
          team2_id: winner,
        })
        .eq('tournament_id', id)
        .eq('round', 'final')
        .is('team2_id', null)
    }

    // SEMI FINALS → Winners go to Final
    if (fixture.round === 'semi_1' || fixture.round === 'semi_2') {
      // Check if final exists
      const { data: finalFixture } = await supabase
        .from('fixtures')
        .select('id, team1_id, team2_id')
        .eq('tournament_id', id)
        .eq('round', 'final')
        .single()

      if (finalFixture) {
        // Final exists, fill the empty slot
        const updateField = !finalFixture.team1_id ? 'team1_id' : 'team2_id'
        await supabase
          .from('fixtures')
          .update({ [updateField]: winner })
          .eq('id', finalFixture.id)
      } else {
        // Create final with this winner as team1
        await supabase.from('fixtures').insert({
          tournament_id: id,
          team1_id: winner,
          team2_id: null,
          round: 'final',
          status: 'scheduled',
          scheduled_time: new Date().toISOString(),
        })
      }
    }
  }



  const handleStartNextMatch = async () => {
    const priority: Record<string, number> = {
      'semi_1': 1,
      'semi_2': 1,
      'play_off_1': 1,
      'play_off_2': 2,
      'play_off_3': 3,
      'final': 4,
      'group': 5,
      'league': 6,
      'friendly': 7,
    }

    // Filter only scheduled fixtures
    const scheduled = fixtures
      .filter((f) => f.status === 'scheduled')
      .sort((a, b) => {
        const aRank = priority[a.round] || 999
        const bRank = priority[b.round] || 999
        return aRank - bRank
      })

    const nextFixture = scheduled[0]
    if (!nextFixture) {
      setMessage('All matches have been played!')
      return
    }

    const startedAt = new Date().toISOString()

    await supabase
      .from('fixtures')
      .update({ status: 'live', started_at: startedAt })
      .eq('id', nextFixture.id)

    setActiveFixture({ ...nextFixture, started_at: startedAt })
    setMatchTime(0)
    setTimerRunning(true)
    setMessage('Match started!')
  }

  if (loading) return <Loader mt="4rem" />

  const nextFixture = fixtures.find((f) => f.status === 'scheduled')
  const team1Goals =
    events.filter(
      (e) =>
        e.fixture_id === activeFixture?.id &&
        e.team_id === activeFixture?.team1_id &&
        e.event_type === "goal"
    ).length || 0

  const team2Goals =
    events.filter(
      (e) =>
        e.fixture_id === activeFixture?.id &&
        e.team_id === activeFixture?.team2_id &&
        e.event_type === "goal"
    ).length || 0

  const handleKnockoutOption = async (option: number) => {
    // Sort standings
    const sortedTeams = [...teamStats].sort(
      (a, b) => b.points - a.points || b.gd - a.gd
    )

    let knockoutFixtures: { team1_id: string; team2_id: string; round: string }[] = []

    if (option === 1) {
      knockoutFixtures = [
        { team1_id: sortedTeams[0].team_id, team2_id: sortedTeams[3].team_id, round: 'semi_1' },
        { team1_id: sortedTeams[1].team_id, team2_id: sortedTeams[2].team_id, round: 'semi_2' },
      ]
    } else if (option === 2) {
      knockoutFixtures = [
        { team1_id: sortedTeams[0].team_id, team2_id: sortedTeams[1].team_id, round: 'play_off_1' },
        { team1_id: sortedTeams[2].team_id, team2_id: sortedTeams[3].team_id, round: 'play_off_2' },
      ]
    }

    // Insert initial playoff fixtures
    const { data: newFixtures, error } = await supabase.from('fixtures').insert(
      knockoutFixtures.map((f) => ({
        tournament_id: id,
        team1_id: f.team1_id,
        team2_id: f.team2_id,
        status: 'scheduled',
        round: f.round,
        scheduled_time: new Date().toISOString(),
      }))
    ).select(`
      id,
      status,
      started_at,
      scheduled_time,
      team1_id,
      round,
      team2_id,
      team1:team1_id(name, color),
      team2:team2_id(name, color)
    `)

    if (error) {
      console.error(error)
      setMessage('Error creating knockout fixtures.')
      return;
    } else {
      setMessage('Knockout fixtures created successfully!')
      if (newFixtures) {
        setFixtures((prev) => [...prev, ...newFixtures])
      }
    }

    // --- Logic for Option 2: Winner of play_off_2 vs Loser of play_off_1 for a place in the final ---
    if (option === 2) {
      // Wait for both play_off_1 and play_off_2 to complete, then create next fixtures
      // This logic should be triggered after both matches are completed, not immediately here
      // Example: useEffect or a button to trigger this logic
      // Pseudocode for what to do after both matches are completed:
      // 1. Find play_off_1 and play_off_2 completed fixtures
      // 2. Determine winner/loser of play_off_1, winner of play_off_2
      // 3. Create new fixture: winner of play_off_2 vs loser of play_off_1 ("play_in_final")
      // 4. After that match, winner plays winner of play_off_1 in the final
    }
  }


  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="md">
        Live Tournament Dashboard
      </Title>

      {message && (
        <Notification
          color={message.includes('Error') ? 'red' : 'green'}
          onClose={() => setMessage('')}
        >
          {message}
        </Notification>
      )}
      {activeFixture && (
        <Paper shadow="xl" radius="lg" p="xl" mt="xl" withBorder bg="var(--mantine-color-body)">
          {/* Header */}
          <Group justify="center" mb="lg">
            <Badge 
              size="xl" 
              variant="gradient" 
              gradient={{ from: 'red', to: 'orange' }}
              leftSection={<IconPlayerPlay size={16} />}
            >
              LIVE MATCH
            </Badge>
          </Group>

          {/* Scoreboard */}
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: 'center' }}>
            {/* Team 1 */}
            <Stack align="center" gap="xs">
              <Avatar size="xl" color={activeFixture.team1.color || 'blue'} radius="xl">
                <IconShirt size={40} />
              </Avatar>
              <Title order={2} ta="center">{activeFixture.team1.name}</Title>
              <Text c="dimmed" size="sm">Home</Text>
            </Stack>

            {/* Score & Timer */}
            <Stack align="center" gap={0}>
              <Group gap="xl" align="center">
                <Text size="4rem" fw={900} lh={1} c={activeFixture.team1.color || 'blue'}>
                  {team1Goals}
                </Text>
                <Text size="3rem" fw={300} c="dimmed">-</Text>
                <Text size="4rem" fw={900} lh={1} c={activeFixture.team2.color || 'red'}>
                  {team2Goals}
                </Text>
              </Group>
              
              <Paper withBorder p="xs" radius="md" mt="md" bg="gray.0">
                <Group gap="xs">
                  <IconClock size={20} />
                  <Text fw={700} size="xl" ff="monospace">
                    {formatTime(matchTime)}
                  </Text>
                </Group>
              </Paper>
            </Stack>

            {/* Team 2 */}
            <Stack align="center" gap="xs">
              <Avatar size="xl" color={activeFixture.team2.color || 'red'} radius="xl">
                <IconShirt size={40} />
              </Avatar>
              <Title order={2} ta="center">{activeFixture.team2.name}</Title>
              <Text c="dimmed" size="sm">Away</Text>
            </Stack>
          </SimpleGrid>

          <Divider my="xl" label="Match Events" labelPosition="center" />

          {/* Events Timeline */}
          <Container size="xs">
            <Timeline active={events.length} bulletSize={24} lineWidth={2}>
              {events
                .filter((e) => e.fixture_id === activeFixture.id)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((ev, idx) => {
                  const player = players.find((p) => p.id === ev.player_id)
                  const playerName = player ? `${player.first_name} ${player.last_name}` : 'Unknown Player'
                  const isTeam1 = ev.team_id === activeFixture.team1_id
                  const teamName = isTeam1 ? activeFixture.team1.name : activeFixture.team2.name
                  
                  let icon = <IconBallFootball size={14} />
                  let color = 'blue'
                  let title = 'Goal'

                  if (ev.event_type === 'yellow_card') {
                    icon = <IconRectangleVertical size={14} />
                    color = 'yellow'
                    title = 'Yellow Card'
                  } else if (ev.event_type === 'red_card') {
                    icon = <IconRectangleVertical size={14} />
                    color = 'red'
                    title = 'Red Card'
                  }

                  return (
                    <Timeline.Item 
                      key={idx} 
                      bullet={icon} 
                      color={color} 
                      title={title}
                    >
                      <Text size="sm" fw={500}>{playerName}</Text>
                      <Text size="xs" c="dimmed">{teamName}</Text>
                    </Timeline.Item>
                  )
                })}
            </Timeline>
            {events.filter((e) => e.fixture_id === activeFixture.id).length === 0 && (
              <Text c="dimmed" ta="center" size="sm">No events yet</Text>
            )}
          </Container>

          <Divider my="xl" label="Match Controls" labelPosition="center" />

          {/* Controls Grid */}
          <SimpleGrid cols={2} spacing="xl">
            {/* Team 1 Controls */}
            <Paper withBorder p="md" radius="md">
              <Text fw={700} mb="md" ta="center" c={activeFixture.team1.color || 'blue'}>{activeFixture.team1.name}</Text>
              <Stack>
                <Button 
                  fullWidth 
                  color={activeFixture.team1.color || 'blue'} 
                  leftSection={<IconBallFootball size={18} />}
                  onClick={() => handleAddEvent("goal", activeFixture.team1_id)}
                >
                  Goal
                </Button>
                <Group grow>
                  <Button 
                    variant="light" 
                    color="yellow" 
                    leftSection={<IconRectangleVertical size={18} />}
                    onClick={() => handleAddEvent("yellow_card", activeFixture.team1_id)}
                  >
                    Yellow
                  </Button>
                  <Button 
                    variant="light" 
                    color="red" 
                    leftSection={<IconRectangleVertical size={18} />}
                    onClick={() => handleAddEvent("red_card", activeFixture.team1_id)}
                  >
                    Red
                  </Button>
                </Group>
              </Stack>
            </Paper>

            {/* Team 2 Controls */}
            <Paper withBorder p="md" radius="md">
              <Text fw={700} mb="md" ta="center" c={activeFixture.team2.color || 'red'}>{activeFixture.team2.name}</Text>
              <Stack>
                <Button 
                  fullWidth 
                  color={activeFixture.team2.color || 'red'} 
                  leftSection={<IconBallFootball size={18} />}
                  onClick={() => handleAddEvent("goal", activeFixture.team2_id)}
                >
                  Goal
                </Button>
                <Group grow>
                  <Button 
                    variant="light" 
                    color="yellow" 
                    leftSection={<IconRectangleVertical size={18} />}
                    onClick={() => handleAddEvent("yellow_card", activeFixture.team2_id)}
                  >
                    Yellow
                  </Button>
                  <Button 
                    variant="light" 
                    color="red" 
                    leftSection={<IconRectangleVertical size={18} />}
                    onClick={() => handleAddEvent("red_card", activeFixture.team2_id)}
                  >
                    Red
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Button
            color="gray"
            variant="subtle"
            fullWidth
            mt="xl"
            size="md"
            onClick={handleEndMatch}
          >
            End Match
          </Button>

        </Paper>

      )}
      {penaltyShootout.active && (
        <Paper shadow="xl" radius="lg" p="xl" mt="xl" withBorder bg="var(--mantine-color-body)">
          <Group justify="center" mb="lg">
            <Badge 
              size="xl" 
              variant="gradient" 
              gradient={{ from: 'grape', to: 'violet' }}
              leftSection={<IconBallFootball size={16} />}
            >
              PENALTY SHOOTOUT
            </Badge>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" style={{ alignItems: 'center' }}>
            {/* Team 1 */}
            <Stack align="center" gap="xs">
              <Avatar size="xl" color={activeFixture.team1.color || 'blue'} radius="xl">
                <IconShirt size={40} />
              </Avatar>
              <Title order={2} ta="center">{activeFixture.team1.name}</Title>
              <Button
                color={activeFixture.team1.color || 'blue'}
                variant="light"
                size="md"
                leftSection={<IconBallFootball size={16} />}
                onClick={() =>
                  setPenaltyShootout((prev) => ({ ...prev, team1Score: prev.team1Score + 1 }))
                }
              >
                Goal
              </Button>
            </Stack>

            {/* Score */}
            <Stack align="center" gap={0}>
              <Group gap="xl" align="center">
                <Text size="4rem" fw={900} lh={1} c={activeFixture.team1.color || 'blue'}>
                  {penaltyShootout.team1Score}
                </Text>
                <Text size="3rem" fw={300} c="dimmed">-</Text>
                <Text size="4rem" fw={900} lh={1} c={activeFixture.team2.color || 'red'}>
                  {penaltyShootout.team2Score}
                </Text>
              </Group>
              <Text c="dimmed" size="sm" mt="xs">Penalties</Text>
            </Stack>

            {/* Team 2 */}
            <Stack align="center" gap="xs">
              <Avatar size="xl" color={activeFixture.team2.color || 'red'} radius="xl">
                <IconShirt size={40} />
              </Avatar>
              <Title order={2} ta="center">{activeFixture.team2.name}</Title>
              <Button
                color={activeFixture.team2.color || 'red'}
                variant="light"
                size="md"
                leftSection={<IconBallFootball size={16} />}
                onClick={() =>
                  setPenaltyShootout((prev) => ({ ...prev, team2Score: prev.team2Score + 1 }))
                }
              >
                Goal
              </Button>
            </Stack>
          </SimpleGrid>

          <Divider my="xl" />

          <Button
            color="green"
            fullWidth
            size="md"
            onClick={async () => {
              const winnerTeamId =
                penaltyShootout.team1Score > penaltyShootout.team2Score
                  ? activeFixture.team1_id
                  : activeFixture.team2_id

              const loserTeamId =
                winnerTeamId === activeFixture.team1_id
                  ? activeFixture.team2_id
                  : activeFixture.team1_id

              // 1. Update fixture result
              await supabase
                .from('fixtures')
                .update({
                  status: 'completed',
                  started_at: null,
                  winner_team_id: winnerTeamId,
                  loser_team_id: loserTeamId,
                })
                .eq('id', activeFixture.id)

              // Update local fixtures state to trigger stats recalculation
              setFixtures((prev) =>
                prev.map((f) =>
                  f.id === activeFixture.id ? { ...f, status: 'completed' } : f
                )
              )

              // 2. Process playoff progression
              await handlePlayoffProgression(activeFixture, winnerTeamId, loserTeamId)

              // 3. UI reset
              setMessage(
                `Penalty shootout complete! ${winnerTeamId === activeFixture.team1_id
                  ? activeFixture.team1.name
                  : activeFixture.team2.name
                } wins!`
              )

              setPenaltyShootout({ active: false, team1Score: 0, team2Score: 0 })
              setActiveFixture(null)
            }}
          >
            End Penalty Shootout
          </Button>

        </Paper>
      )}


      {/* Tournament Table */}
      <Title order={3} mt={40} mb="md">Tournament Status</Title>
      
      <Paper withBorder radius="md" p="md">
        <Tabs value={view} onChange={(v) => setView(v as 'table' | 'stats')}>
          <Tabs.List mb="md">
            <Tabs.Tab value="table" leftSection={<IconTrophy size={16} />}>
              Standings
            </Tabs.Tab>
            <Tabs.Tab value="stats" leftSection={<IconBallFootball size={16} />}>
              Top Scorers
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="table">
            <ScrollArea>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead bg="gray.1">
                  <Table.Tr>
                    <Table.Th>Team</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>P</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>GF</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>GA</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>GD</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Pts</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {teamStats
                    .sort((a, b) => b.points - a.points || b.gd - a.gd)
                    .map((team) => (
                      <Table.Tr key={team.team_id}>
                        <Table.Td fw={500}>{team.name}</Table.Td>
                        <Table.Td align="center">{team.played}</Table.Td>
                        <Table.Td align="center">{team.gf}</Table.Td>
                        <Table.Td align="center">{team.ga}</Table.Td>
                        <Table.Td align="center">{team.gd}</Table.Td>
                        <Table.Td align="center" fw={700}>{team.points}</Table.Td>
                      </Table.Tr>
                    ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="stats">
            <ScrollArea>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead bg="gray.1">
                  <Table.Tr>
                    <Table.Th>Player</Table.Th>
                    <Table.Th>Team</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Goals</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {playerStats.map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td fw={500}>{p.name}</Table.Td>
                      <Table.Td c="dimmed">{p.team}</Table.Td>
                      <Table.Td align="center" fw={700}>{p.goals}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Divider my="xl" />

      {/* Upcoming Fixtures */}
      <Title order={3} mb="md">
        Upcoming Fixtures
      </Title>
      
      {fixtures.filter((f) => f.status === 'scheduled').length === 0 ? (
        <Text c="dimmed" fs="italic">No upcoming fixtures scheduled.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {fixtures
            .filter((f) => f.status === 'scheduled')
            .map((f) => (
              <Paper key={f.id} withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Badge variant="light" color="gray">{f.round?.replace('_', ' ').toUpperCase() || 'MATCH'}</Badge>
                  <Group gap={4} c="dimmed">
                    <IconCalendarEvent size={14} />
                    <Text size="xs">
                      {new Date(f.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Group>
                </Group>
                <Group justify="space-between" align="center">
                  <Text fw={600} size="lg">{f.team1.name}</Text>
                  <Text c="dimmed" size="sm">vs</Text>
                  <Text fw={600} size="lg">{f.team2.name}</Text>
                </Group>
              </Paper>
            ))}
        </SimpleGrid>
      )}

      {nextFixture && (
        <Button color="green" size="lg" mt="lg" onClick={handleStartNextMatch}>
          Start Next Match
        </Button>
      )}

      {/* Knockout Stage Selection */}
      {fixtures.every(f => f.status === 'completed') && (
        <Card mt="xl" p="lg" withBorder>
          <Title order={4} mb="sm">Knockout Stage Setup</Title>
          
          {tournament?.knockout_type === 'direct_semis' ? (
            <>
              <Text mb="md">Tournament is set to <strong>Direct Semis</strong> (1st vs 4th, 2nd vs 3rd).</Text>
              <Button
                color="blue"
                onClick={() => handleKnockoutOption(1)}
              >
                Generate Semi-Final Fixtures
              </Button>
            </>
          ) : (
            <>
              <Text>Select the knockout format:</Text>
              <Group mt="md">
                <Button
                  color="blue"
                  onClick={() => handleKnockoutOption(1)}
                >
                  Option 1: 1st vs 4th & 2nd vs 3rd → Final
                </Button>

                <Button
                  color="violet"
                  onClick={() => handleKnockoutOption(2)}
                >
                  Option 2: 1st vs 2nd → Final, Loser vs Winner of 3rd vs 4th
                </Button>
              </Group>
            </>
          )}
        </Card>
      )}

      <Modal
        opened={selectingPlayer}
        onClose={() => setSelectingPlayer(false)}
        title={
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light">
              <IconUser size={16} />
            </ThemeIcon>
            <Text fw={700}>Select Player</Text>
            <Badge variant="dot" color={selectedEventType === 'goal' ? 'green' : selectedEventType === 'yellow_card' ? 'yellow' : 'red'}>
              {selectedEventType?.replace('_', ' ').toUpperCase()}
            </Badge>
          </Group>
        }
        centered
        radius="md"
        padding="lg"
      >
        <Stack>
          <Select
            label="Choose Player"
            placeholder="Search for a player..."
            searchable
            nothingFoundMessage="No players found"
            data={players
              .filter((p) => p.team_id === selectedTeamId)
              .map((p) => ({
                value: String(p.id),
                label: `${p.first_name} ${p.last_name}`,
              }))}
            value={selectedPlayerId ? String(selectedPlayerId) : ''}
            onChange={setSelectedPlayerId}
            leftSection={<IconUser size={16} />}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setSelectingPlayer(false)}>Cancel</Button>
            <Button onClick={confirmAddEvent} disabled={!selectedPlayerId}>
              Confirm Event
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={endTournamentModalOpen}
        onClose={() => setEndTournamentModalOpen(false)}
        title={<Title order={3}>🏆 Tournament Complete!</Title>}
        centered
        size="lg"
        padding="xl"
      >
        <Stack gap="lg">
          <Text c="dimmed">
            The final match has ended. Please select the award winners to complete the tournament.
          </Text>

          <Paper withBorder p="md" radius="md" bg="gray.0">
            <Group>
              <ThemeIcon size="lg" color="yellow" variant="light">
                <IconBallFootball />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text fw={700}>Golden Boot (Top Scorer)</Text>
                {goldenBootPlayer ? (
                  <Text size="sm">{goldenBootPlayer.name} ({goldenBootPlayer.goals} goals)</Text>
                ) : (
                  <Text size="sm" c="dimmed">No goals recorded</Text>
                )}
              </div>
            </Group>
          </Paper>

          <Select
            label="Most Valuable Player (MVP)"
            placeholder="Select MVP"
            searchable
            data={players.map(p => ({ value: String(p.id), label: `${p.first_name} ${p.last_name}` }))}
            value={mvpPlayerId}
            onChange={setMvpPlayerId}
            leftSection={<IconTrophy size={16} />}
          />

          <Select
            label="Golden Glove (Best Goalkeeper)"
            placeholder="Select Golden Glove Winner"
            searchable
            data={players.map(p => ({ value: String(p.id), label: `${p.first_name} ${p.last_name}` }))}
            value={goldenGlovePlayerId}
            onChange={setGoldenGlovePlayerId}
            leftSection={<IconShirt size={16} />}
          />

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => setEndTournamentModalOpen(false)}>Cancel</Button>
            <Button 
              color="green" 
              onClick={async () => {
                if (!mvpPlayerId || !goldenGlovePlayerId) {
                  setMessage('Please select all award winners')
                  return
                }

                await supabase.from('tournaments').update({ 
                  status: 'completed',
                  winner_team_id: finalWinnerId
                }).eq('id', id)
                
                // Save awards
                const awards = [
                  { key: 'mvp_player_id', value: mvpPlayerId },
                  { key: 'golden_glove_player_id', value: goldenGlovePlayerId },
                  { key: 'golden_boot_player_id', value: goldenBootPlayer?.id }
                ]

                for (const award of awards) {
                  if (award.value) {
                    await supabase.from('tournament_meta').upsert({
                      tournament_id: id,
                      key: award.key,
                      value: award.value
                    })
                  }
                }

                setMessage('Tournament completed successfully!')
                setEndTournamentModalOpen(false)
                router.push('/tournaments')
              }}
            >
              Confirm & End Tournament
            </Button>
          </Group>
        </Stack>
      </Modal>

    </Container>
  )
}
