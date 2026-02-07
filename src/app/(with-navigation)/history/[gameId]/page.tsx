import { notFound, redirect } from "next/navigation";
import { GameReview } from "@/components/history/game-review";
import { getGameDetail } from "@/server/actions/game-history";
import { getSession } from "@/server/better-auth/server";

interface Props {
	params: Promise<{ gameId: string }>;
}

export default async function GameDetailPage({ params }: Props) {
	const session = await getSession();
	if (!session) redirect("/login");

	const { gameId } = await params;
	const result = await getGameDetail(gameId);

	if (!result.success || !result.data) {
		notFound();
	}

	return (
		<main className="mx-auto px-4 py-6">
			<GameReview currentUserId={session.user.id} game={result.data} />
		</main>
	);
}
