import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.AUTH_RESEND_KEY);

export async function sendMagicLinkEmail({
	email,
	url,
}: {
	email: string;
	url: string;
}) {
	try {
		await resend.emails.send({
			from: env.AUTH_RESEND_FROM_ADDRESS,
			to: email,
			subject: "Anmelde-Link",
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h1 style="color: #333;">Anmelde-Link</h1>
					<p style="color: #666; line-height: 1.6;">
						Klicken Sie auf den folgenden Link, um sich anzumelden:
					</p>
					<p style="margin: 30px 0;">
						<a href="${url}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
							Jetzt anmelden
						</a>
					</p>
					<p style="color: #999; font-size: 12px; margin-top: 30px;">
						Oder kopieren Sie diesen Link in Ihren Browser:<br/>
						<code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; word-break: break-all;">${url}</code>
					</p>
					<p style="color: #999; font-size: 12px; margin-top: 20px;">
						Dieser Link ist 5 Minuten gültig.
					</p>
				</div>
			`,
		});
	} catch (error) {
		console.error("Fehler beim Senden der E-Mail:", error);
		throw error;
	}
}



