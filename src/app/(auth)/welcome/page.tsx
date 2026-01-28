import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SuccessInfo } from "@/components/ui/success-info";

export default function WelcomePage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-serif">Willkommen!</CardTitle>
					<CardDescription>
						Deine E-Mail-Adresse wurde erfolgreich bestätigt.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SuccessInfo>
						Dein Konto ist jetzt aktiv und du bist angemeldet.
					</SuccessInfo>
					<Button asChild className="w-full">
						<Link href="/">Zur Startseite</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
