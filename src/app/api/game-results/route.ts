import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { gameResult, playerGameResult, user } from "@/server/db/schema";

interface PlayerResult {
	id: string;
	name: string;
	score: number;
	team: "re" | "kontra";
	won: boolean;
	balanceChange: number;
}

interface GameResultPayload {
	gameId: string;
	tableId: string;
	players: PlayerResult[];
}

export async function POST(request: NextRequest) {
	// Verify API secret
	const authHeader = request.headers.get("Authorization");
	const expectedSecret = process.env.PARTYKIT_API_SECRET;

	if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body: GameResultPayload = await request.json();

		// Save game result
		await db.insert(gameResult).values({
			id: body.gameId,
			tableId: body.tableId,
		});

		// Save player results and update user stats
		for (const player of body.players) {
			await db.insert(playerGameResult).values({
				gameResultId: body.gameId,
				userId: player.id,
				score: player.score,
				team: player.team,
				won: player.won,
				balanceChange: player.balanceChange,
			});

			// Update user balance and game stats
			await db
				.update(user)
				.set({
					balance: sql`${user.balance} + ${player.balanceChange}`,
					gamesPlayed: sql`${user.gamesPlayed} + 1`,
					gamesWon: player.won ? sql`${user.gamesWon} + 1` : user.gamesWon,
				})
				.where(sql`${user.id} = ${player.id}`);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to save game results:", error);
		return NextResponse.json(
			{ error: "Failed to save game results" },
			{ status: 500 },
		);
	}
}
