'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Container,
  Title,
  Paper,
  Text,
  Group,
  Badge,
  Loader,
  Stack,
  Button,
  ThemeIcon,
  Card,
  SimpleGrid,
} from '@mantine/core';
import { 
  IconGavel, 
  IconCalendar, 
  IconTrophy, 
  IconArrowRight, 
  IconPlayerPlay,
  IconSettings,
  IconChartBar
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface Auction {
  id: string;
  name: string;
  status: 'upcoming' | 'live' | 'completed';
  start_time: string | null;
  end_time: string | null;
  tournaments?: {
    name: string;
  };
}

export default function AuctionDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const [upcomingAuctions, setUpcomingAuctions] = useState<Auction[]>([]);
  const [completedAuctions, setCompletedAuctions] = useState<Auction[]>([]);

  const fetchAuctions = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    
    const { data, error } = await supabase
      .from('auctions')
      .select('*, tournaments(name)')
      .order('created_at', { ascending: false });

    if (data) {
      // @ts-ignore
      setLiveAuctions(data.filter(a => a.status === 'live'));
      // @ts-ignore
      setUpcomingAuctions(data.filter(a => a.status === 'upcoming'));
      // @ts-ignore
      setCompletedAuctions(data.filter(a => a.status === 'completed'));
    }
    
    if (!isBackground) setLoading(false);
  };

  useEffect(() => {
    fetchAuctions();

    const channel = supabase
      .channel('auctions-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        (payload) => {
          console.log('Auction update received:', payload);
          fetchAuctions(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Group justify="center" py={100}>
          <Loader size="lg" />
        </Group>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb={40}>
        <div>
          <Title order={2}>Auction Dashboard</Title>
          <Text c="dimmed">Manage and participate in tournament auctions</Text>
        </div>
        <Button 
          leftSection={<IconGavel size={18} />}
          onClick={() => router.push('/admin/tournaments/create')}
          variant="light"
        >
          New Auction
        </Button>
      </Group>

      {/* LIVE AUCTIONS */}
      {liveAuctions.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <Group mb="md" align="center">
            <ThemeIcon color="red" variant="light" size="lg" radius="xl">
              <IconPlayerPlay size={20} />
            </ThemeIcon>
            <Title order={3}>Live Now</Title>
            <Badge color="red" variant="dot" size="lg">LIVE</Badge>
          </Group>
          
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {liveAuctions.map(auction => (
              <Card key={auction.id} withBorder shadow="sm" radius="md" padding="lg" style={{ borderColor: 'var(--mantine-color-red-2)' }}>
                <Group justify="space-between" mb="xs">
                  <Badge color="red" variant="filled">LIVE BIDDING</Badge>
                  <Text size="xs" c="dimmed" fw={700}>STARTED {auction.start_time ? new Date(auction.start_time).toLocaleTimeString() : ''}</Text>
                </Group>
                
                <Title order={4} mb="xs">{auction.name}</Title>
                <Text size="sm" c="dimmed" mb="lg">
                  Tournament: {auction.tournaments?.name || 'Unknown'}
                </Text>

                <Button 
                  fullWidth 
                  color="red" 
                  size="md"
                  onClick={() => router.push(`/auction/live/${auction.id}`)}
                  rightSection={<IconArrowRight size={18} />}
                >
                  Enter Auction Room
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        </section>
      )}

      {/* UPCOMING AUCTIONS */}
      <section style={{ marginBottom: '3rem' }}>
        <Group mb="md">
          <ThemeIcon color="blue" variant="light" size="lg" radius="xl">
            <IconCalendar size={20} />
          </ThemeIcon>
          <Title order={3}>Upcoming</Title>
        </Group>

        {upcomingAuctions.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {upcomingAuctions.map(auction => (
              <Card key={auction.id} withBorder shadow="sm" radius="md" padding="lg">
                <Group justify="space-between" mb="xs">
                  <Badge color="blue" variant="light">UPCOMING</Badge>
                </Group>
                
                <Title order={4} mb="xs" lineClamp={1}>{auction.name}</Title>
                <Text size="sm" c="dimmed" mb="lg" lineClamp={1}>
                  {auction.tournaments?.name}
                </Text>

                <Button 
                  fullWidth 
                  variant="light"
                  onClick={() => router.push(`/auction/${auction.id}`)}
                  leftSection={<IconSettings size={18} />}
                >
                  Setup Wizard
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <Paper withBorder p="xl" ta="center" bg="var(--mantine-color-gray-0)" radius="md">
            <Text c="dimmed">No upcoming auctions scheduled.</Text>
          </Paper>
        )}
      </section>

      {/* COMPLETED AUCTIONS */}
      <section>
        <Group mb="md">
          <ThemeIcon color="green" variant="light" size="lg" radius="xl">
            <IconTrophy size={20} />
          </ThemeIcon>
          <Title order={3}>Completed</Title>
        </Group>

        {completedAuctions.length > 0 ? (
          <Stack>
            {completedAuctions.map(auction => (
              <Paper key={auction.id} withBorder p="md" radius="md">
                <Group justify="space-between">
                  <Group>
                    <ThemeIcon color="gray" variant="light" radius="md">
                      <IconGavel size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600}>{auction.name}</Text>
                      <Text size="xs" c="dimmed">
                        Ended on {auction.end_time ? new Date(auction.end_time).toLocaleDateString() : 'N/A'}
                      </Text>
                    </div>
                  </Group>
                  <Button 
                    variant="subtle" 
                    size="xs"
                    rightSection={<IconChartBar size={14} />}
                    onClick={() => router.push(`/auction/view/${auction.id}`)}
                  >
                    View Results
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed">No completed auctions history.</Text>
        )}
      </section>
    </Container>
  );
}
