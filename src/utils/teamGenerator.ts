import { PlayerWithRating as Player } from '../types/player';

export const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Calculate the total rating of a team
const getTeamRating = (team: Player[]) => 
  team.reduce((sum, p) => sum + p.avg_rating, 0);

// Calculate the fitness (imbalance) of a solution. Lower is better.
const calculateImbalance = (teams: Player[][]) => {
  const ratings = teams.map(getTeamRating);
  const max = Math.max(...ratings);
  const min = Math.min(...ratings);
  return max - min;
};

// Genetic Algorithm to find the best balanced teams
export const generateBalancedTeams = (players: Player[]): Player[][] => {
  if (players.length !== 15) {
    throw new Error('Exactly 15 players are required');
  }

  const POPULATION_SIZE = 50;
  const GENERATIONS = 100;
  const TEAMS_COUNT = 3;
  const PLAYERS_PER_TEAM = 5;

  // Initial Population: Random assignments
  let population: Player[][][] = [];
  for (let i = 0; i < POPULATION_SIZE; i++) {
    const shuffled = shuffleArray([...players]);
    const solution: Player[][] = [];
    for (let j = 0; j < TEAMS_COUNT; j++) {
      solution.push(shuffled.slice(j * PLAYERS_PER_TEAM, (j + 1) * PLAYERS_PER_TEAM));
    }
    population.push(solution);
  }

  for (let gen = 0; gen < GENERATIONS; gen++) {
    // Sort by fitness (imbalance)
    population.sort((a, b) => calculateImbalance(a) - calculateImbalance(b));

    // If we found a perfect solution (imbalance < 0.1), stop early
    if (calculateImbalance(population[0]) < 0.05) break;

    // Selection: Keep top 20% (Elitism)
    const survivors = population.slice(0, POPULATION_SIZE * 0.2);
    const nextGen = [...survivors];

    // Crossover & Mutation to fill the rest
    while (nextGen.length < POPULATION_SIZE) {
      // Pick a random survivor as parent
      const parent = survivors[Math.floor(Math.random() * survivors.length)];
      
      // Create a clone
      const child = parent.map(team => [...team]);

      // Mutation: Swap 2 players between 2 random teams
      const teamAIdx = Math.floor(Math.random() * TEAMS_COUNT);
      let teamBIdx = Math.floor(Math.random() * TEAMS_COUNT);
      while (teamBIdx === teamAIdx) teamBIdx = Math.floor(Math.random() * TEAMS_COUNT);

      const playerAIdx = Math.floor(Math.random() * PLAYERS_PER_TEAM);
      const playerBIdx = Math.floor(Math.random() * PLAYERS_PER_TEAM);

      // Swap
      const temp = child[teamAIdx][playerAIdx];
      child[teamAIdx][playerAIdx] = child[teamBIdx][playerBIdx];
      child[teamBIdx][playerBIdx] = temp;

      nextGen.push(child);
    }
    population = nextGen;
  }

  // Return the best solution found
  population.sort((a, b) => calculateImbalance(a) - calculateImbalance(b));
  return population[0];
};
