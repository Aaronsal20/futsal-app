

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."deduct_budget"("team_id" "uuid", "bid_amount" integer) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update teams
  set budget = budget - bid_amount
  where id = team_id
    and budget >= bid_amount; -- safety: don't go negative
end;
$$;


ALTER FUNCTION "public"."deduct_budget"("team_id" "uuid", "bid_amount" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_players_with_avg_rating"() RETURNS TABLE("id" bigint, "first_name" "text", "last_name" "text", "avg_rating" double precision)
    LANGUAGE "sql"
    AS $$
  select 
    p.id, 
    p.first_name, 
    p.last_name,
    coalesce(avg(r.score), 0) as avg_rating
  from player p
  left join ratings r on r.player_id = p.id
  group by p.id, p.first_name, p.last_name
  order by avg_rating desc;
$$;


ALTER FUNCTION "public"."get_players_with_avg_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_players_with_stats"() RETURNS TABLE("id" bigint, "first_name" "text", "last_name" "text", "avg_rating" numeric, "rating_count" bigint, "min_rating" numeric, "max_rating" numeric)
    LANGUAGE "sql"
    AS $$
  select 
    p.id,
    p.first_name,
    p.last_name,
    avg(r.score) as avg_rating,
    count(r.id) as rating_count,
    min(r.score) as min_rating,
    max(r.score) as max_rating
  from player p
  left join ratings r on p.id = r.player_id
  group by p.id, p.first_name, p.last_name
  order by avg_rating desc nulls last;
$$;


ALTER FUNCTION "public"."get_players_with_stats"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."auction_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_id" "uuid",
    "player_id" bigint,
    "team_id" "uuid",
    "price" integer,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'available'::"text",
    "tournament_id" "uuid",
    CONSTRAINT "auction_players_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'sold'::"text", 'unsold'::"text"])))
);


ALTER TABLE "public"."auction_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auctions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid",
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text",
    "start_time" timestamp without time zone,
    "end_time" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "auctions_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'live'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."auctions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bidding_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_id" "uuid",
    "current_player_id" bigint,
    "current_team_id" "uuid",
    "current_bid" numeric DEFAULT 0,
    "status" "text" DEFAULT 'in_progress'::"text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "shuffled_order" bigint[] DEFAULT '{}'::bigint[],
    "current_index" integer DEFAULT 0,
    CONSTRAINT "bidding_sessions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."bidding_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bids" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bidding_session_id" "uuid",
    "team_id" "uuid",
    "amount" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "auction_id" "uuid",
    "player_id" bigint
);


ALTER TABLE "public"."bids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fixtures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "team1_id" "uuid",
    "team2_id" "uuid",
    "scheduled_time" timestamp with time zone NOT NULL,
    "team1_score" integer DEFAULT 0,
    "team2_score" integer DEFAULT 0,
    "status" "text" DEFAULT 'scheduled'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team1_color" character varying,
    "team2_color" character varying,
    "started_at" timestamp with time zone,
    "round" character varying,
    "winner_team_id" "uuid",
    "loser_team_id" "uuid",
    CONSTRAINT "fixtures_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'live'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."fixtures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "fixture_id" "uuid" NOT NULL,
    "player_id" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "minute" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "tournament_id" "uuid",
    CONSTRAINT "match_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['goal'::"text", 'assist'::"text", 'yellow_card'::"text", 'red_card'::"text"]))),
    CONSTRAINT "match_events_minute_check" CHECK ((("minute" >= 0) AND ("minute" <= 120)))
);


ALTER TABLE "public"."match_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text",
    "avatar_url" "text",
    "position" "text",
    "last_name" "text"
);


ALTER TABLE "public"."player" OWNER TO "postgres";


COMMENT ON TABLE "public"."player" IS 'Players';



ALTER TABLE "public"."player" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."player_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ratings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "player_id" bigint,
    "score" real,
    "rater_id" "uuid" DEFAULT "gen_random_uuid"(),
    "comments" "text"
);


ALTER TABLE "public"."ratings" OWNER TO "postgres";


COMMENT ON TABLE "public"."ratings" IS 'Player ratings';



ALTER TABLE "public"."ratings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ratings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auction_id" "uuid",
    "name" "text" NOT NULL,
    "budget" integer DEFAULT 1000 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "captain_id" bigint,
    "tournament_id" "uuid",
    "color" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournament_meta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tournament_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "text"
);


ALTER TABLE "public"."tournament_meta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tournaments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "best_player_id" bigint,
    "golden_boot_id" bigint,
    "golden_glove_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "winner_team_id" "uuid",
    "knockout_type" "text" DEFAULT 'semi'::"text",
    "number_of_teams" smallint DEFAULT '0'::smallint,
    "location" "text",
    CONSTRAINT "tournaments_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'setup'::"text", 'live'::"text", 'completed'::"text", 'started'::"text"])))
);


ALTER TABLE "public"."tournaments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" character varying,
    "password" character varying,
    "role" "text",
    "phone" character varying
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'App users table';



ALTER TABLE ONLY "public"."auction_players"
    ADD CONSTRAINT "auction_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auctions"
    ADD CONSTRAINT "auctions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bidding_sessions"
    ADD CONSTRAINT "bidding_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fixtures"
    ADD CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player"
    ADD CONSTRAINT "player_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_meta"
    ADD CONSTRAINT "tournament_meta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tournament_meta"
    ADD CONSTRAINT "tournament_meta_tournament_id_key_key" UNIQUE ("tournament_id", "key");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "unique_rater_player" UNIQUE ("player_id", "rater_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auction_players"
    ADD CONSTRAINT "auction_players_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auction_players"
    ADD CONSTRAINT "auction_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."auction_players"
    ADD CONSTRAINT "auction_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."auction_players"
    ADD CONSTRAINT "auction_players_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."auctions"
    ADD CONSTRAINT "auctions_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bidding_sessions"
    ADD CONSTRAINT "bidding_sessions_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bidding_sessions"
    ADD CONSTRAINT "bidding_sessions_current_player_id_fkey" FOREIGN KEY ("current_player_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."bidding_sessions"
    ADD CONSTRAINT "bidding_sessions_current_team_id_fkey" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."bids"
    ADD CONSTRAINT "bids_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."fixtures"
    ADD CONSTRAINT "fixtures_loser_team_id_fkey" FOREIGN KEY ("loser_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."fixtures"
    ADD CONSTRAINT "fixtures_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fixtures"
    ADD CONSTRAINT "fixtures_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fixtures"
    ADD CONSTRAINT "fixtures_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fixtures"
    ADD CONSTRAINT "fixtures_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_fixture_id_fkey" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."match_events"
    ADD CONSTRAINT "match_events_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."ratings"
    ADD CONSTRAINT "ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_best_player_id_fkey" FOREIGN KEY ("best_player_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_golden_boot_id_fkey" FOREIGN KEY ("golden_boot_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_golden_glove_id_fkey" FOREIGN KEY ("golden_glove_id") REFERENCES "public"."player"("id");



ALTER TABLE ONLY "public"."tournaments"
    ADD CONSTRAINT "tournaments_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow public inserts on player" ON "public"."player" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access" ON "public"."player" FOR SELECT USING (true);



CREATE POLICY "Allow select on ratings" ON "public"."ratings" FOR SELECT USING (true);



CREATE POLICY "Allow users to insert their profile" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."player" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."player" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rating insert" ON "public"."ratings" FOR INSERT WITH CHECK (("auth"."uid"() = "rater_id"));



ALTER TABLE "public"."ratings" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bidding_sessions";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."deduct_budget"("team_id" "uuid", "bid_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."deduct_budget"("team_id" "uuid", "bid_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."deduct_budget"("team_id" "uuid", "bid_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_players_with_avg_rating"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_players_with_avg_rating"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_players_with_avg_rating"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_players_with_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_players_with_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_players_with_stats"() TO "service_role";


















GRANT ALL ON TABLE "public"."auction_players" TO "anon";
GRANT ALL ON TABLE "public"."auction_players" TO "authenticated";
GRANT ALL ON TABLE "public"."auction_players" TO "service_role";



GRANT ALL ON TABLE "public"."auctions" TO "anon";
GRANT ALL ON TABLE "public"."auctions" TO "authenticated";
GRANT ALL ON TABLE "public"."auctions" TO "service_role";



GRANT ALL ON TABLE "public"."bidding_sessions" TO "anon";
GRANT ALL ON TABLE "public"."bidding_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."bidding_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."bids" TO "anon";
GRANT ALL ON TABLE "public"."bids" TO "authenticated";
GRANT ALL ON TABLE "public"."bids" TO "service_role";



GRANT ALL ON TABLE "public"."fixtures" TO "anon";
GRANT ALL ON TABLE "public"."fixtures" TO "authenticated";
GRANT ALL ON TABLE "public"."fixtures" TO "service_role";



GRANT ALL ON TABLE "public"."match_events" TO "anon";
GRANT ALL ON TABLE "public"."match_events" TO "authenticated";
GRANT ALL ON TABLE "public"."match_events" TO "service_role";



GRANT ALL ON TABLE "public"."player" TO "anon";
GRANT ALL ON TABLE "public"."player" TO "authenticated";
GRANT ALL ON TABLE "public"."player" TO "service_role";



GRANT ALL ON SEQUENCE "public"."player_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."player_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."player_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ratings" TO "anon";
GRANT ALL ON TABLE "public"."ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."ratings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ratings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ratings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ratings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."tournament_meta" TO "anon";
GRANT ALL ON TABLE "public"."tournament_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."tournament_meta" TO "service_role";



GRANT ALL ON TABLE "public"."tournaments" TO "anon";
GRANT ALL ON TABLE "public"."tournaments" TO "authenticated";
GRANT ALL ON TABLE "public"."tournaments" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























drop extension if exists "pg_net";


