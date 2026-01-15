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

interface PasswordResetEmailProps {
	url: string;
}

export default function PasswordResetEmail({ url }: PasswordResetEmailProps) {
	return (
		<Html lang="de">
			<Head />
			<Preview>Passwort zurücksetzen</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="m-0 bg-white p-0 font-sans">
					<Container className="mx-auto max-w-[600px] bg-white px-5 py-10">
						<Heading className="mt-0 mb-5 font-bold text-2xl text-neutral-800">
							Passwort zurücksetzen
						</Heading>
						<Text className="mb-8 text-base text-neutral-600 leading-relaxed">
							Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie
							auf den folgenden Link, um ein neues Passwort zu wählen:
						</Text>
						<Section className="my-8">
							<Button
								className="inline-block rounded-md bg-brand px-6 py-3 font-bold text-base text-white no-underline"
								href={url}
							>
								Passwort zurücksetzen
							</Button>
						</Section>
						<Text className="mt-5 text-neutral-500 text-xs leading-normal">
							Oder kopieren Sie diesen Link in Ihren Browser:
						</Text>
						<Text className="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-neutral-600 text-xs">
							{url}
						</Text>
						<Text className="mt-5 text-neutral-500 text-xs leading-normal">
							Dieser Link ist 1 Stunde gültig.
						</Text>
						<Text className="mt-5 text-neutral-500 text-xs leading-normal">
							Falls Sie diese Anfrage nicht gestellt haben, können Sie diese
							E-Mail ignorieren.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
