import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
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
		<main className="mx-auto space-y-2 px-4 py-6">
			{users.length === 0 ? (
				<p className="text-muted-foreground text-sm">Keine Spieler gefunden.</p>
			) : (
				users.map((user) => (
					<Link
						className="flex items-center gap-4 rounded-lg bg-card px-2 py-2 hover:bg-muted"
						href={`/profile/${user.id}`}
						key={user.id}
					>
						<Avatar
							alt={user.name}
							fallback={user.name.charAt(0).toUpperCase()}
							size="lg"
							src={user.image}
						/>
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-lg">{user.name}</p>
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
