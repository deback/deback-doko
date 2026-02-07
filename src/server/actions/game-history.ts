"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { gameResult, playerGameResult, user } from "@/server/db/schema";
import type { Announcements, ContractType } from "@/types/game";
import type {
	GameHistoryDetail,
	GameHistorySummary,
	StoredInitialHands,
	StoredTrick,
} from "@/types/game-history";

export async function getGameHistory(
	page = 1,
	pageSize = 20,
): Promise<{
	success: boolean;
	data: GameHistorySummary[];
	total: number;
	error?: string;
}> {
	try {
		const session = await getSession();
		if (!session?.user) {
			return { success: false, data: [], total: 0, error: "Nicht autorisiert" };
		}

		const offset = (page - 1) * pageSize;

		// Get game IDs the current user participated in
		const userGameIds = await db
			.select({ gameResultId: playerGameResult.gameResultId })
			.from(playerGameResult)
			.innerJoin(gameResult, eq(playerGameResult.gameResultId, gameResult.id))
			.where(eq(playerGameResult.userId, session.user.id))
			.orderBy(desc(gameResult.createdAt))
			.limit(pageSize)
			.offset(offset);

		if (userGameIds.length === 0) {
			return { success: true, data: [], total: 0 };
		}

		// Get total count
		const [countResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(playerGameResult)
			.where(eq(playerGameResult.userId, session.user.id));

		const total = Number(countResult?.count ?? 0);

		// Build summaries for each game
		const summaries: GameHistorySummary[] = [];

		for (const { gameResultId } of userGameIds) {
			const [game] = await db
				.select({
					id: gameResult.id,
					createdAt: gameResult.createdAt,
					contractType: gameResult.contractType,
				})
				.from(gameResult)
				.where(eq(gameResult.id, gameResultId))
				.limit(1);

			if (!game) continue;

			const playerResults = await db
				.select({
					userId: playerGameResult.userId,
					userName: user.name,
					userImage: user.image,
					score: playerGameResult.score,
					team: playerGameResult.team,
					won: playerGameResult.won,
					balanceChange: playerGameResult.balanceChange,
				})
				.from(playerGameResult)
				.innerJoin(user, eq(playerGameResult.userId, user.id))
				.where(eq(playerGameResult.gameResultId, gameResultId));

			summaries.push({
				id: game.id,
				createdAt: game.createdAt,
				contractType: game.contractType,
				playerResults: playerResults.map((pr) => ({
					...pr,
					team: pr.team as "re" | "kontra",
				})),
			});
		}

		return { success: true, data: summaries, total };
	} catch (error) {
		console.error("Fehler beim Abrufen der Spielhistorie:", error);
		return {
			success: false,
			data: [],
			total: 0,
			error: "Fehler beim Abrufen der Spielhistorie",
		};
	}
}

export async function getGameDetail(gameId: string): Promise<{
	success: boolean;
	data: GameHistoryDetail | null;
	error?: string;
}> {
	try {
		const session = await getSession();
		if (!session?.user) {
			return { success: false, data: null, error: "Nicht autorisiert" };
		}

		// Verify user participated in this game
		const [participation] = await db
			.select()
			.from(playerGameResult)
			.where(
				and(
					eq(playerGameResult.gameResultId, gameId),
					eq(playerGameResult.userId, session.user.id),
				),
			)
			.limit(1);

		if (!participation) {
			return {
				success: false,
				data: null,
				error: "Kein Zugriff auf dieses Spiel",
			};
		}

		// Fetch game result with JSONB data
		const [game] = await db
			.select()
			.from(gameResult)
			.where(eq(gameResult.id, gameId))
			.limit(1);

		if (!game) {
			return { success: false, data: null, error: "Spiel nicht gefunden" };
		}

		// Fetch all player results with user info
		const playerResults = await db
			.select({
				userId: playerGameResult.userId,
				userName: user.name,
				userImage: user.image,
				score: playerGameResult.score,
				team: playerGameResult.team,
				won: playerGameResult.won,
				balanceChange: playerGameResult.balanceChange,
			})
			.from(playerGameResult)
			.innerJoin(user, eq(playerGameResult.userId, user.id))
			.where(eq(playerGameResult.gameResultId, gameId));

		return {
			success: true,
			data: {
				id: game.id,
				tableId: game.tableId,
				createdAt: game.createdAt,
				tricks: (game.tricks as StoredTrick[]) ?? [],
				initialHands: (game.initialHands as StoredInitialHands) ?? {},
				announcements: (game.announcements as Announcements) ?? null,
				contractType: (game.contractType as ContractType) ?? null,
				schweinereiPlayers: (game.schweinereiPlayers as string[]) ?? [],
				playerResults: playerResults.map((pr) => ({
					...pr,
					team: pr.team as "re" | "kontra",
				})),
			},
		};
	} catch (error) {
		console.error("Fehler beim Abrufen der Spieldetails:", error);
		return {
			success: false,
			data: null,
			error: "Fehler beim Abrufen der Spieldetails",
		};
	}
}
