'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Container,
  Paper,
  Title,
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Text,
  rem,
  Notification,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconTrophy, IconCalendar, IconUsers, IconCheck, IconX } from '@tabler/icons-react';
import '@mantine/dates/styles.css';

export default function CreateTournamentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    teams_count: 8,
    format: 'direct_semis',
    start_date: new Date(),
    location: '',
  });

  const handleSubmit = async () => {
    if (!formData.name) {
      setNotification({ type: 'error', message: 'Tournament name is required' });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      const startDate = new Date(formData.start_date);
      
      // 1. Create Tournament
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert([
          {
            name: formData.name,
            start_date: startDate.toISOString(),
            status: 'upcoming',
            knockout_type: formData.format,
            location: formData.location,
            number_of_teams: formData.teams_count,
          },
        ])
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // 2. Create Auction
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .insert([
          {
            tournament_id: tournament.id,
            name: `${formData.name} Auction`,
            status: 'upcoming',
          },
        ])
        .select()
        .single();

      if (auctionError) throw auctionError;

      setNotification({ type: 'success', message: 'Tournament and Auction created successfully!' });
      
      // Redirect to manage page or the new tournament page
      setTimeout(() => {
        router.push(`/auction/${auction.id}`);
      }, 1500);

    } catch (error: any) {
      console.error('Error creating tournament:', error);
      setNotification({ 
        type: 'error', 
        message: error.message || 'Failed to create tournament' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Stack gap="lg">
          <div style={{ textAlign: 'center' }}>
            <Title order={2}>Create Tournament</Title>
            <Text c="dimmed" size="sm">Set up a new tournament</Text>
          </div>

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

          <TextInput
            label="Tournament Name"
            placeholder="e.g. Summer Cup 2025"
            required
            leftSection={<IconTrophy size={16} />}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />

          <Group grow>
            <NumberInput
              label="Number of Teams"
              placeholder="8"
              min={2}
              max={32}
              leftSection={<IconUsers size={16} />}
              value={formData.teams_count}
              onChange={(val) => setFormData({ ...formData, teams_count: Number(val) })}
            />
            <Select
              label="Format"
              placeholder="Select format"
              data={[
                { value: 'direct_semis', label: 'Direct Semis' },
                { value: 'playoffs', label: 'Playoffs' },
              ]}
              value={formData.format}
              onChange={(val) => setFormData({ ...formData, format: val || 'direct_semis' })}
            />
          </Group>

          <DatePickerInput
            label="Start Date"
            placeholder="Pick a date"
            leftSection={<IconCalendar size={16} />}
            value={formData.start_date}
            onChange={(val) => setFormData({ ...formData, start_date: val || new Date() })}
          />

          <TextInput
            label="Location"
            placeholder="e.g. Main Stadium"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.currentTarget.value })}
          />

          <Button 
            fullWidth 
            size="md" 
            mt="md" 
            onClick={handleSubmit} 
            loading={loading}
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
          >
            Create Tournament
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
