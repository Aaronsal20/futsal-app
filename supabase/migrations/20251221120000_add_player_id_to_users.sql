alter table "public"."users" add column "player_id" bigint references "public"."player"("id");
