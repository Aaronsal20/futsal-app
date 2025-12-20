"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import {
  Container,
  Title,
  Text,
  Loader,
  Card,
  Group,
  Stack,
  Divider,
} from "@mantine/core"

interface Tournament {
  id: string
  name: string
  start_date: string
  end_date: string
  location?: string
  status?: string
  auction_status?: string // assuming you track auction
}

export default function TournamentListPage() {
  const router = useRouter()

  const [past, setPast] = useState<Tournament[]>([])
  const [upcoming, setUpcoming] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: false })

      if (error) {
        console.log(error)
        setLoading(false)
        return
      }

      const today = new Date()

      const pastTournaments = data?.filter(
        (t) => new Date(t.end_date) < today
      ) || []

      const upcomingTournaments = data?.filter(
        (t) =>
          new Date(t.start_date) >= today &&
          (t.auction_status === "completed" || t.auction_status === "done")
      ) || []

      setPast(pastTournaments)
      setUpcoming(upcomingTournaments)
      setLoading(false)
    }

    fetchTournaments()
  }, [])

  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="md">
        Tournaments
      </Title>
      <Divider my="md" />

      {loading ? (
        <Loader />
      ) : (
        <>
          <Title order={3} mt="lg" mb="sm">
            Upcoming (with auction done)
          </Title>
          {upcoming.length === 0 ? (
            <Text c="dimmed">No upcoming tournaments.</Text>
          ) : (
            <Stack>
              {upcoming.map((t) => (
                <Card key={t.id} shadow="sm" radius="md" withBorder mb="sm">
                  <Group justify="space-between">
                    <Title order={4}>{t.name}</Title>
                    <Text
                      c={t.status === "completed" ? "green" : "blue"}
                      fw={500}
                    >
                      {t.status || "Ongoing"}
                    </Text>
                  </Group>
                  <Text size="sm" mt={4}>
                    {t.location && (
                      <span>📍 {t.location} &nbsp;|&nbsp; </span>
                    )}
                    {new Date(t.start_date).toLocaleDateString()} -{" "}
                    {new Date(t.end_date).toLocaleDateString()}
                  </Text>
                </Card>
              ))}
            </Stack>
          )}

          <Title order={3} mt="xl" mb="sm">
            Past
          </Title>
          {past.length === 0 ? (
            <Text c="dimmed">No past tournaments.</Text>
          ) : (
            <Stack>
              {past.map((t) => (
                <Card
                  key={t.id}
                  shadow="sm"
                  radius="md"
                  withBorder
                  mb="sm"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/tournaments/${t.id}`)}
                >
                  <Group justify="space-between">
                    <Title order={4}>{t.name}</Title>
                    <Text c="green" fw={500}>
                      Completed
                    </Text>
                  </Group>
                  <Text size="sm" mt={4}>
                    {t.location && (
                      <span>📍 {t.location} &nbsp;|&nbsp; </span>
                    )}
                    {new Date(t.start_date).toLocaleDateString()} -{" "}
                    {new Date(t.end_date).toLocaleDateString()}
                  </Text>
                </Card>
              ))}

            </Stack>
          )}
        </>
      )}
    </Container>
  )
}
