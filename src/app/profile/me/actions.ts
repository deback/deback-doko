"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

const updateUserNameSchema = z.object({
	name: z
		.string()
		.min(2, "Der Name muss mindestens 2 Zeichen lang sein.")
		.max(50, "Der Name darf maximal 50 Zeichen lang sein."),
});

export async function updateUserName(userId: string, newName: string) {
	try {
		// Validiere den neuen Namen
		const validationResult = updateUserNameSchema.safeParse({ name: newName });
		if (!validationResult.success) {
			return {
				success: false,
				error: validationResult.error.issues[0]?.message ?? "Ungültiger Name",
			};
		}

		// Prüfe, ob der User existiert
		const existingUser = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (existingUser.length === 0) {
			return { success: false, error: "User nicht gefunden" };
		}

		// Aktualisiere den Username
		await db
			.update(user)
			.set({
				name: validationResult.data.name,
				updatedAt: new Date(),
			})
			.where(eq(user.id, userId));

		return { success: true };
	} catch (error) {
		console.error("Fehler beim Aktualisieren des Usernamens:", error);
		return {
			success: false,
			error: "Fehler beim Aktualisieren des Usernamens",
		};
	}
}
