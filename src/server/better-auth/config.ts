import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { env } from "@/env";
import { db } from "@/server/db";
import {
	sendMagicLinkEmail,
	sendPasswordResetEmail,
	sendVerificationEmail,
} from "@/server/email/resend";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			await sendPasswordResetEmail({ email: user.email, url });
		},
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await sendVerificationEmail({ email: user.email, url });
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		callbackURL: "/welcome",
	},
	socialProviders: {
		github: {
			clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
			clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
		},
		google: {
			clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
			clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
		},
	},
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				await sendMagicLinkEmail({ email, url });
			},
		}),
		nextCookies(), // must be last plugin
	],
});

export type Session = typeof auth.$Infer.Session;
