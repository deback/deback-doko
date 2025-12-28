import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";

import { env } from "@/env";
import { db } from "@/server/db";
import { sendMagicLinkEmail } from "@/server/email/resend";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg", // or "pg" or "mysql"
	}),
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		github: {
			clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
			clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
		},
		google: { 
            clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID as string, 
            clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET as string, 
        },
	},
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				await sendMagicLinkEmail({ email, url });
			},
		}),
	],
});

export type Session = typeof auth.$Infer.Session;
