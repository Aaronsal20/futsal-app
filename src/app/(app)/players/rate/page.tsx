'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@supabase/auth-helpers-react'
import {
  Modal,
  Card,
  Slider,
  Textarea,
  Button,
  Text,
  Group,
  Rating,
  Collapse,
  Tabs,
  Container,
  SimpleGrid,
  Avatar,
  Badge,
  Stack,
  ActionIcon,
  rem,
  Notification,
  LoadingOverlay,
  Center,
  ThemeIcon,
  Title
} from '@mantine/core'
import { IconStar, IconMessage, IconCheck, IconX, IconSoccerField } from '@tabler/icons-react'
import confetti from 'canvas-confetti'

interface Player {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string
  position: string
  ratings?: { id: string; score: number; comments: string; rater_id: string }[]
  avgRating?: number
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const user = useUser()
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [score, setRatingValue] = useState(5)
  const [comments, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'unrated' | 'rated'>('unrated')
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Fetch Players & Ratings
  const fetchPlayers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('player')
      .select(
        `id, first_name, last_name, avatar_url, position,
        ratings (
          id,
          score,
          comments,
          rater_id
        )`
      )

    if (!error && data) {
      const enriched = data.map((p: any) => {
        const scores = p.ratings?.map((r: any) => r.score) || []
        const avg =
          scores.length > 0
            ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            : 0
        return { ...p, avgRating: avg }
      })
      setPlayers(enriched)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  // Handle Modal Close
  const closeModal = () => {
    setSelectedPlayer(null)
    setRatingValue(5)
    setComment('')
  }

  // Submit Rating
  const handleSubmit = async () => {
    if (!selectedPlayer || !user) return
    setSubmitting(true)
    setNotification(null)

    const { error } = await supabase
      .from('ratings')
      .upsert(
        [
          {
            player_id: selectedPlayer.id,
            score,
            comments,
            rater_id: user.id,
          },
        ],
        { onConflict: 'player_id,rater_id' }
      )

    if (error) {
      console.error('Error saving rating:', error)
      setNotification({ type: 'error', message: 'Failed to save rating' })
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
      setNotification({ type: 'success', message: 'Rating saved successfully!' })
      closeModal()
      fetchPlayers()
    }
    setSubmitting(false)
  }

  // Separate rated/unrated players
  const ratedPlayers = players.filter((player) =>
    player.ratings?.some((r) => r.rater_id === user?.id)
  )
  const unratedPlayers = players.filter(
    (player) => !player.ratings?.some((r) => r.rater_id === user?.id)
  )

  const getPositionColor = (position: string) => {
    switch (position?.toLowerCase()) {
      case 'goalkeeper': return 'yellow';
      case 'defender': return 'blue';
      case 'midfielder': return 'green';
      case 'forward': return 'red';
      default: return 'gray';
    }
  };

  const renderPlayerCard = (player: Player) => (
    <Card
      key={player.id}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
      className="hover:shadow-md hover:-translate-y-1"
    >
      <Card.Section p="md" bg="var(--mantine-color-gray-0)">
        <Center>
          <Avatar
            src={player.avatar_url}
            alt={`${player.first_name} ${player.last_name}`}
            size={80}
            radius={80}
            color="initials"
            name={`${player.first_name} ${player.last_name}`}
          />
        </Center>
      </Card.Section>

      <Stack mt="md" align="center" gap={4}>
        <Text fw={700} size="lg" ta="center">
          {player.first_name} {player.last_name}
        </Text>
        <Badge color={getPositionColor(player.position)} variant="light">
          {player.position}
        </Badge>
      </Stack>

      <Group justify="center" mt="md">
        <Rating
          value={player.avgRating || 0}
          fractions={2}
          readOnly
          size="sm"
        />
        <Text size="xs" c="dimmed">
          ({player.avgRating?.toFixed(1) || 0})
        </Text>
      </Group>

      <Button
        variant="subtle"
        size="xs"
        fullWidth
        mt="sm"
        leftSection={<IconMessage size={14} />}
        onClick={() =>
          setExpandedPlayer((prev) => (prev === player.id ? null : player.id))
        }
      >
        {expandedPlayer === player.id ? 'Hide Comments' : 'Show Comments'}
      </Button>

      <Collapse in={expandedPlayer === player.id}>
        <Stack gap="xs" mt="xs" p="xs" bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
          {player.ratings && player.ratings.length > 0 ? (
            <div className="max-h-32 overflow-y-auto">
              {player.ratings.map((r) => (
                <Group key={r.id} align="flex-start" wrap="nowrap" mb="xs">
                  <ThemeIcon size="xs" color="yellow" variant="light">
                    <IconStar size={10} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" fw={700}>{r.score}/10</Text>
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>{r.comments}</Text>
                  </div>
                </Group>
              ))}
            </div>
          ) : (
            <Text size="xs" c="dimmed" ta="center">
              No comments yet
            </Text>
          )}
        </Stack>
      </Collapse>

      <Button
        variant="light"
        fullWidth
        mt="md"
        onClick={() => setSelectedPlayer(player)}
        color="blue"
      >
        Rate Player
      </Button>
    </Card>
  )

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div className="text-center">
          <Title order={1} mb="xs">Player Ratings</Title>
          <Text c="dimmed">Rate and review player performances</Text>
        </div>

        {notification && (
          <Notification
            icon={notification.type === 'success' ? <IconCheck size={18} /> : <IconX size={18} />}
            color={notification.type === 'success' ? 'teal' : 'red'}
            title={notification.type === 'success' ? 'Success' : 'Error'}
            onClose={() => setNotification(null)}
            withBorder
          >
            {notification.message}
          </Notification>
        )}

        <div style={{ position: 'relative', minHeight: '200px' }}>
          <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
          
          <Tabs value={activeTab} onChange={(v) => setActiveTab(v as 'unrated' | 'rated')} variant="pills" radius="md">
            <Tabs.List grow mb="xl">
              <Tabs.Tab value="unrated" leftSection={<IconStar size={16} />}>
                Unrated Players ({unratedPlayers.length})
              </Tabs.Tab>
              <Tabs.Tab value="rated" leftSection={<IconCheck size={16} />}>
                Rated Players ({ratedPlayers.length})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="unrated">
              {unratedPlayers.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                  {unratedPlayers.map(renderPlayerCard)}
                </SimpleGrid>
              ) : (
                <Text ta="center" c="dimmed" py="xl">No unrated players found.</Text>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="rated">
              {ratedPlayers.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                  {ratedPlayers.map(renderPlayerCard)}
                </SimpleGrid>
              ) : (
                <Text ta="center" c="dimmed" py="xl">You haven't rated any players yet.</Text>
              )}
            </Tabs.Panel>
          </Tabs>
        </div>
      </Stack>

      {/* Rating Modal */}
      <Modal
        opened={!!selectedPlayer}
        onClose={closeModal}
        title={<Text fw={700}>Rate {selectedPlayer?.first_name} {selectedPlayer?.last_name}</Text>}
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        {selectedPlayer && (
          <Stack>
            <Center>
              <Avatar 
                src={selectedPlayer.avatar_url} 
                size="xl" 
                radius="xl" 
                name={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                color="initials"
              />
            </Center>
            
            <Stack gap={0} align="center">
              <Text size="sm" fw={500} mb={5}>Rating Score</Text>
              <Text size="3rem" fw={900} c="blue" style={{ lineHeight: 1 }}>{score}</Text>
              <Text size="sm" c="dimmed">out of 10</Text>
            </Stack>

            <Slider
              value={score}
              onChange={setRatingValue}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' },
              ]}
              size="lg"
              thumbSize={24}
              styles={{ markLabel: { marginTop: 8 } }}
              mb="md"
            />
            
            <Textarea
              label="Comments (Optional)"
              placeholder="Share your thoughts on their performance..."
              minRows={3}
              value={comments}
              onChange={(e) => setComment(e.currentTarget.value)}
            />
            
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} loading={submitting}>
                Submit Rating
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}
