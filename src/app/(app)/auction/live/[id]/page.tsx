'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
  TextInput,
  SimpleGrid,
  Badge,
  ThemeIcon,
  Avatar,
  ActionIcon,
  Grid,
  Paper,
  ScrollArea,
  Divider,
  Select,
  Box,
  Center,
} from '@mantine/core';
import { 
  IconGavel, 
  IconUser, 
  IconTrophy, 
  IconCash, 
  IconUsers, 
  IconPlayerPause, 
  IconCheck, 
  IconX,
  IconClock
} from '@tabler/icons-react';
import classes from './AuctionLive.module.css';
import confetti from 'canvas-confetti';

interface Player {
  id: number;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  price?: number;
  status?: string;
  team_id?: string;
  position?: string;
}

interface Team {
  id: string;
  name: string;
  captain_id: number;
  captain_name: string;
  budget: number;
}

interface Auction {
  id: string;
  name: string;
}

const FutsalPitch = ({ teamName, players }: { teamName: string; players: any[] }) => {
  // 5-a-side positions (Top to Bottom visually on screen)
  // DB Positions: 'defender', 'mid', 'forward'
  const formationSlots = [
    { top: '85%', left: '50%', label: 'GK', roles: ['goalkeeper', 'gk'] },
    { top: '60%', left: '50%', label: 'DEF', roles: ['defender'] },
    { top: '40%', left: '20%', label: 'LW', roles: ['mid'] },
    { top: '40%', left: '80%', label: 'RW', roles: ['mid'] },
    { top: '15%', left: '50%', label: 'FWD', roles: ['forward'] },
  ];

  // Helper to find player for a slot
  const getPlayerForSlot = (roles: string[], index: number) => {
    // 1. Try to find exact match by position
    const exactMatch = players.find(p => 
      !p.assigned && 
      p.position && 
      roles.includes(p.position.toLowerCase())
    );

    if (exactMatch) {
      exactMatch.assigned = true;
      return exactMatch;
    }
    
    // 2. If no exact match, fill with any unassigned player
    // (This ensures all players are shown even if positions don't match perfectly)
    const anyPlayer = players.find(p => !p.assigned);
    if (anyPlayer) {
      anyPlayer.assigned = true;
      return anyPlayer;
    }
    
    return null;
  };

  // Reset assigned flag for re-render
  players.forEach(p => p.assigned = false);

  return (
    <Box
      style={{
        width: '100%',
        height: '400px',
        backgroundColor: '#4ade80',
        backgroundImage: `
          linear-gradient(to bottom, #4ade80 0%, #22c55e 100%),
          repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(255,255,255,0.1) 50px, transparent 51px),
          repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255,255,255,0.1) 50px, transparent 51px)
        `,
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
        border: '4px solid white',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
      }}
    >
      {/* Center Circle */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80px',
        height: '80px',
        border: '2px solid rgba(255,255,255,0.6)',
        borderRadius: '50%'
      }} />
      
      {/* Halfway Line */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: '2px',
        backgroundColor: 'rgba(255,255,255,0.6)'
      }} />

      {/* Penalty Areas */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120px',
        height: '60px',
        border: '2px solid rgba(255,255,255,0.6)',
        borderTop: 'none',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px'
      }} />
      
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120px',
        height: '60px',
        border: '2px solid rgba(255,255,255,0.6)',
        borderBottom: 'none',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
      }} />

      <Text 
        c="white" 
        fw={900} 
        size="xl" 
        tt="uppercase" 
        style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          opacity: 0.2,
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}
      >
        {teamName}
      </Text>

      {formationSlots.map((slot, index) => {
        const player = getPlayerForSlot(slot.roles, index);
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: slot.top,
              left: slot.left,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '80px',
              zIndex: 2
            }}
          >
            {player ? (
              <>
                <Avatar
                  src={player.avatar_url}
                  size="md"
                  radius="xl"
                  color="white"
                  bg="white"
                  style={{ 
                    border: `3px solid ${player.isCaptain ? '#fcc419' : 'white'}`,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  }}
                >
                  {player.first_name[0]}
                </Avatar>
                <Paper 
                  p={4} 
                  radius="xs" 
                  mt={4} 
                  bg="rgba(0,0,0,0.7)" 
                  style={{ backdropFilter: 'blur(4px)' }}
                >
                  <Text c="white" size="xs" fw={700} ta="center" lh={1}>
                    {player.first_name}
                  </Text>
                  {player.isCaptain && (
                    <Text c="yellow" size="10px" fw={700} ta="center" lh={1}>
                      (C)
                    </Text>
                  )}
                </Paper>
              </>
            ) : (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px dashed rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text c="white" size="xs" fw={700} style={{ opacity: 0.7 }}>
                  {slot.label}
                </Text>
              </div>
            )}
          </div>
        );
      })}
      {/* Prepare players for next render cycle */}
      {(() => { players.forEach(p => delete p.assigned); return null; })()}
    </Box>
  );
};

export default function AuctionRoom() {
  const params = useParams<{ id: string }>();
  const auctionId = params?.id;
  const [session, setSession] = useState<any>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [shuffled, setShuffled] = useState<Player[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bids, setBids] = useState<Record<string, string>>({});
  const [viewTeamId, setViewTeamId] = useState<string | null>(null);


  // Load auction, teams, players
  useEffect(() => {
    if (!auctionId) return;

    (async () => {
      // Fetch auction + teams + players in parallel
      const [{ data: a }, { data: t }, { data: p }] = await Promise.all([
        supabase.from('auctions').select('*').eq('id', auctionId).single(),
        supabase
          .from('teams')
          .select('id, name, captain_id, budget')
          .eq('auction_id', auctionId),
        supabase
          .from('auction_players')
          .select('player:player_id(id, first_name, last_name, avatar_url, position), status, team_id, price')
          .eq('auction_id', auctionId)
      ]);

      console.log('🚀 ~ AuctionRoom ~ p:', p)
      setAuction(a);

      // Build teams with captain names
      let teamsWithCaptains: Team[] = [];
      if (t) {
        for (let team of t) {
          let captainName = '';
          const { data: cap } = await supabase
            .from('player')
            .select('first_name,last_name')
            .eq('id', team.captain_id)
            .single();

          if (cap) {
            captainName = `${cap.first_name} ${cap.last_name}`;
          }

          teamsWithCaptains.push({
            id: team.id,
            name: team.name,
            captain_id: team.captain_id,
            captain_name: captainName,
            budget: team.budget ?? 10000,
          });
        }
      }
      setTeams(teamsWithCaptains);
      console.log('🚀 ~ AuctionRoom ~ teamsWithCaptains:', teamsWithCaptains)

      // Prepare players & filter out captains
      let list = (p ?? []).map((ap: any) => ({
        ...ap.player,      // id, first_name, last_name, position
        team_id: ap.team_id,
        status: ap.status,
        price: ap.price,
      }));
      const captainIds = (t ?? []).map((team) => team.captain_id);
      list = list.filter((pl) => !captainIds.includes(pl.id));
      console.log('🚀 ~ AuctionRoom ~ list:', list)
      setPlayers(list);
      // Fetch the active bidding session
      const { data: sessionData, error: sessionError } = await supabase
        .from("bidding_sessions")
        .select("*")
        .eq("auction_id", auctionId)
        .eq("status", "in_progress")
        .maybeSingle();   // allows 0 rows without error


      if (!sessionError && sessionData) {
        setSession(sessionData);

        // Restore state
        if (sessionData.shuffled_order) {
          const orderMap = new Map(list.map((p: Player) => [p.id, p]));
          const order = sessionData.shuffled_order
            .map((id: number) => orderMap.get(id))
            .filter((p: any) => !!p && p.status !== 'sold' && p.status !== 'unsold');

          setShuffled(order);
        }
        if (sessionData.current_index !== undefined) {
          setCurrentIndex(sessionData.current_index);
        }
      }

    })();
  }, [auctionId]);

  useEffect(() => {
    if (!auctionId) return;

    const channel = supabase
      .channel("auction-room")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bidding_sessions" },
        (payload) => {
          console.log('🚀 ~ AuctionRoom ~ payload:', payload)
          if (payload.new.auction_id === auctionId) {
            console.log("🔔 Session updated:", payload.new);
            setSession(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  useEffect(() => {
    if (!auctionId) return;

    const channel = supabase
      .channel("teams-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "teams" },
        (payload) => {
          setTeams((prev) =>
            prev.map((t) => (t.id === payload.new.id ? { ...t, budget: payload.new.budget } : t))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  useEffect(() => {
    if (!auctionId) return;

    const channel = supabase
      .channel("players-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auction_players" },
        (payload) => {
          if (payload.new.auction_id === auctionId) {
             setPlayers((prev) =>
              prev.map((p) =>
                p.id === payload.new.player_id
                  ? { ...p, status: payload.new.status, team_id: payload.new.team_id, price: payload.new.price }
                  : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);


  // Auto-select the team that is currently bidding
  useEffect(() => {
    if (session?.current_team_id) {
      setViewTeamId(session.current_team_id);
    }
  }, [session?.current_team_id]);

  const markPlayer = async (status: "sold" | "unsold") => {
    const playerId = shuffled[currentIndex]?.id;
    if (!playerId || !session) return;

    if (status === "sold") {
      // Deduct from team budget
      const winningTeamId = session.current_team_id;
      const winningBid = session.current_bid;

      if (winningTeamId && winningBid) {
        // Fetch current team to get budget
        const { data: teamData, error: teamFetchError } = await supabase
          .from('teams')
          .select('budget')
          .eq('id', winningTeamId)
          .single();

        if (teamFetchError || !teamData) {
           console.error("❌ Failed to fetch team budget:", teamFetchError);
           return;
        }

        const newBudget = (teamData.budget || 0) - Number(winningBid);

        const { error: budgetError } = await supabase
          .from('teams')
          .update({ budget: newBudget })
          .eq('id', winningTeamId);

        if (budgetError) {
          console.error("❌ Failed to deduct budget:", budgetError);
          return;
        }

        // Update local state immediately
        setTeams((prev) =>
          prev.map((t) => (t.id === winningTeamId ? { ...t, budget: newBudget } : t))
        );
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }

    // Update player status in auction_players
    const updatePayload: any = { status };

    if (status === "sold" && session.current_team_id) {
      updatePayload.team_id = session.current_team_id; // ✅ store winner
      updatePayload.price = session.current_bid;       // (optional: store price too)
    }

    const { error: playerError } = await supabase
      .from("auction_players")
      .update(updatePayload)
      .eq("auction_id", auctionId)
      .eq("player_id", playerId);

    if (playerError) {
      console.error("❌ Failed to update player:", playerError);
      return;
    }

    // 🔑 Remove player locally
    // 🔑 Remove player from shuffled
    const newShuffled = shuffled.filter((p) => p.id !== playerId);
    setShuffled(newShuffled);

    // 🔑 Update local players state
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, status, team_id: session.current_team_id, price: session.current_bid }
          : p
      )
    );


    // Advance to next player (same index, since we removed one)
    const nextIndex = currentIndex >= newShuffled.length ? 0 : currentIndex;

    await supabase
      .from("bidding_sessions")
      .update({
        current_index: nextIndex,
        current_team_id: null,
        current_bid: null,
        current_player_id: newShuffled[nextIndex]?.id ?? null,
      })
      .eq("auction_id", auctionId)
      .eq("status", "in_progress");

    setCurrentIndex(nextIndex);
  };

  const assignUnsoldPlayer = async (playerId: number, teamId: string) => {
    // Update in DB
    const { error } = await supabase
      .from("auction_players")
      .update({
        status: "sold",
        team_id: teamId,
        price: 0, // free pick
      })
      .eq("auction_id", auctionId)
      .eq("player_id", playerId);

    if (error) {
      console.error("❌ Failed to assign unsold player:", error);
      return;
    }

    // Update local state
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, status: "sold", team_id: teamId, price: 0 } : p
      )
    );
  };


  const startAuction = async () => {
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    setShuffled(shuffledPlayers);
    setCurrentIndex(0);
    await supabase.from("bidding_sessions").insert({
      auction_id: auctionId,
      status: "in_progress",
      shuffled_order: shuffledPlayers.map(p => p.id), // store player ids
      current_index: 0
    });

  };

  const placeBid = async (teamId: string) => {
    const amount = Number(bids[teamId]);
    if (!amount || !shuffled[currentIndex]) return;

    const playerId = shuffled[currentIndex].id;

    // Insert history
    const { error: bidError } = await supabase.from("bids").insert({
      auction_id: auctionId,
      team_id: teamId,
      player_id: playerId,
      amount,
    });

    if (bidError) {
      console.error(bidError);
      return;
    }

    // Update session with latest highest bid
    const { error: sessionError } = await supabase
      .from("bidding_sessions")
      .update({
        current_team_id: teamId,
        current_player_id: playerId,
        current_bid: amount,
        current_index: currentIndex // keep track of progress
      })
      .eq("auction_id", auctionId)
      .eq("status", "in_progress");

    if (sessionError) console.error(sessionError);

    setBids((b) => ({ ...b, [teamId]: "" }));
  };


  const [ending, setEnding] = useState(false);

  const endAuction = async () => {
    if (!auctionId || !session) return;
    setEnding(true);
    
    // 1. End the bidding session
    await supabase
      .from("bidding_sessions")
      .update({ status: "completed" })
      .eq("auction_id", auctionId)
      .eq("status", "in_progress");

    // 2. Mark the auction itself as completed
    await supabase
      .from("auctions")
      .update({ 
        status: "completed",
        end_time: new Date().toISOString()
      })
      .eq("id", auctionId);

    setEnding(false);
    // Optionally, you can set session to null or update local state
    setSession((prev: any) => prev ? { ...prev, status: "completed" } : prev);
  };

  const currentPlayer = shuffled[currentIndex];

  console.log('🚀 ~ AuctionRoom ~ teams:', teams, players)
  const upcoming = shuffled.slice(currentIndex + 1, currentIndex + 6);
  const squads = teams.map((team) => ({
    ...team,
    players: [
      {
        id: -1 * team.captain_id, // unique negative id for captain
        first_name: team.captain_name,
        last_name: '',
        isCaptain: true,
      },
      ...players.filter((p: any) => p.team_id === team.id && p.status === "sold"),
    ],
  }));

  const activeTeam = teams.find(t => t.id === viewTeamId) || teams.find(t => t.id === session?.current_team_id) || teams[0];
  const activeSquadPlayers = squads.find(s => s.id === activeTeam?.id)?.players || [];

  const unsoldPlayers = players.filter((p: any) => p.status === "unsold");

  return (
    <Container size="xl" py="xl" className={classes.container}>
      <Group justify="space-between" mb="xl" align="center">
        <Group>
          <ThemeIcon size={42} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconGavel size={24} />
          </ThemeIcon>
          <div>
            <Title order={2}>{auction?.name ?? 'Live Auction'}</Title>
            <Text c="dimmed" size="sm">Live Bidding Room</Text>
          </div>
        </Group>
        
        {session?.status === "in_progress" && (
          <Badge size="lg" variant="dot" color="green" className={classes.bidHighlight}>
            LIVE NOW
          </Badge>
        )}
      </Group>

      {!shuffled.length && !session ? (
        <Paper withBorder p={50} radius="md" ta="center" bg="var(--mantine-color-gray-0)">
          <ThemeIcon size={80} radius="xl" color="blue" variant="light" mb="xl">
            <IconGavel size={40} />
          </ThemeIcon>
          <Title order={2} mb="md">Ready to Start?</Title>
          <Text c="dimmed" mb="xl" maw={500} mx="auto">
            All teams and players are loaded. Once you start, the first player will appear for bidding.
          </Text>
          <Button size="xl" onClick={startAuction} leftSection={<IconGavel />}>
            Start Auction
          </Button>
        </Paper>
      ) : session?.status === "completed" ? (
        <Paper withBorder p={50} radius="md" ta="center" bg="var(--mantine-color-gray-0)">
          <ThemeIcon size={80} radius="xl" color="green" variant="light" mb="xl">
            <IconTrophy size={40} />
          </ThemeIcon>
          <Title order={2} mb="md" c="green">Auction Completed!</Title>
          <Text c="dimmed" mb="xl">
            All players have been auctioned. Check the team squads below.
          </Text>
        </Paper>
      ) : (
        <Grid gutter="xl">
          {/* LEFT COLUMN: Current Player & Upcoming */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="lg">
              {/* Current Player Card */}
              {currentPlayer ? (
                <Card withBorder shadow="lg" radius="lg" p={0} className={classes.playerCard}>
                  <div className={classes.heroCard} style={{ padding: '2rem', textAlign: 'center' }}>
                    <Avatar 
                      size={120} 
                      radius={120} 
                      mx="auto" 
                      mb="md" 
                      src={currentPlayer.avatar_url} 
                      color="white" 
                      bg="rgba(255,255,255,0.2)"
                    >
                      <IconUser size={60} />
                    </Avatar>
                    <Title order={2} style={{ color: 'white' }}>
                      {currentPlayer.first_name} {currentPlayer.last_name}
                    </Title>
                    <Badge mt="sm" size="lg" color="white" variant="light">
                      Base Price: ₹{currentPlayer.price || 0}
                    </Badge>
                  </div>

                  <Stack p="lg" gap="md">
                    <Paper withBorder p="md" radius="md" bg="var(--mantine-color-gray-0)">
                      <Group justify="space-between" align="center">
                        <div>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Current Bid</Text>
                          <Text className={classes.statValue} c="blue">
                            ₹{session.current_bid || 0}
                          </Text>
                        </div>
                        <Divider orientation="vertical" />
                        <div style={{ textAlign: 'right' }}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Winning Team</Text>
                          <Text fw={700} c="dark">
                            {teams.find(t => t.id === session.current_team_id)?.name ?? "—"}
                          </Text>
                        </div>
                      </Group>
                    </Paper>

                    <Group grow>
                      <Button 
                        color="green" 
                        size="md" 
                        onClick={() => markPlayer("sold")} 
                        disabled={session?.status === "completed"}
                        leftSection={<IconCheck size={18} />}
                      >
                        SOLD
                      </Button>
                      <Button 
                        color="red" 
                        variant="light" 
                        size="md" 
                        onClick={() => markPlayer("unsold")} 
                        disabled={session?.status === "completed"}
                        leftSection={<IconX size={18} />}
                      >
                        UNSOLD
                      </Button>
                    </Group>
                    
                    <Button 
                      variant="subtle" 
                      color="gray" 
                      size="xs" 
                      onClick={endAuction} 
                      loading={ending} 
                      disabled={ending || session?.status === "completed"}
                    >
                      End Auction Session
                    </Button>
                  </Stack>
                </Card>
              ) : (
                <Paper withBorder p="xl" radius="md" ta="center" bg="var(--mantine-color-gray-0)">
                  <ThemeIcon size={60} radius="xl" color="blue" variant="light" mb="md">
                    <IconCheck size={30} />
                  </ThemeIcon>
                  <Title order={3} mb="sm">All Players Processed</Title>
                  <Text c="dimmed" mb="xl">
                    There are no more players in the queue. You can now end the auction session.
                  </Text>
                  <Button 
                    size="lg" 
                    color="red" 
                    onClick={endAuction} 
                    loading={ending}
                    leftSection={<IconGavel />}
                  >
                    End Auction
                  </Button>
                </Paper>
              )}

              {/* Upcoming Players */}
              <Card withBorder radius="md" p="md">
                <Group mb="md">
                  <IconClock size={20} color="gray" />
                  <Text fw={600}>Up Next</Text>
                </Group>
                <Stack gap="sm">
                  {upcoming.map((p, i) => (
                    <Group key={p.id} wrap="nowrap">
                      <Badge size="sm" circle color="gray" variant="light">{i + 1}</Badge>
                      <Text size="sm" lineClamp={1}>{p.first_name} {p.last_name}</Text>
                    </Group>
                  ))}
                  {upcoming.length === 0 && <Text size="sm" c="dimmed">No more players</Text>}
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          {/* RIGHT COLUMN: Teams Grid */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="xl">
              <div>
                <Title order={3} mb="md">Active Teams</Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {teams.map((t) => {
                    const isWinning = session?.current_team_id === t.id;
                    return (
                      <Card 
                        key={t.id} 
                        withBorder 
                        shadow={isWinning ? 'md' : 'sm'} 
                        radius="md" 
                        p="md"
                        className={`${classes.teamCard} ${isWinning ? classes.winningTeam : ''}`}
                      >
                        <Group justify="space-between" align="start" mb="sm">
                          <div>
                            <Text fw={700} size="lg">{t.name}</Text>
                            <Group gap={6} mt={4}>
                              <Badge size="sm" variant="dot">
                                {t.captain_name}
                              </Badge>
                            </Group>
                          </div>
                          <Stack gap={0} align="flex-end">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Budget</Text>
                            <Text fw={700} size="xl" c={t.budget < 1000 ? 'red' : 'blue'}>
                              ₹{t.budget}
                            </Text>
                          </Stack>
                        </Group>

                        <Divider my="sm" />

                        <Group align="flex-end" gap="xs">
                          <TextInput
                            placeholder="Bid amount"
                            value={bids[t.id] ?? ''}
                            onChange={(e) =>
                              setBids((b) => ({ ...b, [t.id]: e.target.value }))
                            }
                            style={{ flex: 1 }}
                            type="number"
                            leftSection={<Text size="xs">₹</Text>}
                          />
                          <Button 
                            onClick={() => placeBid(t.id)} 
                            variant={isWinning ? "filled" : "light"}
                            color={isWinning ? "green" : "blue"}
                          >
                            Bid
                          </Button>
                        </Group>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </div>

              {/* Squads & Unsold Tabs/Sections */}
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, md: 8 }}>
                  <Card withBorder radius="md" p="md">
                    <Group justify="space-between" mb="md">
                      <Title order={4}>Squad Formation</Title>
                      <Select 
                        data={teams.map(t => ({ value: t.id, label: t.name }))}
                        value={activeTeam?.id}
                        onChange={setViewTeamId}
                        allowDeselect={false}
                        size="xs"
                        w={200}
                        leftSection={session?.current_team_id === activeTeam?.id && (
                          <ThemeIcon size="xs" color="green" radius="xl">
                            <IconGavel size={10} />
                          </ThemeIcon>
                        )}
                      />
                    </Group>
                    
                    {activeTeam && (
                      <FutsalPitch 
                        teamName={activeTeam.name} 
                        players={activeSquadPlayers} 
                      />
                    )}
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 4 }}>
                  <Card withBorder radius="md" p="md">
                    <Title order={4} mb="md">Unsold Pool</Title>
                    <ScrollArea h={300}>
                      <Stack gap="sm">
                        {unsoldPlayers.length ? (
                          unsoldPlayers.map((p: any) => (
                            <Paper key={p.id} withBorder p="xs" radius="sm">
                              <Text size="sm" fw={500} mb={4}>{p.first_name} {p.last_name}</Text>
                              <select
                                style={{ width: '100%', padding: '4px', fontSize: '12px' }}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    assignUnsoldPlayer(p.id, e.target.value);
                                    e.target.value = ""; 
                                  }
                                }}
                              >
                                <option value="">Assign to...</option>
                                {teams
                                  .sort((a, b) => b.budget - a.budget)
                                  .map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} (₹{t.budget})
                                    </option>
                                  ))}
                              </select>
                            </Paper>
                          ))
                        ) : (
                          <Text size="sm" c="dimmed" ta="center" py="xl">
                            No unsold players
                          </Text>
                        )}
                      </Stack>
                    </ScrollArea>
                  </Card>
                </Grid.Col>
              </Grid>
            </Stack>
          </Grid.Col>
        </Grid>
      )}
    </Container>
  );
}
