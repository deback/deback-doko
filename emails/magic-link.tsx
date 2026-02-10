import { Text } from "@react-email/components";
import CTA from "./components/cta";
import EmailContainer from "./components/email-container";

interface MagicLinkEmailProps {
	url: string;
}

export default function MagicLinkEmail({ url }: MagicLinkEmailProps) {
	return (
		<EmailContainer preview="Dein Anmelde-Link" title="Anmeldung">
			<Text className="text-base">
				Klicke auf den folgenden Link, um dich mit diesem Magic Link anzumelden:
			</Text>
			<CTA href={url} text="Bei Deback Doko anmelden" />
			<Text className="mt-8 text-sm">
				Oder kopiere diesen temporären Anmelde-Link:
			</Text>
			<code className="inline-block w-full rounded-md border border-neutral-200 border-solid bg-neutral-100 px-4 py-2 text-neutral-500 text-sm">
				{url}
			</code>
			<Text className="text-neutral-500 text-sm">
				Falls du dich nicht anmelden wolltest, kannst du diese E-Mail einfach
				ignorieren.
			</Text>
			{/*<Text className="text-[#ababab] text-[14px] mt-3.5 mb-9.5">
							Tipp: Du kannst ein festes Passwort in den Einstellungen unter
							Mein Konto festlegen.
						</Text>*/}
		</EmailContainer>
	);
}
