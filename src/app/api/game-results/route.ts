import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { gameResultPayloadSchema } from "@/lib/validations/game-results";
import { db } from "@/server/db";
import { gameResult, playerGameResult, user } from "@/server/db/schema";

export async function POST(request: NextRequest) {
	// Verify API secret
	const authHeader = request.headers.get("Authorization");
	const expectedSecret = process.env.PARTYKIT_API_SECRET;

	if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const parsed = gameResultPayloadSchema.safeParse(await request.json());

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid game result payload" },
			{ status: 400 },
		);
	}

	try {
		await db.transaction(async (tx) => {
			// Save game result
			await tx.insert(gameResult).values({
				id: parsed.data.gameId,
				tableId: parsed.data.tableId,
				tricks: parsed.data.tricks,
				initialHands: parsed.data.initialHands,
				announcements: parsed.data.announcements,
				contractType: parsed.data.contractType,
				schweinereiPlayers: parsed.data.schweinereiPlayers,
			});

			// Save player results and update user stats
			for (const player of parsed.data.players) {
				await tx.insert(playerGameResult).values({
					gameResultId: parsed.data.gameId,
					userId: player.id,
					score: player.score,
					team: player.team,
					won: player.won,
					balanceChange: player.balanceChange,
				});

				// Update user balance and game stats
				await tx
					.update(user)
					.set({
						balance: sql`${user.balance} + ${player.balanceChange}`,
						gamesPlayed: sql`${user.gamesPlayed} + 1`,
						gamesWon: player.won ? sql`${user.gamesWon} + 1` : user.gamesWon,
					})
					.where(sql`${user.id} = ${player.id}`);
			}
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to save game results:", error);
		return NextResponse.json(
			{ error: "Failed to save game results" },
			{ status: 500 },
		);
	}
}
