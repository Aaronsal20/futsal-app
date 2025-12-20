'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Container,
  Title,
  Table,
  Paper,
  Text,
  Group,
  Divider,
  Stack,
  Loader,
} from '@mantine/core'

interface PlayerStats {
  id: string
  first_name: string
  last_name: string
  avg_rating: number
  rating_count: number
  min_rating: number
  max_rating: number
}

export default function ViewPlayersPage() {
  const [players, setPlayers] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlayers = async () => {
    const { data, error } = await supabase.rpc('get_players_with_stats')
    if (error) {
      console.error('Error fetching players:', error)
    } else if (data) {
      setPlayers(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  const overallAverage =
    players.reduce((sum, p) => sum + p.avg_rating, 0) / players.length || 0

  return (
    <Container size="lg" py="xl">
      <Title order={2} ta="center" mb="xl">
        📊 Player Ratings
      </Title>

      {loading ? (
        <Group justify="center">
          <Loader />
        </Group>
      ) : (
        <>
          {/* Stats Summary */}
          <Paper withBorder shadow="sm" radius="md" p="lg" mb="xl">
            <Stack gap="xs">
              <Text fw={600}>Overall Avg Rating: ⭐ {overallAverage.toFixed(2)}</Text>
              <Text>Total Players Rated: {players.length}</Text>
            </Stack>
          </Paper>

          <Divider label="All Players" labelPosition="center" mb="lg" />

          {/* Table */}
          <Paper withBorder shadow="sm" radius="md" p="lg">
            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th ta="center">Avg Rating</Table.Th>
                  <Table.Th ta="center"># Ratings</Table.Th>
                  <Table.Th ta="center">Min</Table.Th>
                  <Table.Th ta="center">Max</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {players.map((player) => (
                  <Table.Tr key={player.id}>
                    <Table.Td>
                      {player.first_name} {player.last_name}
                    </Table.Td>
                    <Table.Td ta="center">⭐ {player.avg_rating?.toFixed(2)}</Table.Td>
                    <Table.Td ta="center">{player.rating_count}</Table.Td>
                    <Table.Td ta="center">{player.min_rating?.toFixed(1)}</Table.Td>
                    <Table.Td ta="center">{player.max_rating?.toFixed(1)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </>
      )}
    </Container>
  )
}
