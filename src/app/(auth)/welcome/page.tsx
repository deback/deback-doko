import { CircleCheck } from "lucide-react";
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
					<CardTitle className="text-2xl font-serif">Willkommen!</CardTitle>
					<CardDescription>
						Deine E-Mail-Adresse wurde erfolgreich bestätigt.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-center gap-3 rounded-md border border-green-500/20 bg-green-500/10 p-4">
						<CircleCheck className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
						<p className="text-sm">
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
