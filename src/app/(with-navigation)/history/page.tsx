import { redirect } from "next/navigation";
import { GameHistoryList } from "@/components/history/game-history-list";
import { getGameHistory } from "@/server/actions/game-history";
import { getSession } from "@/server/better-auth/server";

export default async function HistoryPage() {
	const session = await getSession();
	if (!session) redirect("/login");

	const result = await getGameHistory();

	return (
		<main className="mx-auto px-4 py-6 space-y-2">
			<h1 className="mb-4 font-bold text-2xl">Spielhistorie</h1>
			{result.data.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Noch keine Spiele gespielt.
				</p>
			) : (
				<GameHistoryList games={result.data} />
			)}
		</main>
	);
}
