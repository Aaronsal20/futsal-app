'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Container,
  Title,
  SimpleGrid,
  Card,
  Avatar,
  Text,
  Group,
  Rating,
  Button,
  Stack,
  LoadingOverlay,
  Notification,
  rem,
  Badge,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconX, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import confetti from 'canvas-confetti';

type Player = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  avatar_url?: string;
};

export default function RatePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player')
      .select('id, first_name, last_name, position, avatar_url')
      .order('first_name');
    
    if (error) {
      console.error('Error fetching players:', error);
      setNotification({ type: 'error', message: 'Failed to load players' });
    } else if (data) {
      setPlayers(data);
    }
    setLoading(false);
  };

  const handleRatingChange = (playerId: number, value: number) => {
    setRatings((prev) => ({ ...prev, [playerId]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setNotification(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to rate players.');
      }

      const ratingsToSubmit = Object.entries(ratings).map(([playerId, score]) => ({
        player_id: parseInt(playerId),
        score,
        user_id: user.id, // Assuming you track who rated
        created_at: new Date().toISOString(),
      }));

      if (ratingsToSubmit.length === 0) {
        throw new Error('No ratings selected to submit.');
      }

      const { error } = await supabase.from('player_ratings').insert(ratingsToSubmit);

      if (error) throw error;

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
      });

      setNotification({ type: 'success', message: 'Ratings submitted successfully!' });
      setRatings({}); // Reset ratings after success
    } catch (error: any) {
      setNotification({ type: 'error', message: error.message || 'Error submitting ratings' });
    } finally {
      setSubmitting(false);
    }
  };

  const getPositionColor = (position: string) => {
    switch (position?.toLowerCase()) {
      case 'goalkeeper': return 'yellow';
      case 'defender': return 'blue';
      case 'midfielder': return 'green';
      case 'forward': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>Rate Players</Title>
            <Text c="dimmed">Rate your teammates based on their performance</Text>
          </div>
          <Button 
            variant="light" 
            leftSection={<IconRefresh size={16} />} 
            onClick={fetchPlayers}
            loading={loading}
          >
            Refresh
          </Button>
        </Group>

        {notification && (
          <Notification
            icon={notification.type === 'success' ? <IconCheck size={18} /> : <IconX size={18} />}
            color={notification.type === 'success' ? 'teal' : 'red'}
            title={notification.type === 'success' ? 'Success' : 'Error'}
            onClose={() => setNotification(null)}
          >
            {notification.message}
          </Notification>
        )}

        <div style={{ position: 'relative', minHeight: '200px' }}>
          <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
          
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
            {players.map((player) => (
              <Card key={player.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Card.Section p="md" style={{ display: 'flex', justifyContent: 'center', background: 'var(--mantine-color-gray-0)' }}>
                  <Avatar 
                    src={player.avatar_url} 
                    size={80} 
                    radius={80} 
                    color="initials" 
                    name={`${player.first_name} ${player.last_name}`}
                  />
                </Card.Section>

                <Stack mt="md" align="center" gap="xs">
                  <Text fw={600} size="lg" ta="center">
                    {player.first_name} {player.last_name}
                  </Text>
                  <Badge color={getPositionColor(player.position)} variant="light">
                    {player.position || 'Unknown'}
                  </Badge>
                  
                  <Group gap="xs" mt="sm">
                    <Rating 
                      value={ratings[player.id] || 0} 
                      onChange={(val) => handleRatingChange(player.id, val)} 
                      size="lg"
                    />
                  </Group>
                  <Text size="xs" c="dimmed">
                    {ratings[player.id] ? `${ratings[player.id]} / 5` : 'Not rated'}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </div>

        {/* Sticky Footer for Submit */}
        <div style={{ 
          position: 'sticky', 
          bottom: 20, 
          zIndex: 100, 
          display: 'flex', 
          justifyContent: 'center' 
        }}>
          <Card shadow="xl" radius="xl" p={5} withBorder style={{ background: 'var(--mantine-color-body)' }}>
            <Button
              size="lg"
              radius="xl"
              onClick={handleSubmit}
              loading={submitting}
              disabled={Object.keys(ratings).length === 0}
              leftSection={<IconDeviceFloppy size={20} />}
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
              px={40}
            >
              Submit {Object.keys(ratings).length} Ratings
            </Button>
          </Card>
        </div>
      </Stack>
    </Container>
  );
}