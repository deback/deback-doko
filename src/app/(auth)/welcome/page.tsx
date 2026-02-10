import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { InfoBox } from "@/components/ui/info-box";

export default function WelcomePage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="font-serif text-2xl">Willkommen!</CardTitle>
					<CardDescription>
						Deine E-Mail-Adresse wurde erfolgreich bestätigt.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<InfoBox>Dein Konto ist jetzt aktiv und du bist angemeldet.</InfoBox>
					<Button asChild className="w-full">
						<Link href="/">Zur Startseite</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
