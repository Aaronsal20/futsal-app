-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.auction_players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auction_id uuid,
  player_id bigint,
  team_id uuid,
  price integer,
  created_at timestamp without time zone DEFAULT now(),
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'sold'::text, 'unsold'::text])),
  tournament_id uuid,
  CONSTRAINT auction_players_pkey PRIMARY KEY (id),
  CONSTRAINT auction_players_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES public.auctions(id),
  CONSTRAINT auction_players_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id),
  CONSTRAINT auction_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT auction_players_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id)
);
CREATE TABLE public.auctions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tournament_id uuid,
  name text NOT NULL,
  status text DEFAULT 'upcoming'::text CHECK (status = ANY (ARRAY['upcoming'::text, 'live'::text, 'completed'::text])),
  start_time timestamp without time zone,
  end_time timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT auctions_pkey PRIMARY KEY (id),
  CONSTRAINT auctions_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id)
);
CREATE TABLE public.bidding_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auction_id uuid,
  current_player_id bigint,
  current_team_id uuid,
  current_bid numeric DEFAULT 0,
  status text DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'completed'::text])),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  shuffled_order ARRAY DEFAULT '{}'::bigint[],
  current_index integer DEFAULT 0,
  CONSTRAINT bidding_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT bidding_sessions_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES public.auctions(id),
  CONSTRAINT bidding_sessions_current_player_id_fkey FOREIGN KEY (current_player_id) REFERENCES public.player(id),
  CONSTRAINT bidding_sessions_current_team_id_fkey FOREIGN KEY (current_team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.bids (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bidding_session_id uuid,
  team_id uuid,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  auction_id uuid,
  player_id bigint,
  CONSTRAINT bids_pkey PRIMARY KEY (id),
  CONSTRAINT bids_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT bids_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES public.auctions(id),
  CONSTRAINT bids_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id)
);
CREATE TABLE public.fixtures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL,
  team1_id uuid,
  team2_id uuid,
  scheduled_time timestamp with time zone NOT NULL,
  team1_score integer DEFAULT 0,
  team2_score integer DEFAULT 0,
  status text DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'live'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  team1_color character varying,
  team2_color character varying,
  started_at timestamp with time zone,
  round character varying,
  winner_team_id uuid,
  loser_team_id uuid,
  CONSTRAINT fixtures_pkey PRIMARY KEY (id),
  CONSTRAINT fixtures_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id),
  CONSTRAINT fixtures_team1_id_fkey FOREIGN KEY (team1_id) REFERENCES public.teams(id),
  CONSTRAINT fixtures_team2_id_fkey FOREIGN KEY (team2_id) REFERENCES public.teams(id),
  CONSTRAINT fixtures_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id),
  CONSTRAINT fixtures_loser_team_id_fkey FOREIGN KEY (loser_team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.match_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fixture_id uuid NOT NULL,
  player_id integer NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['goal'::text, 'assist'::text, 'yellow_card'::text, 'red_card'::text])),
  minute integer CHECK (minute >= 0 AND minute <= 120),
  created_at timestamp with time zone DEFAULT now(),
  team_id uuid,
  tournament_id uuid,
  CONSTRAINT match_events_pkey PRIMARY KEY (id),
  CONSTRAINT match_events_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES public.fixtures(id),
  CONSTRAINT match_events_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id),
  CONSTRAINT match_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT match_events_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id)
);
CREATE TABLE public.player (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  first_name text,
  avatar_url text,
  position text,
  last_name text,
  CONSTRAINT player_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ratings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  player_id bigint,
  score real,
  rater_id uuid DEFAULT gen_random_uuid(),
  comments text,
  CONSTRAINT ratings_pkey PRIMARY KEY (id),
  CONSTRAINT ratings_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.player(id),
  CONSTRAINT ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auction_id uuid,
  name text NOT NULL,
  budget integer NOT NULL DEFAULT 1000,
  created_at timestamp with time zone DEFAULT now(),
  captain_id bigint,
  tournament_id uuid,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_captain_id_fkey FOREIGN KEY (captain_id) REFERENCES public.player(id),
  CONSTRAINT teams_auction_id_fkey FOREIGN KEY (auction_id) REFERENCES public.auctions(id),
  CONSTRAINT teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id)
);
CREATE TABLE public.tournament_meta (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL,
  key text NOT NULL,
  value text,
  CONSTRAINT tournament_meta_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tournaments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'upcoming'::text CHECK (status = ANY (ARRAY['upcoming'::text, 'setup'::text, 'live'::text, 'completed'::text])),
  start_date date NOT NULL,
  end_date date,
  best_player_id bigint,
  golden_boot_id bigint,
  golden_glove_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  winner_team_id uuid,
  knockout_type text DEFAULT 'semi'::text,
  CONSTRAINT tournaments_pkey PRIMARY KEY (id),
  CONSTRAINT tournaments_best_player_id_fkey FOREIGN KEY (best_player_id) REFERENCES public.player(id),
  CONSTRAINT tournaments_golden_boot_id_fkey FOREIGN KEY (golden_boot_id) REFERENCES public.player(id),
  CONSTRAINT tournaments_golden_glove_id_fkey FOREIGN KEY (golden_glove_id) REFERENCES public.player(id),
  CONSTRAINT tournaments_winner_team_id_fkey FOREIGN KEY (winner_team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  first_name text,
  last_name text,
  email character varying,
  password character varying,
  role text,
  phone character varying,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
