"use client";
import { useEffect, useState } from 'react';
import { 
  SimpleGrid, 
  Loader, 
  Container, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack, 
  ThemeIcon, 
  Card, 
  Box,
  rem,
  Paper,
  Badge,
  Overlay
} from '@mantine/core';
import { supabase } from '@/lib/supabase'
import PlayerCard from '@/components/PlayerCard';
import { IconTrophy, IconUsers, IconGavel, IconArrowRight, IconBallFootball, IconChartBar, IconVideo, IconLogin, IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchPlayers = async () => {
    setLoading(true);
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
      );

    if (!error && data) {
      const enriched = data.map((p: any) => {
        const scores = p.ratings?.map((r: any) => r.score) || [];
        const avg =
          scores.length > 0
            ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            : 0;
        return { ...p, avgRating: avg };
      });
      // Sort by rating and take top 6
      setPlayers(enriched.sort((a: any, b: any) => b.avgRating - a.avgRating).slice(0, 6));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        bg="dark.8" 
        style={{ 
          position: 'relative', 
          overflow: 'hidden',
          borderBottom: '4px solid var(--mantine-color-green-6)'
        }}
        py={80}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(47, 158, 68, 0.2) 0%, rgba(0, 0, 0, 0) 50%)',
          zIndex: 0
        }} />
        
        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
          <Group justify="space-between" align="center">
            <Stack gap="xl" maw={600}>
              <Box>
                <Group gap="xs" mb="md">
                  <ThemeIcon size="lg" color="green" variant="light" radius="xl">
                    <IconBallFootball size={20} />
                  </ThemeIcon>
                  <Text c="green.4" fw={700} tt="uppercase" ls={1}>Futsal Manager</Text>
                </Group>
                <Title 
                  order={1} 
                  c="white" 
                  style={{ fontSize: rem(48), lineHeight: 1.1 }}
                  mb="md"
                >
                  Manage Your <Text span c="green.4" inherit>Futsal</Text> League Like a Pro
                </Title>
                <Text c="gray.4" size="lg" maw={500}>
                  Organize tournaments, run player auctions, track stats, and manage your team - all in one place.
                </Text>
              </Box>

              <Group>
                {session ? (
                  <Button 
                    component={Link} 
                    href="/tournaments" 
                    size="lg" 
                    color="green"
                    rightSection={<IconArrowRight size={18} />}
                  >
                    View Tournaments
                  </Button>
                ) : (
                  <>
                    <Button 
                      component={Link} 
                      href="/register" 
                      size="lg" 
                      color="green"
                      leftSection={<IconUserPlus size={18} />}
                    >
                      Get Started
                    </Button>
                    <Button 
                      component={Link} 
                      href="/login" 
                      size="lg" 
                      variant="outline" 
                      color="white"
                      leftSection={<IconLogin size={18} />}
                    >
                      Login
                    </Button>
                  </>
                )}
                <Button 
                  component={Link} 
                  href="/players" 
                  size="lg" 
                  variant="subtle" 
                  color="gray" 
                  c="white"
                >
                  Player Database
                </Button>
              </Group>
            </Stack>

            <Box visibleFrom="md">
              <Image 
                src="/stickers/football.png" 
                alt="Football" 
                width={400} 
                height={400}
                style={{ 
                  filter: 'drop-shadow(0 0 20px rgba(47, 158, 68, 0.3))',
                  animation: 'float 6s ease-in-out infinite'
                }} 
              />
            </Box>
          </Group>
        </Container>
      </Box>

      <Container size="lg" py={60}>
        {/* Live Feed Section */}
        <Box mb={80}>
          <Group justify="space-between" mb="xl">
            <Group>
              <ThemeIcon color="red" variant="light" size="lg">
                <IconVideo size={20} />
              </ThemeIcon>
              <Title order={2}>Live Feed</Title>
              <Badge color="red" variant="filled" size="lg" className="animate-pulse">LIVE</Badge>
            </Group>
            <Button component={Link} href="/live" variant="subtle" rightSection={<IconArrowRight size={16} />}>
              Watch All
            </Button>
          </Group>
          
          <Card padding="0" radius="md" withBorder shadow="sm">
            <Box h={400} bg="black" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Stack align="center" gap="xs">
                <IconVideo size={64} color="white" style={{ opacity: 0.5 }} />
                <Text c="dimmed">Live Stream Placeholder</Text>
              </Stack>
              <Overlay color="#000" backgroundOpacity={0.3} />
              <Box style={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 2 }}>
                <Group justify="space-between" align="flex-end">
                  <Box>
                    <Text c="white" fw={700} size="xl">FC Barcelona vs Real Madrid</Text>
                    <Text c="gray.3" size="sm">Champions League Final - Group A</Text>
                  </Box>
                  <Badge color="red" size="lg">2nd Half - 35:00</Badge>
                </Group>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Quick Actions */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb={80}>
          <Paper p="xl" radius="md" withBorder shadow="sm" style={{ transition: 'transform 0.2s' }} className="hover:scale-105">
            <ThemeIcon size={48} radius="md" color="blue" variant="light" mb="md">
              <IconTrophy size={28} />
            </ThemeIcon>
            <Title order={3} mb="xs">Tournaments</Title>
            <Text c="dimmed" mb="lg">Create and manage leagues, knockouts, and friendly matches.</Text>
            <Button component={Link} href="/tournaments" variant="light" fullWidth>Go to Tournaments</Button>
          </Paper>

          <Paper p="xl" radius="md" withBorder shadow="sm" style={{ transition: 'transform 0.2s' }} className="hover:scale-105">
            <ThemeIcon size={48} radius="md" color="orange" variant="light" mb="md">
              <IconGavel size={28} />
            </ThemeIcon>
            <Title order={3} mb="xs">Auctions</Title>
            <Text c="dimmed" mb="lg">Run real-time player auctions with virtual currency and bidding.</Text>
            <Button component={Link} href="/auction" variant="light" color="orange" fullWidth>Go to Auctions</Button>
          </Paper>

          <Paper p="xl" radius="md" withBorder shadow="sm" style={{ transition: 'transform 0.2s' }} className="hover:scale-105">
            <ThemeIcon size={48} radius="md" color="grape" variant="light" mb="md">
              <IconChartBar size={28} />
            </ThemeIcon>
            <Title order={3} mb="xs">Stats</Title>
            <Text c="dimmed" mb="lg">Track goals, assists, clean sheets, and player ratings.</Text>
            <Button component={Link} href="/players" variant="light" color="grape" fullWidth>View Stats</Button>
          </Paper>
        </SimpleGrid>

        {/* Top Players */}
        <Group justify="space-between" mb="xl">
          <Title order={2}>Top Rated Players</Title>
          <Button component={Link} href="/players" variant="subtle" rightSection={<IconArrowRight size={16} />}>
            View All Players
          </Button>
        </Group>

        {loading ? (
          <Loader size="lg" mx="auto" />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </SimpleGrid>
        )}
      </Container>

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </Box>
  );
}
