import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { emailTailwindConfig } from "./tailwind.config";

interface VerifyEmailProps {
	url: string;
}

export default function VerifyEmail({ url }: VerifyEmailProps) {
	return (
		<Html lang="de">
			<Head />
			<Preview>E-Mail-Adresse bestätigen</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="m-0 bg-white p-0 font-sans">
					<Container className="mx-auto max-w-[600px] px-5 py-10">
						<Heading className="mt-0 mb-5 font-bold text-2xl text-neutral-800">
							E-Mail-Adresse bestätigen
						</Heading>
						<Text className="mb-8 text-base text-neutral-600 leading-relaxed">
							Vielen Dank für Deine Registrierung! Bitte bestätige deine
							E-Mail-Adresse, indem Du auf den folgenden Link klickst:
						</Text>
						<Section className="my-8">
							<Button
								className="inline-block rounded-md bg-brand px-6 py-3 font-bold text-base text-white no-underline"
								href={url}
							>
								E-Mail bestätigen
							</Button>
						</Section>
						<Text className="mt-5 text-neutral-500 text-xs leading-normal">
							Oder kopiere diesen Link in deinen Browser:
						</Text>
						<Text className="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-neutral-600 text-xs">
							{url}
						</Text>
						<Text className="mt-5 text-neutral-500 text-xs leading-normal">
							Falls Du dich nicht registriert hast, kannst du diese E-Mail
							einfach ignorieren.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
