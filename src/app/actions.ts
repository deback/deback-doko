"use server";

import { desc } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

export async function getAllUsers() {
	try {
		const result = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				balance: user.balance,
			})
			.from(user)
			.orderBy(desc(user.createdAt));

		return { success: true, data: result };
	} catch (error) {
		console.error("Fehler beim Abrufen der User:", error);
		return {
			success: false,
			error: "Fehler beim Abrufen der User-Daten",
			data: [],
		};
	}
}
