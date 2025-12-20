"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Container, Title, Text, Loader, Card, Group, Button, Stack, Badge, ActionIcon, Tooltip } from "@mantine/core"
import { IconPlus, IconPlayerPlay, IconGavel, IconSettings, IconTrophy } from "@tabler/icons-react"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"

interface Tournament {
  id: string
  name: string
  start_date: string
  end_date: string
  location?: string
  status?: string
  auction_id?: string
  auctions?: {
    id: string
    status: string
  }[]
}

export default function ManageTournamentsPage() {
  const router = useRouter()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState<string | null>(null)

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("tournaments")
      .select("*, auctions(id, status)")
      .in("status", ["upcoming", "live", "setup"])
      .order("start_date", { ascending: true })

    if (error) {
      console.error("Error fetching tournaments:", error)
    } else {
      setTournaments(data || [])
    }
    setLoading(false)
  }

  const handleStartTournament = async (t: Tournament) => {
    setStartingId(t.id)
    
    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'live' })
      .eq('id', t.id)

    if (!error) {
      router.push(`/tournaments/manage/${t.id}/live`)
    }
    setStartingId(null)
  }

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="md">
        <Title order={2}>Manage Tournaments</Title>
        <Button 
          leftSection={<IconPlus size={18} />} 
          onClick={() => router.push('/tournaments/create')}
        >
          Create Tournament
        </Button>
      </Group>

      {loading ? (
        <Loader />
      ) : tournaments.length === 0 ? (
        <Text>No tournaments found.</Text>
      ) : (
        <Stack>
          {tournaments.map(t => {
            const auction = t.auctions?.[0]
            const isStarted = t.status === 'live'
            const isAuctionDone = auction?.status === 'COMPLETED'

            return (
              <Card key={t.id} withBorder shadow="sm" radius="md" p="lg">
                <Group justify="space-between">
                  <div>
                    <Group gap="xs" mb={4}>
                      <Title order={4}>{t.name}</Title>
                      <Badge color={isStarted ? 'green' : 'blue'}>{t.status}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {dayjs(t.start_date).format("DD MMM YYYY")} –{" "}
                      {dayjs(t.end_date).format("DD MMM YYYY")}
                    </Text>
                    {t.location && <Text size="sm">📍 {t.location}</Text>}
                  </div>

                  <Group>
                    {/* 1. Live Dashboard (if started) */}
                    {isStarted && (
                      <Button
                        color="red"
                        variant="light"
                        leftSection={<IconPlayerPlay size={16} />}
                        onClick={() => router.push(`/tournaments/manage/${t.id}/live`)}
                      >
                        Live Dashboard
                      </Button>
                    )}

                    {/* 2. Start Tournament (if upcoming & auction done OR status is setup) */}
                    {!isStarted && (isAuctionDone || t.status === 'setup') && (
                      <Button
                        color="green"
                        loading={startingId === t.id}
                        leftSection={<IconTrophy size={16} />}
                        onClick={() => handleStartTournament(t)}
                      >
                        Start Tournament
                      </Button>
                    )}

                    {/* 3. Go to Auction (if upcoming & auction NOT done) */}
                    {!isStarted && !isAuctionDone && auction && (
                      <Button
                        variant="light"
                        color="orange"
                        leftSection={<IconGavel size={16} />}
                        onClick={() => router.push(`/auction/${auction.id}`)}
                      >
                        Go to Auction
                      </Button>
                    )}

                    {/* 4. Manage (Always available) */}
                    <Tooltip label="Manage Settings & Fixtures">
                      <ActionIcon 
                        variant="subtle" 
                        color="gray" 
                        size="lg"
                        onClick={() => router.push(`/tournaments/manage/${t.id}`)}
                      >
                        <IconSettings size={20} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            )
          })}
        </Stack>
      )}
    </Container>
  )
}
