"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  Container,
  Title,
  Text,
  Loader,
  Card,
  Group,
  Stack,
  Table,
  Divider,
  Button,
  Grid,
  Badge,
  Accordion,
  Avatar,
  ThemeIcon,
  Paper,
} from "@mantine/core"
import Fireworks from "@/components/Fireworks"
import classes from "../tournament.module.css"

type TeamStats = {
  team_id: string
  team_name: string
  played: number
  won: number
  lost: number
  drawn: number
  points: number
  goalsFor: number
  goalsAgainst: number
}

export default function TournamentViewPage() {
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<any>(null)
  const [champion, setChampion] = useState<any>(null)
  const [table, setTable] = useState<TeamStats[]>([])
  const [topScorers, setTopScorers] = useState<any[]>([])
  const [showFireworks, setShowFireworks] = useState(false)
  const [fixturesList, setFixturesList] = useState<any[]>([])
  const [squads, setSquads] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      /* =========================
         TOURNAMENT
      ========================== */
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select(`
          *,
          winner:winner_team_id(
            name,
            captain:captain_id(first_name, last_name)
          )
        `)
        .eq("id", id)
        .single()

      /* =========================
         FIXTURES (ALL)
      ========================== */
      const { data: allFixtures } = await supabase
        .from("fixtures")
        .select(`
          id,
          team1_id,
          team2_id,
          team1_score,
          team2_score,
          winner_team_id,
          status,
          scheduled_time,
          round,
          team1:team1_id(name),
          team2:team2_id(name)
        `)
        .eq("tournament_id", id)
        .order('scheduled_time', { ascending: true })

      /* =========================
         MATCH EVENTS (Goals, Cards, etc.)
      ========================== */
      const { data: allEvents } = await supabase
        .from("match_events")
        .select(`
          id,
          fixture_id,
          event_type,
          minute,
          team_id,
          player_id,
          player:player_id(first_name, last_name)
        `)
        .eq("tournament_id", id)

      setEvents(allEvents || [])

      // Calculate scores from events
      if (allFixtures && allEvents) {
        allFixtures.forEach(f => {
          const fixtureGoals = allEvents.filter(e => e.fixture_id === f.id && e.event_type === 'goal')
          if (fixtureGoals.length > 0) {
            f.team1_score = fixtureGoals.filter(e => e.team_id === f.team1_id).length
            f.team2_score = fixtureGoals.filter(e => e.team_id === f.team2_id).length
          }
        })
      }

      setFixturesList(allFixtures || [])

      /* =========================
         SQUADS
      ========================== */
      const { data: teamsData } = await supabase.from('teams').select('*').eq('tournament_id', id)
      const { data: playersData } = await supabase
        .from('auction_players')
        .select('team_id, player:player_id(id, first_name, last_name)')
        .eq('tournament_id', id)

      const squadsData = teamsData?.map(team => ({
        ...team,
        players: playersData?.filter((p: any) => p.team_id === team.id).map((p: any) => ({
          ...p.player,
          isCaptain: p.player.id === team.captain_id
        })) || []
      })) || []
      
      setSquads(squadsData)

      /* =========================
         BUILD LEAGUE TABLE
      ========================== */
      const stats: Record<string, TeamStats> = {}
      // Exclude knockout rounds (Finals, Semi-Finals, Playoffs) from the league table
      const completedFixtures = allFixtures?.filter(f => 
        f.status === 'completed' && 
        !['final', 'Semi-Final', 'Quarter-Final', 'Playoff', '3rd Place', 'play_off_1', 'play_off_2', 'play_off_3'].some(r => f.round?.includes(r))
      ) || []

      completedFixtures.forEach((f) => {
        const t1 = f.team1_id
        const t2 = f.team2_id

        if (!stats[t1]) {
          stats[t1] = {
            team_id: t1,
            team_name: f.team1?.name || 'Unknown',
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            points: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          }
        }

        if (!stats[t2]) {
          stats[t2] = {
            team_id: t2,
            team_name: f.team2?.name || 'Unknown',
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            points: 0,
            goalsFor: 0,
            goalsAgainst: 0,
          }
        }

        stats[t1].played++
        stats[t2].played++

        stats[t1].goalsFor += f.team1_score
        stats[t1].goalsAgainst += f.team2_score
        stats[t2].goalsFor += f.team2_score
        stats[t2].goalsAgainst += f.team1_score

        if (f.team1_score > f.team2_score) {
          stats[t1].won++
          stats[t1].points += 3
          stats[t2].lost++
        } else if (f.team2_score > f.team1_score) {
          stats[t2].won++
          stats[t2].points += 3
          stats[t1].lost++
        } else {
          stats[t1].drawn++
          stats[t2].drawn++
          stats[t1].points++
          stats[t2].points++
        }
      })

      const sortedTable = Object.values(stats).sort(
        (a, b) =>
          b.points - a.points ||
          b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst)
      )

      /* =========================
         TOP SCORERS
      ========================== */
      const scorerMap: Record<string, any> = {}

      allEvents?.filter(e => e.event_type === 'goal').forEach((g) => {
        if (!scorerMap[g.player_id]) {
          scorerMap[g.player_id] = {
            player_id: g.player_id,
            name: `${g.player.first_name} ${g.player.last_name || ""}`,
            goals: 0,
          }
        }
        scorerMap[g.player_id].goals++
      })

      const topScorersSorted = Object.values(scorerMap)
        .sort((a: any, b: any) => b.goals - a.goals)
        .slice(0, 5)

      let winner = tournamentData?.winner

      // Fallback: If no winner in tournament record, check if final is completed
      if (!winner && allFixtures) {
        const finalFixture = allFixtures.find(f => f.round === 'final' && f.status === 'completed')
        if (finalFixture?.winner_team_id) {
          const winnerId = finalFixture.winner_team_id
          const winnerTeam = teamsData?.find(t => t.id === winnerId)
          
          if (winnerTeam) {
            const captainPlayer = playersData?.find((p: any) => p.player.id === winnerTeam.captain_id)?.player
            winner = {
              name: winnerTeam.name,
              captain: captainPlayer
            }
          }
        }
      }

      setTournament(tournamentData)
      setChampion(winner)
      if (winner) {
        setShowFireworks(true)
      }
      setTable(sortedTable)
      setTopScorers(topScorersSorted)
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) return <Loader />

  if (!tournament) return <Text>Tournament not found</Text>

  return (
    <Container size="lg" py="xl">
      {showFireworks && <Fireworks duration={5000} onComplete={() => setShowFireworks(false)} />}

      {/* 🏆 CHAMPION */}
      <Card
        radius="lg"
        p="xl"
        mb="xl"
        withBorder
        shadow="xl"
        className="text-center bg-gradient-to-br from-[#FFD700] to-[#FFECB3] border-2 border-[#DAA520] scale-[1.02] transition-transform duration-300 hover:scale-[1.05]"
      >
        <Text size="sm" fw={700} c="dimmed" tt="uppercase" ls={2}>
          🏆 Tournament Champions
        </Text>

        <Title order={1} mt="md" size={48} fw={900} c="dark">
          {champion?.name || "TBD"}
        </Title>

        {champion?.captain && (
          <Text size="lg" fw={600} c="dimmed" mt="xs">
            Captain: {champion.captain.first_name} {champion.captain.last_name}
          </Text>
        )}

        <Text mt="md" size="xl" fw={500}>
          Congratulations on an amazing victory! 🎉
        </Text>

        <Button
          variant="white"
          color="yellow"
          size="md"
          radius="md"
          mt="lg"
          onClick={() => setShowFireworks(true)}
          className="hover:scale-105 transition-transform duration-200 shadow-md text-yellow-600 font-bold"
        >
          Celebrate Again 🎆
        </Button>
      </Card>

      {/* 📍 TOURNAMENT INFO */}
      <Card withBorder mb="xl">
        <Group justify="space-between">
          <Title order={3}>{tournament.name}</Title>
          <Text c="green" fw={600}>
            Completed
          </Text>
        </Group>

        <Text mt="sm">
          {new Date(tournament.start_date).toLocaleDateString()} –{" "}
          {new Date(tournament.end_date).toLocaleDateString()}
        </Text>
      </Card>

      {/* 📊 TABLE */}
      <Card withBorder mb="xl" radius="md" shadow="sm">
        <Title order={4} mb="md" px="xs">
          League Table
        </Title>

        <div className={classes.tableContainer}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                <th style={{ paddingLeft: '20px' }}>Team</th>
                <th style={{ textAlign: 'center' }}>P</th>
                <th style={{ textAlign: 'center' }}>W</th>
                <th style={{ textAlign: 'center' }}>D</th>
                <th style={{ textAlign: 'center' }}>L</th>
                <th style={{ textAlign: 'center' }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, index) => (
                <tr key={row.team_id} className={index === 0 && tournament.status === 'completed' ? classes.championRow : ''}>
                  <td style={{ paddingLeft: '20px' }}>
                    <Group gap="xs">
                      <Text fw={500}>{index + 1}.</Text>
                      <Text fw={600}>{row.team_name}</Text>
                      {index === 0 && tournament.status === 'completed' && <span>🏆</span>}
                    </Group>
                  </td>
                  <td style={{ textAlign: 'center' }}>{row.played}</td>
                  <td style={{ textAlign: 'center' }}>{row.won}</td>
                  <td style={{ textAlign: 'center' }}>{row.drawn}</td>
                  <td style={{ textAlign: 'center' }}>{row.lost}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Badge size="lg" variant="light" color={index === 0 ? 'yellow' : 'blue'}>
                      {row.points}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* 📅 FIXTURES */}
      <Card withBorder mb="xl" radius="md" shadow="sm">
        <Title order={4} mb="md">
          Fixtures
        </Title>
        <Accordion variant="separated" radius="md" classNames={{ item: classes.fixtureItem }}>
          {fixturesList.map((f) => {
            const fixtureEvents = events.filter(e => e.fixture_id === f.id).sort((a, b) => a.minute - b.minute);
            return (
              <Accordion.Item key={f.id} value={f.id}>
                <Accordion.Control>
                  <Grid align="center" gutter="xs">
                    {/* Team 1 */}
                    <Grid.Col span={4}>
                      <Text fw={600} ta="right" size="sm" lineClamp={1}>
                        {f.team1?.name || 'TBD'}
                      </Text>
                    </Grid.Col>

                    {/* Score / Time */}
                    <Grid.Col span={4}>
                      <Group justify="center" gap={4}>
                        {f.status === 'completed' ? (
                          <div className={classes.scoreBadge}>
                            {f.team1_score} - {f.team2_score}
                          </div>
                        ) : (
                          <Badge color="blue" variant="light" size="lg">
                            {new Date(f.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" ta="center" mt={4}>
                        {f.round}
                      </Text>
                    </Grid.Col>

                    {/* Team 2 */}
                    <Grid.Col span={4}>
                      <Text fw={600} ta="left" size="sm" lineClamp={1}>
                        {f.team2?.name || 'TBD'}
                      </Text>
                    </Grid.Col>
                  </Grid>
                </Accordion.Control>
                <Accordion.Panel>
                  <Divider mb="sm" label="Match Events" labelPosition="center" />
                  {fixtureEvents.length > 0 ? (
                    <Stack gap="sm" className={classes.eventTimeline}>
                      {fixtureEvents.map((e) => (
                        <Group key={e.id} gap="sm" wrap="nowrap">
                          <Text size="xs" fw={700} w={25} ta="right" c="dimmed">
                            {e.minute}'
                          </Text>
                          <ThemeIcon 
                            size="sm" 
                            radius="xl" 
                            color={e.event_type === 'goal' ? 'green' : e.event_type === 'yellow_card' ? 'yellow' : 'red'}
                            variant="light"
                          >
                            {e.event_type === 'goal' ? '⚽' : e.event_type === 'yellow_card' ? '🟨' : '🟥'}
                          </ThemeIcon>
                          <Text size="sm">
                            <Text span fw={600}>{e.player?.first_name} {e.player?.last_name}</Text>
                            <Text span c="dimmed" size="xs"> ({f.team1_id === e.team_id ? f.team1?.name : f.team2?.name})</Text>
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  ) : (
                    <Text c="dimmed" size="sm" ta="center" py="sm">No events recorded</Text>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      </Card>

      {/* 👥 SQUADS */}
      <Title order={4} mb="md" mt="xl">Squads</Title>
      <Grid mb="xl">
        {squads.map((team) => (
          <Grid.Col key={team.id} span={{ base: 12, md: 6, lg: 4 }}>
            <Card withBorder padding="lg" radius="md" className={classes.squadCard}>
              <Group mb="md">
                <Avatar color="blue" radius="xl">{team.name.substring(0, 2).toUpperCase()}</Avatar>
                <Title order={5} c="dark">{team.name}</Title>
              </Group>
              <Divider mb="sm" />
              <Stack gap={0}>
                {team.players.length > 0 ? (
                  team.players.map((p: any, i: number) => (
                    <Group key={i} gap="sm" className={classes.playerRow}>
                      <Avatar size="sm" radius="xl" color="gray" variant="light">
                        {p.first_name[0]}{p.last_name ? p.last_name[0] : ''}
                      </Avatar>
                      <Text size="sm">
                        {p.first_name} {p.last_name}
                        {p.isCaptain && <Badge size="xs" ml="xs" color="yellow" variant="light">C</Badge>}
                      </Text>
                    </Group>
                  ))
                ) : (
                  <Text size="sm" c="dimmed" fs="italic" py="sm">No players assigned</Text>
                )}
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {/* ⚽ TOP SCORERS */}
      <Card withBorder radius="md" shadow="sm">
        <Title order={4} mb="md">
          Top Scorers
        </Title>

        {topScorers.length === 0 ? (
          <Text c="dimmed" py="md" ta="center">No goals scored yet</Text>
        ) : (
          <Stack gap="sm">
            {topScorers.map((p, i) => (
              <Paper key={p.player_id} p="xs" withBorder radius="sm" bg={i < 3 ? 'gray.0' : 'transparent'}>
                <Group justify="space-between">
                  <Group gap="sm">
                    <Badge 
                      circle 
                      size="lg" 
                      color={i === 0 ? 'yellow' : i === 1 ? 'gray' : i === 2 ? 'orange' : 'blue'}
                      variant={i < 3 ? 'filled' : 'light'}
                    >
                      {i + 1}
                    </Badge>
                    <Text fw={500}>{p.name}</Text>
                  </Group>
                  <Group gap={4}>
                    <Text fw={700} size="lg">{p.goals}</Text>
                    <Text size="sm" c="dimmed">goals</Text>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Card>

    </Container>
  )
}
