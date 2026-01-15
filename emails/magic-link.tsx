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

interface MagicLinkEmailProps {
	url: string;
}

export default function MagicLinkEmail({ url }: MagicLinkEmailProps) {
	return (
		<Html lang="de">
			<Head />
			<Preview>Ihr Anmelde-Link</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="m-0 bg-transparent p-0 font-sans">
					<Container className="mx-auto max-w-[600px] bg-transparent px-5 py-10">
						<Heading className="mt-0 mb-5 font-bold text-2xl text-foreground">
							Anmelde-Link
						</Heading>
						<Text className="mb-8 text-base text-neutral-600 leading-relaxed">
							Klicken Sie auf den folgenden Link, um sich anzumelden:
						</Text>
						<Section className="my-8">
							<Button
								className="inline-block rounded-md bg-brand px-6 py-3 font-bold text-base text-white no-underline"
								href={url}
							>
								Jetzt anmelden
							</Button>
						</Section>
						<Text className="mt-5 text-neutral-500 text-xs leading-normal">
							Oder kopieren Sie diesen Link in Ihren Browser:
						</Text>
						<Text className="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-neutral-600 text-xs">
							{url}
						</Text>
						<Text className="mt-5 text-neutral-500 text-xs leading-normal">
							Dieser Link ist 5 Minuten gültig.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
