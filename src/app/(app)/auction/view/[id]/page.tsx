'use client'

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Container, Title, Text, Loader, Group, Paper, Stack, Divider, 
  Tabs, Grid, Card, Progress, Avatar, Badge, Table, ThemeIcon,
  SimpleGrid, RingProgress, Center
} from "@mantine/core"
import { 
  IconTrophy, IconUsers, IconCash, IconUserOff, IconShirt 
} from "@tabler/icons-react"
import AuctionStatsChart from "../AuctionStats"

interface Team {
  id: string
  name: string
}

interface Player {
  id: number
  first_name: string
  last_name: string
  position?: string
  avatar_url?: string
}

interface AuctionPlayer {
  id: string
  team: Team | null
  player: Player
  price: number | null
  status: 'sold' | 'unsold'
}

export default function AuctionViewPage() {
  const { id } = useParams()
  const [auction, setAuction] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [auctionPlayers, setAuctionPlayers] = useState<AuctionPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [captains, setCaptains] = useState<{ [teamId: string]: number } | null>(null)

  useEffect(() => {
    const fetchAuction = async () => {
      setLoading(true)

      // Auction info
      const { data: auctionData } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      setAuction(auctionData)

      // Teams in this auction
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("auction_id", id)
      setTeams(teamData || [])

      // Auction players with player + team info
      const { data: apData } = await supabase
        .from("auction_players")
        .select(`
          id,
          price,
          status,
          player:player_id ( id, first_name, last_name, position, avatar_url ),
          team:team_id ( id, name )
        `)
        .eq("auction_id", id)

      setAuctionPlayers(
        (apData || []).map((ap: any) => ({
          ...ap,
          player: Array.isArray(ap.player) ? ap.player[0] : ap.player,
          team: Array.isArray(ap.team) ? ap.team[0] : ap.team,
        }))
      )

      // Fetch captains for each team
      const { data: captainData } = await supabase
        .from("teams")
        .select("id, captain_id")
        .eq("auction_id", id)
      const captainsMap: { [teamId: string]: number } = {};
      if (captainData && Array.isArray(captainData)) {
        captainData.forEach((team: any) => {
          if (team.captain_id) captainsMap[team.id] = team.captain_id;
        });
      }
      setCaptains(captainsMap);

      setLoading(false)
    }

    if (id) fetchAuction()
  }, [id])

  if (loading) return <Center h={400}><Loader size="lg" /></Center>
  if (!auction) return <Container><Text>No auction found</Text></Container>

  // Derived Stats
  const totalSpent = auctionPlayers.reduce((acc, ap) => acc + (ap.price || 0), 0)
  const totalSold = auctionPlayers.filter(ap => ap.status === 'sold').length
  const totalUnsold = auctionPlayers.filter(ap => ap.status === 'unsold').length
  
  const topPlayers = [...auctionPlayers]
    .filter(ap => ap.status === 'sold' && ap.price)
    .sort((a, b) => (b.price || 0) - (a.price || 0))
    .slice(0, 5)

  return (
    <Container size="xl" py="xl">
      {/* Hero Section */}
      <Paper p="xl" radius="md" withBorder mb="xl" bg="var(--mantine-color-body)">
        <Group justify="space-between" align="flex-start">
          <div>
            <Badge size="lg" mb="xs" color={auction.status === 'COMPLETED' ? 'green' : 'blue'}>
              {auction.status}
            </Badge>
            <Title order={1}>{auction.name}</Title>
            <Text c="dimmed" size="sm">
              Ended on {auction.end_time ? new Date(auction.end_time).toLocaleDateString() : "N/A"}
            </Text>
          </div>
          <Group gap="xl">
            <Stack gap={0} align="center">
              <ThemeIcon size="lg" variant="light" color="blue" radius="xl">
                <IconCash size={20} />
              </ThemeIcon>
              <Text fw={700} size="xl">₹{totalSpent.toLocaleString()}</Text>
              <Text size="xs" c="dimmed">Total Spent</Text>
            </Stack>
            <Stack gap={0} align="center">
              <ThemeIcon size="lg" variant="light" color="green" radius="xl">
                <IconUsers size={20} />
              </ThemeIcon>
              <Text fw={700} size="xl">{totalSold}</Text>
              <Text size="xs" c="dimmed">Players Sold</Text>
            </Stack>
            <Stack gap={0} align="center">
              <ThemeIcon size="lg" variant="light" color="red" radius="xl">
                <IconUserOff size={20} />
              </ThemeIcon>
              <Text fw={700} size="xl">{totalUnsold}</Text>
              <Text size="xs" c="dimmed">Unsold</Text>
            </Stack>
          </Group>
        </Group>
      </Paper>

      <Tabs defaultValue="squads" variant="outline" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="squads" leftSection={<IconUsers size={16} />}>
            Team Squads
          </Tabs.Tab>
          <Tabs.Tab value="stats" leftSection={<IconTrophy size={16} />}>
            Statistics
          </Tabs.Tab>
          <Tabs.Tab value="unsold" leftSection={<IconUserOff size={16} />}>
            Unsold Players ({totalUnsold})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="squads">
          <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
            {teams.map((team) => {
              const squad = auctionPlayers.filter(
                (ap) => ap.team?.id === team.id && ap.status === "sold"
              )
              const captainId = captains?.[team.id]
              const spent = squad.reduce((acc, ap) => acc + (ap.price || 0), 0)
              const budget = 1000 // Assuming fixed budget for now, or fetch from team if variable
              const remaining = budget - spent
              const percentSpent = (spent / budget) * 100

              return (
                <Card key={team.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Title order={3} size="h4">{team.name}</Title>
                    <Badge variant="light" size="lg">{squad.length} Players</Badge>
                  </Group>

                  <Card.Section p="md" py="xs" bg="var(--mantine-color-gray-0)">
                    <Group justify="space-between" mb={4}>
                      <Text size="xs" fw={500} c="dimmed">Budget Used</Text>
                      <Text size="xs" fw={700}>₹{spent} / ₹{budget}</Text>
                    </Group>
                    <Progress 
                      value={percentSpent} 
                      color={percentSpent > 90 ? 'red' : percentSpent > 75 ? 'orange' : 'blue'} 
                      size="md" 
                      radius="xl" 
                    />
                  </Card.Section>

                  <Stack gap="sm" mt="md">
                    {squad.length > 0 ? (
                      squad.map((ap) => (
                        <Group key={ap.id} wrap="nowrap" align="center">
                          <Avatar src={ap.player.avatar_url} radius="xl" size="sm" color="initials">
                            {ap.player.first_name[0]}{ap.player.last_name[0]}
                          </Avatar>
                          <div style={{ flex: 1 }}>
                            <Group gap={6}>
                              <Text size="sm" fw={500} lineClamp={1}>
                                {ap.player.first_name} {ap.player.last_name}
                              </Text>
                              {captainId === ap.player.id && (
                                <Badge size="xs" color="yellow" variant="filled">C</Badge>
                              )}
                            </Group>
                            <Group gap={6}>
                                {ap.player.position && (
                                    <Badge size="xs" variant="outline" color="gray">{ap.player.position}</Badge>
                                )}
                            </Group>
                          </div>
                          <Text fw={700} size="sm" c="blue">₹{ap.price}</Text>
                        </Group>
                      ))
                    ) : (
                      <Text c="dimmed" size="sm" ta="center" py="xl">No players assigned</Text>
                    )}
                  </Stack>
                </Card>
              )
            })}
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="stats">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
                <Paper withBorder p="md" radius="md">
                    <Title order={4} mb="md">Auction Overview</Title>
                    <AuctionStatsChart teams={teams} auctionPlayers={auctionPlayers} />
                </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper withBorder p="md" radius="md" h="100%">
                    <Title order={4} mb="md">Top 5 Most Expensive</Title>
                    <Stack gap="md">
                        {topPlayers.map((ap, index) => (
                            <Group key={ap.id} justify="space-between">
                                <Group gap="sm">
                                    <ThemeIcon variant="light" color={index === 0 ? 'yellow' : 'gray'} radius="xl">
                                        <Text fw={700} size="sm">{index + 1}</Text>
                                    </ThemeIcon>
                                    <div>
                                        <Text size="sm" fw={500}>{ap.player.first_name} {ap.player.last_name}</Text>
                                        <Text size="xs" c="dimmed">{ap.team?.name}</Text>
                                    </div>
                                </Group>
                                <Badge size="lg" variant="light">₹{ap.price}</Badge>
                            </Group>
                        ))}
                    </Stack>
                </Paper>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="unsold">
          <Paper withBorder p="md" radius="md">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
                {auctionPlayers.filter((ap) => ap.status === "unsold").map((ap) => (
                <Paper key={ap.id} withBorder p="sm" radius="md">
                    <Group>
                        <Avatar src={ap.player.avatar_url} radius="xl" color="gray">
                            {ap.player.first_name[0]}{ap.player.last_name[0]}
                        </Avatar>
                        <div>
                            <Text size="sm" fw={500}>{ap.player.first_name} {ap.player.last_name}</Text>
                            {ap.player.position && <Badge size="xs" color="gray">{ap.player.position}</Badge>}
                        </div>
                    </Group>
                </Paper>
                ))}
            </SimpleGrid>
            {auctionPlayers.filter(ap => ap.status === 'unsold').length === 0 && (
                <Text ta="center" c="dimmed" py="xl">All players were sold!</Text>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}
