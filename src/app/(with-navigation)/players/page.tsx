import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/app/actions";
import { StarRating } from "@/components/ui/star-rating";
import { calculateRating, formatBalance } from "@/lib/utils";
import { getSession } from "@/server/better-auth/server";

export default async function PlayersPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const usersResult = await getAllUsers();
	const realUsers = usersResult.success ? usersResult.data : [];
	//const dummyUsers = generateDummyUsers(100);
	const users = [...realUsers];

	return (
		<main className="mx-auto px-4 py-6 space-y-2">
			{users.length === 0 ? (
				<p className="text-muted-foreground text-sm">Keine Spieler gefunden.</p>
			) : (
				users.map((user) => (
					<Link
						className="flex items-center bg-card gap-4 hover:bg-muted rounded-lg px-2 py-2"
						href={`/profile/${user.id}`}
						key={user.id}
					>
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
							<p className="font-medium text-lg truncate">{user.name}</p>
							<p className="text-muted-foreground text-sm">
								{formatBalance(user.balance)}
							</p>
						</div>
						<StarRating
							rating={calculateRating(user.gamesPlayed, user.gamesWon)}
						/>
					</Link>
				))
			)}
		</main>
	);
}
