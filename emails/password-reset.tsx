import { Text } from "@react-email/components";
import CopyCode from "./components/copy-code";
import CTA from "./components/cta";
import EmailContainer from "./components/email-container";

interface PasswordResetEmailProps {
	url: string;
}

export default function PasswordResetEmail({ url }: PasswordResetEmailProps) {
	return (
		<EmailContainer
			preview="Passwort zurücksetzen"
			title="Passwort zurücksetzen"
		>
			<Text className="text-base">
				Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf den
				folgenden Link, um ein neues Passwort zu wählen:
			</Text>
			<CTA href={url} text="Passwort zurücksetzen" />
			<Text className="mt-8 text-sm">
				Oder kopier diesen Link in deinen Browser:
			</Text>
			<CopyCode code={url} />
			<Text className="text-neutral-500 text-sm">
				Dieser Link ist 1 Stunde gültig.
			</Text>
			<Text className="text-neutral-500 text-sm">
				Falls Du diese Anfrage nicht gestellt hast, kannst du diese E-Mail
				einfach ignorieren.
			</Text>
		</EmailContainer>
	);
}
