import { redirect } from "next/navigation";
import { getUserById } from "@/app/profile/[userId]/actions";
import { GameClient } from "@/components/game/game-client";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
import { getSession } from "@/server/better-auth/server";
import type { Player } from "@/types/tables";

interface GamePageProps {
	params: Promise<{ gameId: string }>;
	searchParams: Promise<{ invite?: string; tableId?: string }>;
}

export default async function GamePage({
	params,
	searchParams,
}: GamePageProps) {
	const session = await getSession();
	const { gameId } = await params;
	const query = await searchParams;
	const isInvite = query.invite === "1";
	const tableId = query.tableId;

	if (!session?.user) {
		if (isInvite && tableId) {
			const inviteParams = new URLSearchParams({
				invite: "1",
				tableId,
			});
			const returnTo = sanitizeReturnToPath(
				`/game/${gameId}?${inviteParams.toString()}`,
			);
			if (returnTo) {
				redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
			}
		}
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
		<main>
			<GameClient gameId={gameId} player={player} />
		</main>
	);
}
