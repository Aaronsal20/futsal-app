'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Container,
  Title,
  Stack,
  NumberInput,
  Button,
  Group,
  TextInput,
  Select,
  Loader,
  Notification,
  Card,
  Divider,
  Text,
  Badge,
  Paper,
  ScrollArea,
  ColorSwatch,
  SimpleGrid,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  rem,
  Box
} from '@mantine/core'
import { 
  IconShirt, 
  IconClock, 
  IconCalendar, 
  IconSettings, 
  IconRefresh, 
  IconDeviceFloppy,
  IconTrophy
} from '@tabler/icons-react'

const TEAM_COLORS: Record<string, string> = {
  'Red': '#fa5252',
  'Blue': '#228be6',
  'Green': '#40c057',
  'Yellow': '#fcc419',
  'White': '#ffffff',
  'Black': '#25262b',
  'Orange': '#fd7e14',
  'Purple': '#be4bdb',
  'Cyan': '#15aabf',
  'Pink': '#e64980',
  'Gray': '#868e96',
  'Teal': '#12b886',
  'Indigo': '#4c6ef5',
  'Lime': '#82c91e'
}

function getTextColor(colorName: string) {
  const hex = TEAM_COLORS[colorName] || '#ffffff';
  // Simple brightness check
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
}


export default function TournamentFixturesSetup() {
  const { id } = useParams() as { id: string }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [teams, setTeams] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])

  const [startTime, setStartTime] = useState('')
  const [matchMinutes, setMatchMinutes] = useState(40)
  const [gapMinutes, setGapMinutes] = useState(10)

  // Fetch teams with captain details
  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Tournament Details (for start_date & auction_id)
      const { data: tData, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()

      if (tError) {
        console.error("Error fetching tournament:", tError)
        setLoading(false)
        return
      }

      if (tData?.start_date) {
        setStartTime(tData.start_date)
      }

      // 2. Fetch Teams (try tournament_id first, then auction_id)
      let query = supabase
        .from('teams')
        .select(`
          id,
          name,
          captain_id,
          player:captain_id (
            first_name,
            last_name
          )
        `)
        .order('name', { ascending: true })

      // If teams are linked to tournament directly
      const { data: tTeams } = await query.eq('tournament_id', id)
      
      let finalTeams = tTeams || []

      // If no teams found, try via auction_id
      if (finalTeams.length === 0 && tData.auction_id) {
        const { data: aTeams } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            captain_id,
            player:captain_id (
              first_name,
              last_name
            )
          `)
          .eq('auction_id', tData.auction_id)
          .order('name', { ascending: true })
        
        if (aTeams) finalTeams = aTeams
      }

      const mapped = finalTeams.map((team: any, index: number) => ({
        id: team.id,
        name: team.name,
        captain_name: team.player
          ? `${team.player.first_name} ${team.player.last_name}`.trim()
          : 'N/A',
        color: Object.keys(TEAM_COLORS)[index % Object.keys(TEAM_COLORS).length],
      }))

      setTeams(mapped)
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleColorChange = (teamId: string, color: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, color } : t))
    )
  }

  const handleRegenerateFixtures = () => {
    setFixtures([])
    setMessage('')
    handleGenerateFixtures()
  }

  const handleGenerateFixtures = () => {
    setMessage('')

    if (teams.length < 2) {
      setMessage('Need at least 2 teams to generate fixtures.')
      return
    }
    if (!startTime) {
      setMessage('Tournament start time is missing. Please set it in tournament settings.')
      return
    }

    // confirm if already generated
    if (fixtures.length > 0 && !confirm('This will replace current fixtures. Continue?')) {
      return
    }

    // 1. Generate all possible matchups
    const allMatches = []
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        allMatches.push({
          team1: teams[i],
          team2: teams[j]
        })
      }
    }

    // 2. Greedy scheduling to avoid back-to-back games
    const scheduledMatches = []
    let remainingMatches = [...allMatches]
    
    // Track when teams last played (match index)
    const lastPlayedIndex: Record<string, number> = {}
    teams.forEach(t => lastPlayedIndex[t.id] = -999)

    let currentMatchIndex = 0

    while (remainingMatches.length > 0) {
      // Find matches where neither team played in the previous match
      let candidates = remainingMatches.filter(m => 
        lastPlayedIndex[m.team1.id] !== currentMatchIndex - 1 &&
        lastPlayedIndex[m.team2.id] !== currentMatchIndex - 1
      )

      // If stuck (all remaining matches involve teams that just played), relax the constraint
      if (candidates.length === 0) {
        candidates = remainingMatches
      }

      // Sort by "rest time" (maximize sum of matches since last played)
      // This helps distribute games evenly
      candidates.sort((a, b) => {
        const restA = (currentMatchIndex - lastPlayedIndex[a.team1.id]) + (currentMatchIndex - lastPlayedIndex[a.team2.id])
        const restB = (currentMatchIndex - lastPlayedIndex[b.team1.id]) + (currentMatchIndex - lastPlayedIndex[b.team2.id])
        return restB - restA
      })

      const selectedMatch = candidates[0]
      
      scheduledMatches.push(selectedMatch)
      
      lastPlayedIndex[selectedMatch.team1.id] = currentMatchIndex
      lastPlayedIndex[selectedMatch.team2.id] = currentMatchIndex
      
      remainingMatches = remainingMatches.filter(m => m !== selectedMatch)
      currentMatchIndex++
    }

    // 3. Assign times
    const baseTime = new Date(startTime)
    let currentTime = new Date(baseTime)
    const newFixtures = []

    for (const match of scheduledMatches) {
      newFixtures.push({
        team1_name: match.team1.name,
        team2_name: match.team2.name,
        team1_color: match.team1.color,
        team2_color: match.team2.color,
        scheduled_time: currentTime.toISOString(),
        match_minutes: matchMinutes,
        team1_id: match.team1.id,
        team2_id: match.team2.id,
      })

      currentTime = new Date(
        currentTime.getTime() + (matchMinutes + gapMinutes) * 60000
      )
    }

    setFixtures(newFixtures)
    setMessage(`Generated ${newFixtures.length} fixtures (Optimized for rest)`)
  }

  const handleSaveFixtures = async () => {
    if (!fixtures.length) {
      setMessage('No fixtures to save.')
      return
    }

    setSaving(true)
    await supabase
      .from('tournaments')
      .update({ status: 'scheduled' })
      .eq('id', id)

    const formattedFixtures = fixtures.map((f) => ({
      tournament_id: id,
      team1_id: f.team1_id,
      team2_id: f.team2_id,
      team1_color: f.team1_color,
      team2_color: f.team2_color,
      scheduled_time: f.scheduled_time,
      status: 'scheduled',
    }))

    const { error } = await supabase.from('fixtures').insert(formattedFixtures)
    setSaving(false)

    if (error) {
      console.error(error)
      setMessage('Error saving fixtures.')
    } else {
      await supabase
        .from('tournaments')
        .update({ status: 'setup' })
        .eq('id', id)

      setMessage(`Saved ${formattedFixtures.length} fixtures successfully!`)
    }
  }

  if (loading) return <Loader size="lg" style={{ marginTop: '4rem' }} />

return (
    <Container size="lg" py="xl">
      <Paper withBorder shadow="md" p="xl" radius="lg">
        <Group justify="center" mb="xl">
          <ThemeIcon size={40} radius="md" variant="light" color="blue">
            <IconSettings size={24} />
          </ThemeIcon>
          <Title order={2} c="blue.9">
            Tournament Fixture Setup
          </Title>
        </Group>

        {message && (
          <Notification
            color={message.includes('Error') ? 'red' : 'green'}
            onClose={() => setMessage('')}
            mt="sm"
            mb="lg"
          >
            {message}
          </Notification>
        )}

        <Stack gap="xl">
          {!fixtures.length && (
            <>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* Configuration Section */}
                <Card withBorder shadow="sm" radius="md" p="lg">
                  <Group mb="md">
                    <IconClock size={20} color="gray" />
                    <Title order={4}>Match Configuration</Title>
                  </Group>

                  <Stack gap="md">
                    <Paper withBorder p="sm" radius="md" bg="gray.0">
                      <Group justify="space-between">
                        <Group gap="xs">
                          <IconCalendar size={16} color="gray" />
                          <Text fw={500} size="sm">Start Time</Text>
                        </Group>
                        <Text fw={700} size="sm">
                          {startTime ? new Date(startTime).toLocaleString() : 'Not set'}
                        </Text>
                      </Group>
                    </Paper>

                    <SimpleGrid cols={2}>
                      <NumberInput
                        label="Match Duration"
                        description="In minutes"
                        value={matchMinutes}
                        onChange={(val) => setMatchMinutes(Number(val) || 0)}
                        min={10}
                        max={120}
                        suffix=" min"
                      />
                      <NumberInput
                        label="Gap Duration"
                        description="Between matches"
                        value={gapMinutes}
                        onChange={(val) => setGapMinutes(Number(val) || 0)}
                        min={5}
                        max={60}
                        suffix=" min"
                      />
                    </SimpleGrid>
                  </Stack>
                </Card>

                {/* Teams Section */}
                <Card withBorder shadow="sm" radius="md" p="lg">
                  <Group mb="md" justify="space-between">
                    <Group>
                      <IconShirt size={20} color="gray" />
                      <Title order={4}>Team Colors</Title>
                    </Group>
                    <Badge variant="light">{teams.length} Teams</Badge>
                  </Group>

                  <ScrollArea h={300} offsetScrollbars>
                    <Stack gap="xs">
                      {teams.map((team) => (
                        <Paper key={team.id} withBorder p="xs" radius="md">
                          <Group justify="space-between">
                            <Group gap="sm">
                              <ColorSwatch color={TEAM_COLORS[team.color] || '#fff'} size={24} />
                              <div>
                                <Text fw={600} size="sm">{team.name}</Text>
                                <Text size="xs" c="dimmed">
                                  C: {team.captain_name || '—'}
                                </Text>
                              </div>
                            </Group>
                            <Select
                              size="xs"
                              w={130}
                              data={Object.keys(TEAM_COLORS)}
                              value={team.color}
                              onChange={(value) => value && handleColorChange(team.id, value)}
                              leftSection={
                                <ColorSwatch color={TEAM_COLORS[team.color] || '#fff'} size={12} />
                              }
                              renderOption={({ option }) => (
                                <Group gap="xs">
                                  <ColorSwatch color={TEAM_COLORS[option.value] || '#fff'} size={12} />
                                  <Text size="xs">{option.value}</Text>
                                </Group>
                              )}
                            />
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Card>
              </SimpleGrid>

              <Group mt="xl" justify="center">
                <Button 
                  color="blue" 
                  size="lg" 
                  leftSection={<IconSettings size={20} />}
                  onClick={handleGenerateFixtures}
                >
                  Generate Fixtures
                </Button>
              </Group>
            </>
          )}

          {fixtures.length > 0 && (
            <>
              <Divider my="sm" label="Fixture Preview" labelPosition="center" />

              <ScrollArea h={500} type="auto">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {fixtures.map((f, idx) => (
                    <Paper key={idx} withBorder shadow="xs" radius="md" p="md">
                      <Group justify="space-between" mb="xs">
                        <Badge variant="light" color="gray" size="sm">
                          Match {idx + 1}
                        </Badge>
                        <Group gap={4}>
                          <IconClock size={14} color="gray" />
                          <Text size="xs" c="dimmed">
                            {new Date(f.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </Group>
                      </Group>
                      
                      <Group justify="space-between" align="center">
                        <Stack gap={2} align="center" style={{ flex: 1 }}>
                          <ColorSwatch color={TEAM_COLORS[f.team1_color] || '#fff'} size={16} />
                          <Text fw={600} size="sm" ta="center">{f.team1_name}</Text>
                        </Stack>
                        
                        <Text c="dimmed" size="sm" fw={700}>VS</Text>
                        
                        <Stack gap={2} align="center" style={{ flex: 1 }}>
                          <ColorSwatch color={TEAM_COLORS[f.team2_color] || '#fff'} size={16} />
                          <Text fw={600} size="sm" ta="center">{f.team2_name}</Text>
                        </Stack>
                      </Group>
                      
                      <Text size="xs" c="dimmed" ta="center" mt="xs">
                        {new Date(f.scheduled_time).toLocaleDateString()}
                      </Text>
                    </Paper>
                  ))}
                </SimpleGrid>
              </ScrollArea>

              <Group mt="lg" justify="center">
                <Button 
                  color="green" 
                  size="md"
                  leftSection={<IconDeviceFloppy size={20} />}
                  onClick={handleSaveFixtures} 
                  loading={saving}
                >
                  Save Fixtures
                </Button>
                <Button 
                  color="red" 
                  variant="light" 
                  size="md"
                  leftSection={<IconRefresh size={20} />}
                  onClick={handleRegenerateFixtures}
                >
                  Regenerate
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  )
}
