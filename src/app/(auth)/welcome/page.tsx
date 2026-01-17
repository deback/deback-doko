import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function WelcomePage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">Willkommen!</CardTitle>
					<CardDescription>
						Deine E-Mail-Adresse wurde erfolgreich bestätigt.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md border border-green-500/20 bg-green-500/10 p-4">
						<p className="text-center text-green-600 text-sm dark:text-green-400">
							Dein Konto ist jetzt aktiv und du bist angemeldet.
						</p>
					</div>
					<Button asChild className="w-full">
						<Link href="/">Zur Startseite</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
