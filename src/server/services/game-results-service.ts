import { sql } from "drizzle-orm";
import type { GameResultPayload } from "../../lib/validations/game-results";
import { db } from "../db";
import { gameResult, playerGameResult, user } from "../db/schema";

export async function saveGameResultService(payload: GameResultPayload) {
	try {
		await db.transaction(async (tx) => {
			await tx.insert(gameResult).values({
				id: payload.gameId,
				tableId: payload.tableId,
				tricks: payload.tricks,
				initialHands: payload.initialHands,
				announcements: payload.announcements,
				contractType: payload.contractType,
				schweinereiPlayers: payload.schweinereiPlayers,
				gamePoints: payload.gamePoints,
			});

			for (const player of payload.players) {
				await tx.insert(playerGameResult).values({
					gameResultId: payload.gameId,
					userId: player.id,
					score: player.score,
					team: player.team,
					won: player.won,
					balanceChange: player.balanceChange,
					gamePoints: player.gamePoints ?? 0,
				});

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

		return { success: true as const };
	} catch (error) {
		console.error("Failed to save game results:", error);
		return {
			success: false as const,
			error: "Failed to save game results",
		};
	}
}
