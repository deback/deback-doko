import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { user } from "../db/schema";

export async function getAllUsersService() {
	try {
		const result = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				balance: user.balance,
				gamesPlayed: user.gamesPlayed,
				gamesWon: user.gamesWon,
			})
			.from(user)
			.orderBy(desc(user.createdAt));

		return { success: true as const, data: result };
	} catch (error) {
		console.error("Fehler beim Abrufen der User:", error);
		return {
			success: false as const,
			error: "Fehler beim Abrufen der User-Daten",
			data: [],
		};
	}
}

export async function getUserByIdService(userId: string) {
	try {
		const result = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				balance: user.balance,
				gamesPlayed: user.gamesPlayed,
				gamesWon: user.gamesWon,
				emailVerified: user.emailVerified,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (result.length === 0) {
			return { success: false as const, error: "User nicht gefunden" };
		}

		return { success: true as const, data: result[0] };
	} catch (error) {
		console.error("Fehler beim Abrufen des Users:", error);
		return {
			success: false as const,
			error: "Fehler beim Abrufen der User-Daten",
		};
	}
}
