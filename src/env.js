import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		BETTER_AUTH_URL: z.url(),
		BETTER_AUTH_SECRET:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),
		BETTER_AUTH_GITHUB_CLIENT_ID: z.string(),
		BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string(),
		BETTER_AUTH_GOOGLE_CLIENT_ID: z.string(),
		BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string(),
		DATABASE_URL: z.url(),
		AUTH_RESEND_KEY: z.string(),
		AUTH_RESEND_FROM_ADDRESS: z.email(),
		PARTYKIT_API_SECRET: z.string(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
		NEXT_PUBLIC_PARTYKIT_HOST: z.string().optional(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_GITHUB_CLIENT_ID: process.env.BETTER_AUTH_GITHUB_CLIENT_ID,
		BETTER_AUTH_GITHUB_CLIENT_SECRET:
			process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
		BETTER_AUTH_GOOGLE_CLIENT_ID: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
		BETTER_AUTH_GOOGLE_CLIENT_SECRET:
			process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
		DATABASE_URL: process.env.DATABASE_URL,
		AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY,
		AUTH_RESEND_FROM_ADDRESS: process.env.AUTH_RESEND_FROM_ADDRESS,
		PARTYKIT_API_SECRET: process.env.PARTYKIT_API_SECRET,
		NODE_ENV: process.env.NODE_ENV,

		NEXT_PUBLIC_PARTYKIT_HOST: process.env.NEXT_PUBLIC_PARTYKIT_HOST,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
