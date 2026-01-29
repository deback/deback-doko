import { redirect } from "next/navigation";
import { getUserById } from "@/app/profile/[userId]/actions";
import { GameClient } from "@/components/game/game-client";
import { getSession } from "@/server/better-auth/server";
import type { Player } from "@/types/tables";

interface GamePageProps {
	params: Promise<{ gameId: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
	const session = await getSession();
	const { gameId } = await params;

	if (!session?.user) {
		redirect("/login");
	}

	const result = await getUserById(session.user.id);

	if (!result.success || !result.data) {
		redirect("/tables");
	}

	const userData = result.data;

	const player: Player = {
		id: userData.id,
		name: userData.name ?? userData.email ?? "Unbekannt",
		email: userData.email,
		image: userData.image,
		gamesPlayed: userData.gamesPlayed,
		gamesWon: userData.gamesWon,
		balance: userData.balance,
	};

	return (
		<main className="min-h-screen">
			<GameClient gameId={gameId} player={player} />
		</main>
	);
}
