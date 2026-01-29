import { redirect } from "next/navigation";
import { getUserById } from "@/app/profile/[userId]/actions";
import { TablesClient } from "@/components/tables/tables-client";
import { getSession } from "@/server/better-auth/server";
import type { Player } from "@/types/tables";

export default async function TablesPage() {
	const session = await getSession();

	if (!session?.user) {
		redirect("/login");
	}

	const result = await getUserById(session.user.id);

	if (!result.success || !result.data) {
		redirect("/login");
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
			<TablesClient player={player} />
		</main>
	);
}
