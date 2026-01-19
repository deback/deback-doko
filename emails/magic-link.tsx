import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Tailwind,
	Text,
} from "@react-email/components";
import Logo from "./logo";
import { emailTailwindConfig } from "./tailwind.config";

interface MagicLinkEmailProps {
	url: string;
}

export default function MagicLinkEmail({ url }: MagicLinkEmailProps) {
	return (
		<Html lang="de">
			<Head />
			<Preview>Dein Anmelde-Link</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-white font-sans">
					<Container className="px-3 mx-auto">
						<Heading className="mt-0 mb-5 font-bold text-2xl text-neutral-800">
							Deback Doko - Anmeldung
						</Heading>
						<Link
							className="text-blue-600 text-base underline mb-4 block"
							href={url}
							target="_blank"
						>
							Klicke hier, um dich mit diesem Magic Link anzumelden
						</Link>
						<Text className="text-neutral-600 text-base my-6 mb-3.5">
							Oder kopiere diesen temporären Anmelde-Link:
						</Text>
						<code className="inline-block py-4 px-[4.5%] w-9/10 bg-[#f4f4f4] rounded-md border border-solid border-[#eee] text-[#333]">
							{url}
						</code>
						<Text className="text-[#ababab] text-[14px] mt-3.5 mb-4">
							Falls du dich nicht anmelden wolltest, kannst du diese E-Mail
							einfach ignorieren.
						</Text>
						{/*<Text className="text-[#ababab] text-[14px] mt-3.5 mb-9.5">
							Tipp: Du kannst ein festes Passwort in den Einstellungen unter
							Mein Konto festlegen.
						</Text>*/}
						<div className="w-[32px] h-[32px] text-white">
							<Logo />
						</div>
						<Text className="text-neutral-500 text-sm leading-6 mt-3 mb-6">
							<Link
								className="text-neutral-500 underline"
								href="https://doko.deback.dev"
								target="_blank"
							>
								doko.deback.dev
							</Link>
							, deine Doppelkopf-Plattform
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
