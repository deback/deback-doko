import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { calculateRating, formatBalance } from "@/lib/utils";
import { getSession } from "@/server/better-auth/server";

export default async function PlayersPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const usersResult = await getAllUsers();
	const users = usersResult.success ? usersResult.data : [];

	return (
		<main className="mx-auto min-h-screen max-w-3xl overflow-hidden border-x px-4">
			<div className="space-y-6 p-6">
				<h1 className="font-bold text-3xl">Spieler</h1>
				{users.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Keine Spieler gefunden.
					</p>
				) : (
					<div className="space-y-2">
						{users.map((user) => (
							<Link href={`/profile/${user.id}`} key={user.id}>
								<Card className="transition-colors hover:bg-accent">
									<CardContent className="flex items-center gap-4 p-4">
										{user.image ? (
											<Image
												alt={user.name}
												className="rounded-full"
												height={48}
												src={user.image}
												width={48}
											/>
										) : (
											<div className="flex size-12 items-center justify-center rounded-full bg-muted font-bold text-lg">
												{user.name.charAt(0).toUpperCase()}
											</div>
										)}
										<div className="flex-1">
											<p className="font-medium">{user.name}</p>
											<p className="text-muted-foreground text-sm">
												{formatBalance(user.balance)}
											</p>
										</div>
										<StarRating
											rating={calculateRating(
												user.gamesPlayed,
												user.gamesWon,
											)}
										/>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</div>
		</main>
	);
}
