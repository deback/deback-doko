"use server";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

export async function getUserById(userId: string) {
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
			return { success: false, error: "User nicht gefunden" };
		}

		return { success: true, data: result[0] };
	} catch (error) {
		console.error("Fehler beim Abrufen des Users:", error);
		return {
			success: false,
			error: "Fehler beim Abrufen der User-Daten",
		};
	}
}
