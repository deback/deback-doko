import { redirect } from "next/navigation";
import { TablesClient } from "@/components/tables/tables-client";
import { getSession } from "@/server/better-auth/server";
import type { Player } from "@/types/tables";

export default async function TablesPage() {
	const session = await getSession();

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
			<TablesClientX player={player} />
		</main>
	);
}
