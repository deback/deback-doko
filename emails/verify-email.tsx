import { Text } from "@react-email/components";
import CopyCode from "./components/copy-code";
import CTA from "./components/cta";
import EmailContainer from "./components/email-container";

interface VerifyEmailProps {
	url: string;
}

export default function VerifyEmail({ url }: VerifyEmailProps) {
	return (
		<EmailContainer
			preview="E-Mail-Adresse bestätigen"
			title={
				<>
					<span className="whitespace-nowrap">E-Mail-Adresse</span> bestätigen
				</>
			}
		>
			<Text className="text-base">
				Vielen Dank für Deine Registrierung! Bitte bestätige deine{" "}
				<span className="whitespace-nowrap">E-Mail-Adresse</span>, indem Du auf
				den folgenden Link klickst:
			</Text>
			<CTA href={url} text="E-Mail-Adresse bestätigen" />

			<Text className="text-sm mt-8">
				Oder kopiere diesen Link in deinen Browser:
			</Text>
			<CopyCode code={url} />
			<Text className="text-neutral-500 text-sm">
				Falls Du dich nicht registriert hast, kannst du diese E-Mail einfach
				ignorieren.
			</Text>
		</EmailContainer>
	);
}
