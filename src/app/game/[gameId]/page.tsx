import { redirect } from "next/navigation";
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

	// Create player object from session
	const player: Player = {
		id: session.user.id,
		name: session.user.name ?? session.user.email ?? "Unbekannt",
		email: session.user.email,
	};

	return (
		<main className="min-h-screen">
			<GameClient gameId={gameId} player={player} />
		</main>
	);
}
