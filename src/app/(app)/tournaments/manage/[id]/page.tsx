'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Container,
  Title,
  Stack,
  Button,
  Card,
  Group,
  Text,
  Loader,
  Notification,
  Divider,
} from '@mantine/core'

export default function ManageTournamentPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<any>(null)
  const [fixtures, setFixtures] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [starting, setStarting] = useState(false)
  const [auctionStatus, setAuctionStatus] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // Fetch tournament
      const { data: tData, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()
      if (tError) {
        console.error(tError)
        setMessage('Error fetching tournament.')
        setLoading(false)
        return
      }
      setTournament(tData)

      if (tData.auction_id) {
        const { data: aData } = await supabase
          .from('auctions')
          .select('status')
          .eq('id', tData.auction_id)
          .single()
        setAuctionStatus(aData?.status || null)
      }

      // Fetch fixtures
      const { data: fData, error: fError } = await supabase
        .from('fixtures')
        .select(`
          id,
          scheduled_time,
          team1_id,
          team2_id,
          team1_color,
          team2_color,
          team1:team1_id!inner(name),
          team2:team2_id!inner(name)
        `)
        .eq('tournament_id', id)
        .order('scheduled_time', { ascending: true })
      if (fError) {
        console.error(fError)
        setMessage('Error fetching fixtures.')
      } else {
        setFixtures(fData || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleStartTournament = async () => {
    setStarting(true)
    const { error } = await supabase
      .from('tournaments')
      .update({ status: 'started' })
      .eq('id', id)
    setStarting(false)

    if (error) {
      console.error(error)
      setMessage('Error starting tournament.')
    } else {
      setTournament((prev: any) => ({ ...prev, status: 'started' }))
      setMessage('Tournament started successfully!')
      router.push(`/tournaments/manage/${id}/live`)
    }
  }

  if (loading) return <Loader size="lg" style={{ marginTop: '4rem' }} />

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">
        Manage Tournament: {tournament?.name}
      </Title>

      {message && (
        <Notification
          color={message.includes('Error') ? 'red' : 'green'}
          onClose={() => setMessage('')}
          mt="sm"
        >
          {message}
        </Notification>
      )}

      <Stack gap="md">
        {/* If no fixtures */}
        {fixtures.length === 0 ? (
          <Button
            color="blue"
            onClick={() =>
              router.push(`/tournaments/manage/fixtures/${tournament.id}`)
            }
          >
            Generate Fixtures
          </Button>
        ) : (
          <>
            <Title order={4}>Fixtures</Title>
            {fixtures.map((f) => (
              <Card key={f.id} withBorder shadow="xs" radius="md" p="sm">
                <Group justify="space-between">
                  <Text>
                    <strong style={{ color: f.team1_color.toLowerCase() }}>
                      {f.team1.name}
                    </strong>{' '}
                    vs{' '}
                    <strong style={{ color: f.team2_color.toLowerCase() }}>
                      {f.team2.name}
                    </strong>
                  </Text>
                  <Text size="sm">
                    {new Date(f.scheduled_time).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </Text>
                </Group>
              </Card>
            ))}

            <Divider my="sm" />

            {tournament?.status !== 'started' && (
              <>
                <Button
                  color="green"
                  onClick={handleStartTournament}
                  loading={starting}
                  disabled={!!auctionStatus && auctionStatus !== 'COMPLETED'}
                >
                  Start Tournament
                </Button>
                {auctionStatus && auctionStatus !== 'COMPLETED' && (
                  <Text c="red" size="sm" mt="xs">
                    Auction must be completed before starting the tournament.
                  </Text>
                )}
              </>
            )}

            {tournament?.status === 'started' && (
              <Group>
                <Notification color="green" withCloseButton={false}>Tournament is live!</Notification>
                <Button 
                  variant="light" 
                  onClick={() => router.push(`/tournaments/manage/${id}/live`)}
                >
                  Go to Live Dashboard
                </Button>
              </Group>
            )}
          </>
        )}
      </Stack>
    </Container>
  )
}
