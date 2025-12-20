import { PlayerWithRating as Player } from '../types/player';

export const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const generateBalancedTeams = (players: Player[]): Player[][] => {
  if (players.length !== 15) {
    throw new Error('Exactly 15 players are required');
  }

  let sorted = [...players].sort((a, b) => b.avg_rating - a.avg_rating);

  // Group similar ratings, shuffle within groups
  const grouped: Player[][] = [];
  let group: Player[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (
      group.length === 0 ||
      Math.abs(sorted[i].avg_rating - group[0].avg_rating) < 0.2
    ) {
      group.push(sorted[i]);
    } else {
      grouped.push(shuffleArray(group));
      group = [sorted[i]];
    }
  }
  if (group.length) grouped.push(shuffleArray(group));

  sorted = grouped.flat();

  const teams: Player[][] = [[], [], []];
  const totals = [0, 0, 0];

  for (const player of sorted) {
    // Assign to team with lowest avg so far
    let bestTeam = 0;
    for (let i = 1; i < 3; i++) {
      if (
        teams[i].length < 5 &&
        (teams[bestTeam].length === 5 || totals[i] < totals[bestTeam])
      ) {
        bestTeam = i;
      }
    }
    teams[bestTeam].push(player);
    totals[bestTeam] += player.avg_rating;
  }

  return teams;
};
