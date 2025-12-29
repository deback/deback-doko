interface MagicLinkEmailProps {
	url: string;
}

export function MagicLinkEmailHTML({ url }: MagicLinkEmailProps): string {
	// URL für HTML escapen
	const escapedUrl = url
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

	return `<!DOCTYPE html>
<html lang="de">
	<head>
		<meta charset="utf-8" />
		<meta content="width=device-width, initial-scale=1.0" name="viewport" />
		<title>Anmelde-Link</title>
	</head>
	<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
		<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
			<h1 style="color: #333; margin-top: 0; margin-bottom: 20px;">Anmelde-Link</h1>
			<p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
				Klicken Sie auf den folgenden Link, um sich anzumelden:
			</p>
			<p style="margin: 30px 0;">
				<a href="${escapedUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
					Jetzt anmelden
				</a>
			</p>
			<p style="color: #999; font-size: 12px; margin-top: 30px; line-height: 1.5;">
				Oder kopieren Sie diesen Link in Ihren Browser:<br/>
				<code style="background-color: #f5f5f5; padding: 8px 12px; border-radius: 3px; word-break: break-all; display: block; margin-top: 8px; font-size: 11px;">${escapedUrl}</code>
			</p>
			<p style="color: #999; font-size: 12px; margin-top: 20px; margin-bottom: 0;">
				Dieser Link ist 5 Minuten gültig.
			</p>
		</div>
	</body>
</html>`;
}

export function MagicLinkEmailText({ url }: MagicLinkEmailProps): string {
	return `Anmelde-Link

Klicken Sie auf den folgenden Link, um sich anzumelden:

${url}

Dieser Link ist 5 Minuten gültig.

Falls der Link nicht funktioniert, kopieren Sie die URL oben in Ihren Browser.`;
}
