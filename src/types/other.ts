// Player table (already exists, bigint ID)
export interface Player {
  id: number // bigint in Postgres
  first_name: string
  last_name: string
  created_at: string
}

// Tournament table
export interface Tournament {
  id: string // uuid
  name: string
  status: 'upcoming' | 'live' | 'completed'
  start_date: string
  end_date?: string
  best_player_id?: number // FK to players.id
  golden_boot_id?: number
  golden_glove_id?: number
  winner_team_id?: string // FK to teams.id
  created_at: string
}

// Team table
export interface Team {
  id: string // uuid
  tournament_id: string // FK to tournaments.id
  name: string
  budget: number
  created_at: string
}

// Auction table
export interface Auction {
  id: string // uuid
  tournament_id: string // FK to tournaments.id
  status: 'upcoming' | 'live' | 'completed'
  created_at: string
}

// Auction pick (who bought which player)
export interface AuctionPick {
  id: string // uuid
  auction_id: string // FK to auctions.id
  team_id: string // FK to teams.id
  player_id: number // FK to players.id (bigint)
  price: number
  created_at: string
}
