import {
	Body,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { emailTailwindConfig } from "emails/components/tailwind.config";
import Logo from "./logo";

export default function EmailContainer({
	preview,
	title,
	children,
}: {
	preview: string;
	title: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<Html lang="de">
			<Head />
			<Preview>{preview}</Preview>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-transparent font-sans text-base">
					<Container className="mx-auto max-w-lg">
						<Heading className="font-serif leading-tight">
							Deback Doko - {title}
						</Heading>
						{children}
						<Section>
							<Row>
								<Column className="w-10">
									<div className="size-8 text-white">
										<Logo />
									</div>
								</Column>
								<Column>
									<Text className="text-neutral-500">
										<Link
											className="text-neutral-500 underline"
											href="https://doko.deback.dev"
											target="_blank"
										>
											doko.deback.dev
										</Link>
										, deine Doppelkopf-Plattform
									</Text>
								</Column>
							</Row>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
