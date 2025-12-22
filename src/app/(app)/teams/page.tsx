'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  TextInput,
  Avatar,
  Badge,
  SimpleGrid,
  ThemeIcon,
  Box,
  Progress,
  ActionIcon,
  Modal,
  Textarea,
  NumberInput,
  Alert,
  ScrollArea,
  Tooltip
} from '@mantine/core';
import { 
  IconSearch, 
  IconCheck, 
  IconRefresh, 
  IconUsersGroup, 
  IconUser,
  IconClipboard,
  IconPlus,
  IconAlertCircle,
  IconUserPlus
} from '@tabler/icons-react';
import { PlayerWithRating as Player } from '@/types/player';
import { generateBalancedTeams } from '@/utils/teamGenerator';

export default function TeamsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [teams, setTeams] = useState<Player[][]>([]);
  const [search, setSearch] = useState('');

  // Parse / Guest State
  const [parseModalOpen, setParseModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);
  const [guestRating, setGuestRating] = useState<number | string>(6.0);
  
  // Manual Guest Add State
  const [manualGuestModalOpen, setManualGuestModalOpen] = useState(false);
  const [manualGuestName, setManualGuestName] = useState('');
  const [manualGuestRating, setManualGuestRating] = useState<number | string>(6.0);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase.rpc('get_players_with_avg_rating');
      if (!error && data) setPlayers(data);
    };
    fetchPlayers();
  }, []);

  const togglePlayer = (id: number) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length < 15
        ? [...prev, id]
        : prev
    );
  };

  const handleParse = () => {
    // 1. Parse the content
    let names: string[] = [];
    const lines = pasteContent.split('\n');
    let isWaitingList = false;
    let foundNumberedList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().includes('waiting list')) {
        isWaitingList = true;
        continue;
      }

      if (isWaitingList) continue;

      // Match numbered lines: "1. Name", "10. Name"
      const match = trimmed.match(/^\d+\.\s*(.+)/);
      if (match) {
        foundNumberedList = true;
        // Remove invisible chars (like U+2060 WORD JOINER) and trim
        const name = match[1].replace(/[\u200B-\u200D\uFEFF\u2060]/g, '').trim();
        if (name) {
          names.push(name);
        }
      }
    }

    // Fallback to simple split if no numbered list structure was found
    if (!foundNumberedList) {
      names = pasteContent.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
    }

    const newSelected: number[] = [];
    const notFound: string[] = [];

    names.forEach(name => {
      const cleanName = name.toLowerCase();

      // 1. Try exact full name match
      let match = players.find(p => 
        `${p.first_name} ${p.last_name}`.toLowerCase() === cleanName
      );
      
      // 2. Try exact first name match
      if (!match) {
        match = players.find(p => 
          p.first_name.toLowerCase() === cleanName
        );
      }

      // 3. Try partial match: Player name contains input name
      if (!match && cleanName.length > 3) {
         match = players.find(p => 
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(cleanName)
        );
      }

      // 4. Try reverse partial match: Input name contains player first name
      // Useful for "Sticks bitch 🦮🚶🏻‍♂️" matching "Sticks"
      if (!match) {
        match = players.find(p => 
          cleanName.includes(p.first_name.toLowerCase()) && p.first_name.length > 2
        );
      }

      if (match) {
        if (!selected.includes(match.id) && !newSelected.includes(match.id)) {
          newSelected.push(match.id);
        }
      } else {
        notFound.push(name);
      }
    });

    setSelected(prev => [...prev, ...newSelected]);
    setUnmatchedNames(notFound);
    if (notFound.length === 0) {
      setParseModalOpen(false);
      setPasteContent('');
    }
  };

  const handleAddGuest = (name: string, ratingValue?: number) => {
    const rating = ratingValue !== undefined ? ratingValue : (typeof guestRating === 'number' ? guestRating : parseFloat(guestRating) || 6.0);
    
    const newGuest: Player = {
      id: Date.now() + Math.floor(Math.random() * 1000), // Temp ID
      first_name: name,
      last_name: '(Guest)',
      avg_rating: rating,
      position: 'guest',
      avatar_url: null
    };

    setPlayers(prev => [newGuest, ...prev]);
    setSelected(prev => [...prev, newGuest.id]);
    setUnmatchedNames(prev => prev.filter(n => n !== name));
  };

  const handleManualAddGuest = () => {
    if (!manualGuestName.trim()) return;
    const rating = typeof manualGuestRating === 'number' ? manualGuestRating : parseFloat(manualGuestRating) || 6.0;
    handleAddGuest(manualGuestName, rating);
    setManualGuestName('');
    setManualGuestRating(6.0);
    setManualGuestModalOpen(false);
  };

  const handleGenerate = () => {
    const selectedPlayers = players.filter((p) => selected.includes(p.id));
    try {
      setTeams(generateBalancedTeams(selectedPlayers));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const calculateTeamAverage = (team: Player[]) => {
    if (!team.length) return 0;
    const total = team.reduce((sum, p) => sum + p.avg_rating, 0);
    return total / team.length;
  };

  const filteredPlayers = players.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (id: number) => selected.includes(id);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={2}>Team Generator</Title>
          <Group>
            <Button 
              variant="light" 
              leftSection={<IconUserPlus size={16} />} 
              onClick={() => setManualGuestModalOpen(true)}
            >
              Add Guest
            </Button>
            <Button 
              variant="light" 
              leftSection={<IconClipboard size={16} />} 
              onClick={() => setParseModalOpen(true)}
            >
              Paste List
            </Button>
            {teams.length > 0 && (
               <Button variant="light" color="red" leftSection={<IconRefresh size={16} />} onClick={() => setTeams([])}>
                Reset
              </Button>
            )}
          </Group>
        </Group>

        {!teams.length ? (
          <>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600}>Select Players</Text>
                  <Badge size="lg" variant={selected.length === 15 ? 'filled' : 'light'} color={selected.length === 15 ? 'green' : 'blue'}>
                    {selected.length} / 15 Selected
                  </Badge>
                </Group>
                <Progress 
                  value={(selected.length / 15) * 100} 
                  color={selected.length === 15 ? 'green' : 'blue'} 
                  size="sm" 
                  animated={selected.length < 15}
                />
                <TextInput
                  placeholder="Search players by name..."
                  leftSection={<IconSearch size={16} />}
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  rightSection={
                    search && (
                      <ActionIcon variant="transparent" color="gray" onClick={() => setSearch('')}>
                        <IconRefresh size={14} style={{ transform: 'rotate(45deg)' }} /> {/* Using refresh as X for now or just empty */}
                      </ActionIcon>
                    )
                  }
                />
              </Stack>
            </Paper>

            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
              {filteredPlayers.map((p) => {
                const selected = isSelected(p.id);
                return (
                  <Card
                    key={p.id}
                    shadow="sm"
                    padding="md"
                    radius="md"
                    withBorder
                    onClick={() => togglePlayer(p.id)}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderColor: selected ? 'var(--mantine-color-blue-6)' : undefined,
                      backgroundColor: selected ? 'var(--mantine-color-blue-light)' : undefined,
                      transform: selected ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <Group wrap="nowrap">
                      <Avatar 
                        src={null} 
                        alt={p.first_name} 
                        color={selected ? 'blue' : 'initials'} 
                        name={`${p.first_name} ${p.last_name}`}
                      >
                        {selected && <IconCheck size={20} />}
                      </Avatar>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <Text size="sm" fw={500} truncate>
                          {p.first_name} {p.last_name}
                        </Text>
                        <Group gap={6} align="center" mt={4}>
                           <Badge size="sm" variant="outline" color="yellow" leftSection="⭐">
                             {p.avg_rating.toFixed(1)}
                           </Badge>
                        </Group>
                      </div>
                    </Group>
                  </Card>
                );
              })}
            </SimpleGrid>
            
            {/* Sticky Footer for Action */}
            <Box 
              style={{ 
                position: 'sticky', 
                bottom: 20, 
                zIndex: 10,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none' // Allow clicking through the container
              }}
            >
               <Paper 
                 shadow="xl" 
                 radius="xl" 
                 p={4} 
                 withBorder 
                 style={{ 
                   backgroundColor: 'var(--mantine-color-body)',
                   pointerEvents: 'auto' // Re-enable clicking on the button
                 }}
               >
                  <Button 
                    size="md" 
                    radius="xl"
                    onClick={handleGenerate} 
                    disabled={selected.length !== 15}
                    leftSection={<IconUsersGroup size={20} />}
                    px="xl"
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'cyan', deg: 90 }}
                  >
                    Generate Balanced Teams (AI)
                  </Button>
               </Paper>
            </Box>
          </>
        ) : (
          <Grid gutter="xl">
            {teams.map((team, idx) => (
              <Grid.Col span={{ base: 12, md: 6 }} key={idx}>
                <Card withBorder shadow="md" radius="md" padding="lg">
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                        <ThemeIcon size="lg" radius="md" variant="light" color={idx === 0 ? 'blue' : idx === 1 ? 'green' : 'orange'}>
                            <IconUsersGroup size={20} />
                        </ThemeIcon>
                        <Title order={4}>Team {idx + 1}</Title>
                    </Group>
                    <Badge size="lg" variant="dot" color={idx === 0 ? 'blue' : idx === 1 ? 'green' : 'orange'}>
                      Avg: {calculateTeamAverage(team).toFixed(2)}
                    </Badge>
                  </Group>
                  <Divider mb="md" />
                  <Stack gap="sm">
                    {team.map((p) => (
                      <Group key={p.id} justify="space-between" p="xs" style={{ borderRadius: 'var(--mantine-radius-sm)', '&:hover': { backgroundColor: 'var(--mantine-color-gray-0)' } }}>
                        <Group gap="sm">
                            <Avatar size="sm" radius="xl" name={`${p.first_name} ${p.last_name}`} color="initials" />
                            <Text size="sm" fw={500}>{p.first_name} {p.last_name}</Text>
                        </Group>
                        <Text size="sm" fw={600} c="yellow.7">⭐ {p.avg_rating.toFixed(1)}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Stack>

      <Modal 
        opened={parseModalOpen} 
        onClose={() => {
          setParseModalOpen(false);
          setUnmatchedNames([]);
          setPasteContent('');
        }}
        title={<Title order={3}>Paste Player List</Title>}
        size="lg"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Paste a list of names (separated by newlines or commas). We'll try to match them to existing players.
          </Text>
          
          <Textarea
            placeholder="e.g. Lionel Messi, Cristiano Ronaldo, Neymar"
            minRows={4}
            value={pasteContent}
            onChange={(e) => setPasteContent(e.currentTarget.value)}
          />

          <Button onClick={handleParse} fullWidth>Process List</Button>

          {unmatchedNames.length > 0 && (
            <Paper withBorder p="md" bg="gray.0">
              <Group gap="xs" mb="sm" c="orange">
                <IconAlertCircle size={18} />
                <Text fw={600} size="sm">Unmatched Players ({unmatchedNames.length})</Text>
              </Group>
              <Text size="xs" mb="md">
                The following names couldn't be matched. You can add them as guests.
              </Text>
              
              <Group mb="md">
                <NumberInput
                  label="Default Guest Rating"
                  value={guestRating}
                  onChange={setGuestRating}
                  min={1}
                  max={10}
                  step={0.5}
                  w={150}
                />
              </Group>

              <Stack gap="xs">
                {unmatchedNames.map((name, i) => (
                  <Group key={i} justify="space-between" bg="white" p="xs" style={{ borderRadius: '4px', border: '1px solid #eee' }}>
                    <Text size="sm" fw={500}>{name}</Text>
                    <Button 
                      size="xs" 
                      variant="light" 
                      color="blue" 
                      leftSection={<IconPlus size={14} />}
                      onClick={() => handleAddGuest(name)}
                    >
                      Add Guest
                    </Button>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Modal>
      <Modal
        opened={manualGuestModalOpen}
        onClose={() => setManualGuestModalOpen(false)}
        title={<Title order={3}>Add Guest Player</Title>}
        centered
      >
        <Stack>
          <TextInput
            label="Guest Name"
            placeholder="Enter name"
            value={manualGuestName}
            onChange={(e) => setManualGuestName(e.currentTarget.value)}
            data-autofocus
          />
          <NumberInput
            label="Rating (1-10)"
            value={manualGuestRating}
            onChange={setManualGuestRating}
            min={1}
            max={10}
            step={0.5}
          />
          <Button onClick={handleManualAddGuest} fullWidth mt="md">
            Add Guest
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}
