import { render } from "@react-email/components";
import { Resend } from "resend";
import { env } from "@/env";
import MagicLinkEmail from "../../../emails/magic-link";
import PasswordResetEmail from "../../../emails/password-reset";
import VerifyEmail from "../../../emails/verify-email";

const resend = new Resend(env.AUTH_RESEND_KEY);

export async function sendMagicLinkEmail({
	email,
	url,
}: {
	email: string;
	url: string;
}) {
	try {
		const html = await render(MagicLinkEmail({ url }));
		const text = await render(MagicLinkEmail({ url }), { plainText: true });

		await resend.emails.send({
			from: env.AUTH_RESEND_FROM_ADDRESS,
			to: email,
			subject: "Deback Doko - Anmelde-Link",
			html,
			text,
		});
	} catch (error) {
		console.error("Fehler beim Senden der E-Mail:", error);
		throw error;
	}
}

export async function sendPasswordResetEmail({
	email,
	url,
}: {
	email: string;
	url: string;
}) {
	try {
		const html = await render(PasswordResetEmail({ url }));
		const text = await render(PasswordResetEmail({ url }), { plainText: true });

		await resend.emails.send({
			from: env.AUTH_RESEND_FROM_ADDRESS,
			to: email,
			subject: "Passwort zurücksetzen",
			html,
			text,
		});
	} catch (error) {
		console.error("Fehler beim Senden der Passwort-Reset E-Mail:", error);
		throw error;
	}
}

export async function sendVerificationEmail({
	email,
	url,
}: {
	email: string;
	url: string;
}) {
	try {
		const html = await render(VerifyEmail({ url }));
		const text = await render(VerifyEmail({ url }), { plainText: true });

		await resend.emails.send({
			from: env.AUTH_RESEND_FROM_ADDRESS,
			to: email,
			subject: "E-Mail-Adresse bestätigen",
			html,
			text,
		});
	} catch (error) {
		console.error("Fehler beim Senden der Verifizierungs-E-Mail:", error);
		throw error;
	}
}
