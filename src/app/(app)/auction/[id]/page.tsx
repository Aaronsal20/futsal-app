'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  Select,
  Stack,
  Stepper,
  Text,
  TextInput,
  Title,
  ThemeIcon,
  RingProgress,
  Center,
  Badge,
  ActionIcon,
} from '@mantine/core';
import { IconGavel, IconUsers, IconUserPlus, IconRocket, IconTrash, IconCheck, IconTrophy } from '@tabler/icons-react';
import confetti from 'canvas-confetti';
import classes from './AuctionWizard.module.css';

type UUID = string;

interface Player {
  id: number; // bigint
  first_name: string;
  last_name: string;
}

interface Auction {
  id: UUID;
  name: string;
  status: 'upcoming' | 'live' | 'completed';
  start_time: string | null;
  end_time: string | null;
  created_at?: string;
}

interface TeamDraftRow {
  id?: UUID;
  name: string;
  captainId: number | null; // player.id (bigint)
}

export default function AdminAuctionWizard() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [active, setActive] = useState(0);

  // Step 1: Auction
  const [auctionId, setAuctionId] = useState<UUID | null>(null);
  const [auctionName, setAuctionName] = useState('');
  const [tournamentDate, setTournamentDate] = useState<Date | null>(null);
  const [tournamentName, setTournamentName] = useState<string>('');

  // Step 2: Teams
  const [teamRows, setTeamRows] = useState<TeamDraftRow[]>([
    { name: '', captainId: null },
    { name: '', captainId: null },
  ]);

  // Step 3: Players
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Load players once
  useEffect(() => {
    (async () => {
      // If your table is named "players", change to .from('players')
      const { data, error } = await supabase
        .from('player')
        .select('id, first_name, last_name')
        .order('first_name', { ascending: true });
      if (!error && data) setPlayers(data as Player[]);
    })();
  }, []);

  // Load auction if ID is present
  useEffect(() => {
    if (id) {
      (async () => {
        const { data, error } = await supabase
          .from('auctions')
          .select(`
            *,
            tournaments (
              name,
              start_date,
              number_of_teams
            )
          `)
          .eq('id', id)
          .single();
        
        if (data && !error) {
          setAuctionId(data.id);
          setAuctionName(data.name);
          
          if (data.tournaments) {
            // @ts-ignore
            setTournamentName(data.tournaments.name);
            // @ts-ignore
            setTournamentDate(new Date(data.tournaments.start_date));
            
            // Initialize teams based on tournament settings
            // @ts-ignore
            const requiredTeams = data.tournaments.number_of_teams || 2;
            setTeamRows(Array(requiredTeams).fill(null).map(() => ({ name: '', captainId: null })));
          }

          setActive(1);
        }
      })();
    }
  }, [id]);

  const playerOptions = useMemo(
    () =>
      players.map((p) => ({
        value: String(p.id),
        label: `${p.first_name} ${p.last_name}`,
      })),
    [players]
  );

  const canCreateAuction =
    auctionName.trim().length > 1;

  const uniqueCaptainIds = useMemo(
    () => new Set(teamRows.map((t) => t.captainId).filter(Boolean) as number[]),
    [teamRows]
  );

  const canSaveTeams =
    auctionId &&
    teamRows.length >= 2 &&
    teamRows.every((t) => t.name.trim() && t.captainId) &&
    uniqueCaptainIds.size === teamRows.length;

  const PLAYERS_PER_TEAM = 5;
  const requiredPlayerCount = teamRows.length * PLAYERS_PER_TEAM;
  const canSavePlayers = auctionId && selectedPlayers.length === requiredPlayerCount;

  // ---- Actions ----
  const handleCreateAuction = async () => {
    if (!canCreateAuction) return;

    setLoading(true);
    
    if (auctionId) {
      // Update existing auction
      const { error } = await supabase
        .from('auctions')
        .update({
          name: auctionName.trim(),
        })
        .eq('id', auctionId);

      setLoading(false);

      if (error) {
        alert(`Failed to update auction: ${error.message}`);
        return;
      }
      setActive(1);
    } else {
      // Create new auction
      const { data, error } = await supabase
        .from('auctions')
        .insert([
          {
            name: auctionName.trim(),
            status: 'upcoming',
          } as Partial<Auction>,
        ])
        .select('id')
        .single();

      setLoading(false);

      if (error) {
        alert(`Failed to create auction: ${error.message}`);
        return;
      }
      setAuctionId(data.id);
      setActive(1);
    }
  };

  const handleAddTeamRow = () =>
    setTeamRows((rows) => [...rows, { name: '', captainId: null }]);

  const handleRemoveTeamRow = (idx: number) =>
    setTeamRows((rows) => rows.filter((_, i) => i !== idx));

  const handleSaveTeams = async () => {
    if (!canSaveTeams || !auctionId) return;

    setLoading(true);
    // Insert teams with auction_id; tournament_id stays null (set later)
    const payload = teamRows.map((t) => ({
      name: t.name.trim(),
      captain_id: t.captainId, // bigint
      auction_id: auctionId,   // IMPORTANT: teams must have auction_id column
      // budget defaults in DB (e.g., 1000)
    }));

    const { error } = await supabase.from('teams').insert(payload);
    setLoading(false);

    if (error) {
      alert(`Failed to save teams: ${error.message}`);
      return;
    }
    setActive(2);
  };

  const togglePlayer = (pid: number) => {
    // Prevent unselecting captains
    const isCaptain = teamRows.some(r => r.captainId === pid);
    if (isCaptain) return;

    setSelectedPlayers((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleSavePlayers = async () => {
    if (!canSavePlayers || !auctionId) return;

    setLoading(true);

    // 1. Fetch teams to identify captains and their team IDs
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('id, captain_id')
      .eq('auction_id', auctionId);

    if (teamsError) {
      setLoading(false);
      alert(`Failed to fetch teams: ${teamsError.message}`);
      return;
    }

    // 2. Prepare rows, assigning captains to their teams immediately
    const rows = selectedPlayers.map((pid) => {
      const team = teamsData?.find((t) => t.captain_id === pid);
      if (team) {
        return {
          auction_id: auctionId,
          player_id: pid,
          status: 'sold',
          team_id: team.id,
          price: 0, // Captains are free/pre-assigned
        };
      }
      return {
        auction_id: auctionId,
        player_id: pid,
        status: 'available',
      };
    });

    // 3. Insert into auction_players
    // Avoid duplicates across retries: use upsert on (auction_id, player_id) if you have a unique constraint
    const { error } = await supabase.from('auction_players').insert(rows);
    setLoading(false);

    if (error) {
      alert(`Failed to save players: ${error.message}`);
      return;
    }
    setActive(3);
  };

  const handleGoLive = async () => {
    if (!auctionId) return;
    setLoading(true);
    const { error } = await supabase
      .from('auctions')
      .update({ status: 'live', start_time: new Date().toISOString() })
      .eq('id', auctionId);
    setLoading(false);
    if (error) {
      alert(`Failed to go live: ${error.message}`);
      return;
    }
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    setTimeout(() => {
      router.push(`/auction/live/${auctionId}`);
    }, 1000);
  };

  // Auto-select captains when they are chosen in Step 2
  useEffect(() => {
    const captainIds = teamRows
      .map((r) => r.captainId)
      .filter((id): id is number => id !== null);

    if (captainIds.length > 0) {
      setSelectedPlayers((prev) => {
        const next = new Set(prev);
        let changed = false;
        captainIds.forEach((cid) => {
          if (!next.has(cid)) {
            next.add(cid);
            changed = true;
          }
        });
        return changed ? Array.from(next) : prev;
      });
    }
  }, [teamRows]);

  return (
    <Container size="lg" py="xl" className={classes.container}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className={classes.heroIcon}>
          <IconGavel size={48} color="white" />
        </div>
        <Title order={2} className={classes.gradientText}>
          Auction Setup Wizard
        </Title>
        <Text c="dimmed" mt="xs">Configure your tournament auction in a few simple steps</Text>
      </div>

      <Paper withBorder shadow="lg" radius="lg" p="xl" style={{ overflow: 'hidden' }}>
        <Stepper 
          active={active} 
          onStepClick={setActive} 
          allowNextStepsSelect={false}
          size="sm"
          styles={{
            stepIcon: {
              borderWidth: 2,
            },
            separator: {
              height: 2,
            }
          }}
        >
          {/* STEP 1 */}
          <Stepper.Step 
            label="Details" 
            description="Basic info"
            icon={<IconGavel size={18} />}
          >
            <Stack mt="xl" className={classes.stepContent}>
              {tournamentName && (
                <Paper withBorder p="md" radius="md" bg="var(--mantine-color-blue-0)">
                  <Group>
                    <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                      <IconTrophy size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">Tournament</Text>
                      <Text fw={600}>{tournamentName}</Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text size="xs" c="dimmed" fw={700} tt="uppercase">Date</Text>
                      <Text fw={600}>
                        {new Date().toLocaleDateString(undefined, { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              )}

              <TextInput
                label="Auction Name"
                placeholder="e.g. Summer Cup Auction"
                size="md"
                value={auctionName}
                onChange={(e) => setAuctionName(e.currentTarget.value)}
                required
              />

              <Group justify="space-between" mt="xl">
                <Text c="dimmed" size="sm">
                  The auction will start when you click "Go Live" at the end.
                </Text>
                <Button 
                  size="md"
                  loading={loading} 
                  disabled={!canCreateAuction} 
                  onClick={handleCreateAuction}
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'cyan' }}
                >
                  {auctionId ? 'Update & Next' : 'Create Auction'}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* STEP 2 */}
          <Stepper.Step 
            label="Teams" 
            description="Add captains"
            icon={<IconUsers size={18} />}
          >
            {!auctionId ? (
              <Text c="red">Create the auction first.</Text>
            ) : (
              <Stack mt="xl" className={classes.stepContent}>
                <Group justify="space-between" align="center">
                  <Text c="dimmed">
                    Define the {teamRows.length} teams for this tournament.
                  </Text>
                  <Badge size="lg" variant="light">{teamRows.length} Teams Required</Badge>
                </Group>

                <Stack gap="md">
                  {teamRows.map((row, idx) => (
                    <Card key={idx} className={classes.card} radius="md" p="md">
                      <Group align="flex-end" gap="md">
                        <div style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '50%', 
                          background: 'var(--mantine-color-gray-1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: 'var(--mantine-color-gray-6)',
                          marginBottom: 4
                        }}>
                          {idx + 1}
                        </div>
                        
                        <TextInput
                          label="Team Name"
                          placeholder="e.g., Thunder FC"
                          value={row.name ?? ''} 
                          onChange={(e) =>
                            setTeamRows((r) =>
                              r.map((t, i) =>
                                i === idx ? { ...t, name: e.target.value } : t
                              )
                            )
                          }
                          style={{ flex: 1 }}
                        />

                        <Select
                          label="Captain"
                          placeholder="Select captain"
                          data={playerOptions}
                          value={row.captainId ? String(row.captainId) : ''}
                          onChange={(val) =>
                            setTeamRows((r) =>
                              r.map((t, i) =>
                                i === idx ? { ...t, captainId: val ? Number(val) : null } : t
                              )
                            )
                          }
                          searchable
                          nothingFoundMessage="No players"
                          style={{ minWidth: 260 }}
                        />
                      </Group>
                    </Card>
                  ))}
                </Stack>

                <Group justify="space-between" mt="xl">
                  <Button variant="subtle" onClick={() => setActive(0)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSaveTeams}
                    loading={loading}
                    disabled={!canSaveTeams}
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan' }}
                  >
                    Save Teams
                  </Button>
                </Group>
              </Stack>
            )}
          </Stepper.Step>

          {/* STEP 3 */}
          <Stepper.Step 
            label="Players" 
            description="Select pool"
            icon={<IconUserPlus size={18} />}
          >
            {!auctionId ? (
              <Text c="red">Create the auction first.</Text>
            ) : (
              <Stack mt="xl" className={classes.stepContent}>
                <Group justify="space-between">
                  <div>
                    <Text c="dimmed">Select players available for auction.</Text>
                    <Text size="xs" c="dimmed">Each team needs {PLAYERS_PER_TEAM} players ({teamRows.length} teams × {PLAYERS_PER_TEAM} = {requiredPlayerCount} total)</Text>
                  </div>
                  <Badge 
                    size="lg" 
                    variant="filled" 
                    color={selectedPlayers.length === requiredPlayerCount ? 'green' : selectedPlayers.length > requiredPlayerCount ? 'red' : 'blue'}
                  >
                    {selectedPlayers.length} / {requiredPlayerCount} Selected
                  </Badge>
                </Group>

                <Grid gutter="md">
                  {players.map((p) => {
                    const checked = selectedPlayers.includes(p.id);
                    const isCaptain = teamRows.some(r => r.captainId === p.id);
                    
                    return (
                      <Grid.Col key={p.id} span={{ base: 12, sm: 6, md: 4 }}>
                        <Card
                          className={`${classes.card} ${checked ? classes.selectedCard : ''}`}
                          radius="md"
                          p="md"
                          onClick={() => togglePlayer(p.id)}
                          style={{ cursor: isCaptain ? 'default' : 'pointer', opacity: isCaptain ? 0.9 : 1 }}
                        >
                          <Group justify="space-between">
                            <Group gap="sm">
                              <ThemeIcon 
                                variant={checked ? 'filled' : 'light'} 
                                color={checked ? 'blue' : 'gray'}
                                radius="xl"
                              >
                                {checked ? <IconCheck size={14} /> : <IconUserPlus size={14} />}
                              </ThemeIcon>
                              <div>
                                <Text fw={500} size="sm">
                                  {p.first_name} {p.last_name}
                                </Text>
                                {isCaptain && (
                                  <Badge size="xs" variant="filled" color="orange" mt={2}>
                                    Captain (Assigned)
                                  </Badge>
                                )}
                              </div>
                            </Group>
                          </Group>
                        </Card>
                      </Grid.Col>
                    );
                  })}
                </Grid>

                <Group justify="space-between" mt="xl" align="center">
                  <Button variant="subtle" onClick={() => setActive(1)}>
                    Back
                  </Button>
                  <Group gap="sm">
                    {!canSavePlayers && (
                      <Text c="red" size="xs">
                        Select exactly {requiredPlayerCount} players
                      </Text>
                    )}
                    <Button
                      onClick={handleSavePlayers}
                      loading={loading}
                      disabled={!canSavePlayers}
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan' }}
                    >
                      Save Players
                    </Button>
                  </Group>
                </Group>
              </Stack>
            )}
          </Stepper.Step>

          {/* STEP 4 */}
          <Stepper.Completed>
            <Stack align="center" my={50} className={classes.stepContent}>
              <RingProgress
                size={180}
                thickness={16}
                roundCaps
                sections={[{ value: 100, color: 'teal' }]}
                label={
                  <Center>
                    <ThemeIcon color="teal" variant="light" radius="xl" size={80}>
                      <IconRocket size={40} />
                    </ThemeIcon>
                  </Center>
                }
              />
              
              <Title order={3} mt="md">All Systems Go! 🚀</Title>
              <Text c="dimmed" ta="center" maw={500}>
                The auction has been created, teams are set, and the player pool is ready.
                You can go live now to start the bidding process!
              </Text>
              
              <Group mt="xl">
                <Button variant="default" size="md" onClick={() => setActive(2)}>
                  Review Setup
                </Button>
                <Button 
                  size="md" 
                  loading={loading} 
                  onClick={handleGoLive}
                  color="teal"
                  leftSection={<IconRocket size={18} />}
                >
                  Go Live Now
                </Button>
              </Group>
            </Stack>
          </Stepper.Completed>
        </Stepper>
      </Paper>
    </Container>
  );
}
