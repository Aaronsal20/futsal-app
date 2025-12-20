'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  TextInput,
  Select,
  Button,
  Paper,
  Title,
  Container,
  Stack,
  Notification,
  Group,
  rem,
  Text,
  ThemeIcon,
  Center,
  Table,
  Modal,
  Badge,
  Avatar,
  ScrollArea,
  Loader,
  ActionIcon
} from '@mantine/core';
import { 
  IconCheck, 
  IconX, 
  IconUserPlus, 
  IconSoccerField, 
  IconSearch,
  IconBallFootball,
  IconCards
} from '@tabler/icons-react';
import confetti from 'canvas-confetti';

export default function PlayersAdminPage() {
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState<string | null>('goalkeeper');
  const [formLoading, setFormLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Data State
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player')
      .select(`
        *,
        ratings (score),
        match_events (event_type)
      `)
      .order('first_name');

    if (data) {
      const enriched = data.map((p: any) => {
        const goals = p.match_events?.filter((e: any) => e.event_type === 'goal').length || 0;
        const yellows = p.match_events?.filter((e: any) => e.event_type === 'yellow_card').length || 0;
        const reds = p.match_events?.filter((e: any) => e.event_type === 'red_card').length || 0;
        
        const scores = p.ratings?.map((r: any) => r.score) || [];
        const avgRating = scores.length > 0
          ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
          : 0;

        return { ...p, goals, yellows, reds, avgRating };
      });
      setPlayers(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleSubmit = async () => {
    setNotification(null);

    if (!firstName.trim() || !lastName.trim()) {
      setNotification({
        type: 'error',
        message: 'First name and last name are required.',
      });
      return;
    }

    setFormLoading(true);

    try {
      const { error } = await supabase.from('player').insert([
        {
          first_name: firstName,
          last_name: lastName,
          position: position,
        },
      ]);

      if (error) throw error;

      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#228be6', '#15aabf', '#40c057', '#fab005']
      });

      setNotification({
        type: 'success',
        message: 'Player added successfully!',
      });
      setFirstName('');
      setLastName('');
      setPosition('goalkeeper');
      setModalOpen(false);
      fetchPlayers(); // Refresh list
    } catch (error: any) {
      setNotification({
        type: 'error',
        message: error.message || 'Error adding player.',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const filteredPlayers = players.filter(p => 
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Player Management</Title>
          <Text c="dimmed">Manage roster and view statistics</Text>
        </div>
        <Button 
          leftSection={<IconUserPlus size={20} />} 
          color="blue" 
          onClick={() => setModalOpen(true)}
        >
          Add Player
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md" mb="lg">
        <TextInput
          placeholder="Search players..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </Paper>

      <Paper withBorder radius="md" overflow="hidden">
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Player</Table.Th>
                <Table.Th>Position</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Rating</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Goals</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>Cards</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center" py="xl">
                    <Loader size="sm" />
                  </Table.Td>
                </Table.Tr>
              ) : filteredPlayers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center" py="xl">
                    <Text c="dimmed">No players found</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredPlayers.map((player) => (
                  <Table.Tr key={player.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar 
                          src={player.avatar_url} 
                          radius="xl" 
                          color="blue"
                        >
                          {player.first_name[0]}{player.last_name[0]}
                        </Avatar>
                        <div>
                          <Text fw={500}>{player.first_name} {player.last_name}</Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={
                          player.position === 'goalkeeper' ? 'yellow' :
                          player.position === 'defender' ? 'blue' :
                          player.position === 'mid' ? 'green' : 'red'
                        }
                        variant="light"
                      >
                        {player.position}
                      </Badge>
                    </Table.Td>
                    <Table.Td align="center">
                      <Badge 
                        variant="dot" 
                        size="lg"
                        color={player.avgRating >= 8 ? 'green' : player.avgRating >= 6 ? 'blue' : 'gray'}
                      >
                        {player.avgRating.toFixed(1)}
                      </Badge>
                    </Table.Td>
                    <Table.Td align="center">
                      <Group gap={4} justify="center">
                        <IconBallFootball size={16} />
                        <Text fw={600}>{player.goals}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td align="center">
                      <Group gap="xs" justify="center">
                        {player.yellows > 0 && (
                          <Badge color="yellow" variant="filled" size="sm" circle>
                            {player.yellows}
                          </Badge>
                        )}
                        {player.reds > 0 && (
                          <Badge color="red" variant="filled" size="sm" circle>
                            {player.reds}
                          </Badge>
                        )}
                        {player.yellows === 0 && player.reds === 0 && (
                          <Text c="dimmed" size="sm">-</Text>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={<Title order={3}>Add New Player</Title>}
        centered
        size="md"
      >
        <Stack gap="md">
          {notification && (
            <Notification
              icon={notification.type === 'success' ? <IconCheck size={18} /> : <IconX size={18} />}
              color={notification.type === 'success' ? 'teal' : 'red'}
              onClose={() => setNotification(null)}
            >
              {notification.message}
            </Notification>
          )}

          <Group grow>
            <TextInput
              label="First Name"
              placeholder="e.g. Lionel"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
            />
            <TextInput
              label="Last Name"
              placeholder="e.g. Messi"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
            />
          </Group>

          <Select
            label="Position"
            placeholder="Select position"
            data={[
              { value: 'goalkeeper', label: 'Goalkeeper 🧤' },
              { value: 'defender', label: 'Defender 🛡️' },
              { value: 'mid', label: 'Midfielder 🏃' },
              { value: 'forward', label: 'Forward ⚽' },
            ]}
            value={position}
            onChange={setPosition}
            allowDeselect={false}
            leftSection={<IconSoccerField size={16} />}
          />

          <Button
            fullWidth
            mt="md"
            onClick={handleSubmit}
            loading={formLoading}
            color="blue"
          >
            Add Player
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
