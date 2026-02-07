ALTER TABLE "deback-doko_game_result" ADD COLUMN "tricks" jsonb;--> statement-breakpoint
ALTER TABLE "deback-doko_game_result" ADD COLUMN "initial_hands" jsonb;--> statement-breakpoint
ALTER TABLE "deback-doko_game_result" ADD COLUMN "announcements" jsonb;--> statement-breakpoint
ALTER TABLE "deback-doko_game_result" ADD COLUMN "contract_type" text;--> statement-breakpoint
ALTER TABLE "deback-doko_game_result" ADD COLUMN "schweinerei_players" jsonb;