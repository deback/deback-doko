import Image from "next/image";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface UserProfileProps {
	user: {
		id: string;
		name: string;
		email: string;
		image: string | null;
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
							src={user.image}
							alt={user.name}
							width={80}
							height={80}
							className="rounded-full"
						/>
					) : (
						<div className="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-bold">
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
					<p className="text-sm font-medium text-muted-foreground">
						Email-Verifizierung
					</p>
					<p className="text-sm">
						{user.emailVerified ? (
							<span className="text-green-600 dark:text-green-400">
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
					<p className="text-sm font-medium text-muted-foreground">
						Mitglied seit
					</p>
					<p className="text-sm">{createdAt}</p>
				</div>

				<div className="space-y-2">
					<p className="text-sm font-medium text-muted-foreground">
						User-ID
					</p>
					<p className="font-mono text-xs text-muted-foreground">
						{user.id}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

