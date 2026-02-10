import { env } from "@/env";

/**
 * Notify PartyKit about a player info update via HTTP.
 * First updates the tables-room, then forwards to any active game rooms.
 */
export async function notifyPlayerInfoUpdate(
	playerId: string,
	name: string,
	image?: string | null,
) {
	const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999";
	const protocol = host.startsWith("localhost") ? "http" : "https";
	const baseUrl = `${protocol}://${host}/party`;
	const body = JSON.stringify({
		type: "update-player-info",
		playerId,
		name,
		image,
	});
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${env.PARTYKIT_API_SECRET}`,
	};

	try {
		// Update tables-room and get active game IDs
		const response = await fetch(`${baseUrl}/tables-room`, {
			method: "POST",
			headers,
			body,
		});

		if (!response.ok) return;

		const data = (await response.json()) as { gameIds?: string[] };

		// Forward to active game rooms
		if (data.gameIds?.length) {
			await Promise.allSettled(
				data.gameIds.map((gameId) =>
					fetch(`${baseUrl}/${gameId}`, {
						method: "POST",
						headers,
						body,
					}),
				),
			);
		}
	} catch (error) {
		// Don't fail the profile update if PartyKit notification fails
		console.error("Failed to notify PartyKit about player info update:", error);
	}
}
