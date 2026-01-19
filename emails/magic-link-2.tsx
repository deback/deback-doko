import {
	Body,
	Container,
	Font,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
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
		<Html>
			<Head>
				<Font
					fallbackFontFamily="Helvetica"
					fontFamily="Poppins"
					fontStyle="normal"
					fontWeight={400}
					webFont={{
						url: "https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrJJfecg.woff2",
						format: "woff2",
					}}
				/>
				<Font
					fallbackFontFamily="Helvetica"
					fontFamily="Poppins"
					fontStyle="normal"
					fontWeight={600}
					webFont={{
						url: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2",
						format: "woff2",
					}}
				/>
				<Font
					fallbackFontFamily="Georgia"
					fontFamily="Libre Baskerville"
					fontStyle="normal"
					fontWeight={400}
					webFont={{
						url: "https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0qNZaxM.woff2",
						format: "woff2",
					}}
				/>
			</Head>
			<Tailwind config={emailTailwindConfig}>
				<Body className="bg-white">
					<Preview>Log dich mit deinem Magic Link ein.</Preview>
					<Container className="mx-auto my-0 pt-5 px-[25px] pb-12 bg-[url('/static/raycast-bg.png')] [background-position:bottom] [background-repeat:no-repeat]">
						<div className="w-[48px] h-[48px] text-white">
							<Logo />
						</div>
						<Heading className="text-[28px] font-bold mt-12 font-serif">
							🪄 Dein Magic Link
						</Heading>
						<Section className="my-6 mx-0">
							<Text className="text-base leading-6.5">
								<Link className="text-[#FF6363]" href={url}>
									👉 Klicke hier, um dich einzuloggen 👈
								</Link>
							</Text>
							<Text className="text-base leading-6.5">
								If you didn't request this, please ignore this email.
							</Text>
						</Section>
						<Text className="text-base leading-6.5">
							Viele Grüße,
							<br />- Dein Deback Doppelkopf Team
						</Text>
						<Hr className="border-[#dddddd] mt-12" />
						<div className="w-[32px] h-[32px] text-white">
							<Logo />
						</div>
						<Text className="text-[#8898aa] text-xs leading-6 ml-1">
							Deback Doppelkopf
						</Text>
						<Text className="text-[#8898aa] text-xs leading-6 ml-1">
							Deback Doppelkopf
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
