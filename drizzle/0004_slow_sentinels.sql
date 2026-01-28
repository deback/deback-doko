ALTER TABLE "deback-doko_post" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "deback-doko_post" ALTER COLUMN "id" DROP IDENTITY;--> statement-breakpoint
ALTER TABLE "deback-doko_player_game_result" ADD CONSTRAINT "deback-doko_player_game_result_game_result_id_user_id_pk" PRIMARY KEY("game_result_id","user_id");--> statement-breakpoint
ALTER TABLE "deback-doko_player_game_result" DROP COLUMN "id";