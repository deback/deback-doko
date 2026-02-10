ALTER TABLE "deback-doko_game_result" ADD COLUMN "game_points" jsonb;--> statement-breakpoint
ALTER TABLE "deback-doko_player_game_result" ADD COLUMN "game_points" integer DEFAULT 0 NOT NULL;