CREATE TABLE IF NOT EXISTS "deback-doko_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deback-doko_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "deback-doko_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deback-doko_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "deback-doko_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deback-doko_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account') THEN
		ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;
		DROP TABLE "account" CASCADE;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session') THEN
		ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;
		DROP TABLE "session" CASCADE;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user') THEN
		ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;
		DROP TABLE "user" CASCADE;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification') THEN
		ALTER TABLE "verification" DISABLE ROW LEVEL SECURITY;
		DROP TABLE "verification" CASCADE;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.table_constraints 
		WHERE constraint_name = 'deback-doko_post_createdById_user_id_fk'
	) THEN
		ALTER TABLE "deback-doko_post" DROP CONSTRAINT "deback-doko_post_createdById_user_id_fk";
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints 
		WHERE constraint_name = 'deback-doko_account_user_id_deback-doko_user_id_fk'
	) THEN
		ALTER TABLE "deback-doko_account" ADD CONSTRAINT "deback-doko_account_user_id_deback-doko_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."deback-doko_user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints 
		WHERE constraint_name = 'deback-doko_session_user_id_deback-doko_user_id_fk'
	) THEN
		ALTER TABLE "deback-doko_session" ADD CONSTRAINT "deback-doko_session_user_id_deback-doko_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."deback-doko_user"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.table_constraints 
		WHERE constraint_name = 'deback-doko_post_createdById_deback-doko_user_id_fk'
	) THEN
		ALTER TABLE "deback-doko_post" ADD CONSTRAINT "deback-doko_post_createdById_deback-doko_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."deback-doko_user"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;