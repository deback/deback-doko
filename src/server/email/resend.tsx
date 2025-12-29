import { Resend } from "resend";
import { env } from "@/env";
import {
	MagicLinkEmailHTML,
	MagicLinkEmailText,
} from "./templates/magic-link";

const resend = new Resend(env.AUTH_RESEND_KEY);

export async function sendMagicLinkEmail({
	email,
	url,
}: {
	email: string;
	url: string;
}) {
	try {
		const html = MagicLinkEmailHTML({ url });
		const text = MagicLinkEmailText({ url });

		await resend.emails.send({
			from: env.AUTH_RESEND_FROM_ADDRESS,
			to: email,
			subject: "Anmelde-Link",
			html,
			text,
		});
	} catch (error) {
		console.error("Fehler beim Senden der E-Mail:", error);
		throw error;
	}
}



