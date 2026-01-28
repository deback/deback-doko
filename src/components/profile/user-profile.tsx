import Image from "next/image";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { calculateRating, formatBalance } from "@/lib/utils";

interface UserProfileProps {
	user: {
		id: string;
		name: string;
		email: string;
		image: string | null;
		balance: number;
		gamesPlayed: number;
		gamesWon: number;
		emailVerified: boolean;
		createdAt: Date;
	};
}

export function UserProfile({ user }: UserProfileProps) {
	// Formatiere das Erstellungsdatum
	const createdAt = new Date(user.createdAt).toLocaleDateString("de-DE", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-4">
					{user.image ? (
						<Image
							alt={user.name}
							className="rounded-full"
							height={80}
							src={user.image}
							width={80}
						/>
					) : (
						<div className="flex size-20 items-center justify-center rounded-full bg-muted font-bold text-2xl">
							{user.name.charAt(0).toUpperCase()}
						</div>
					)}
					<div>
						<CardTitle className="text-2xl">{user.name}</CardTitle>
						<CardDescription>{user.email}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-sm">
						Spielstärke
					</p>
					<StarRating
						rating={calculateRating(user.gamesPlayed, user.gamesWon)}
					/>
				</div>

				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-sm">Statistik</p>
					<p className="text-sm">
						{user.gamesPlayed} Spiele, {user.gamesWon} Siege
						{user.gamesPlayed > 0 && (
							<span className="text-muted-foreground">
								{" "}
								({Math.round((user.gamesWon / user.gamesPlayed) * 100)}%)
							</span>
						)}
					</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-sm">Guthaben</p>
					<p className="text-sm">{formatBalance(user.balance)}</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-sm">
						Email-Verifizierung
					</p>
					<p className="text-sm">
						{user.emailVerified ? (
							<span className="text-emerald-600 dark:text-emerald-400">
								✓ Verifiziert
							</span>
						) : (
							<span className="text-yellow-600 dark:text-yellow-400">
								⚠ Nicht verifiziert
							</span>
						)}
					</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-sm">
						Mitglied seit
					</p>
					<p className="text-sm">{createdAt}</p>
				</div>

				<div className="space-y-2">
					<p className="font-medium text-muted-foreground text-sm">User-ID</p>
					<p className="font-mono text-muted-foreground text-xs">{user.id}</p>
				</div>
			</CardContent>
		</Card>
	);
}
