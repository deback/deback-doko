"use server";

import { z } from "zod";
import { updateUserNameService } from "@/server/services/profile-service";

const updateUserNameSchema = z.object({
	name: z
		.string()
		.min(2, "Der Name muss mindestens 2 Zeichen lang sein.")
		.max(50, "Der Name darf maximal 50 Zeichen lang sein."),
});

export async function updateUserName(userId: string, newName: string) {
	try {
		const validationResult = updateUserNameSchema.safeParse({ name: newName });
		if (!validationResult.success) {
			return {
				success: false,
				error: validationResult.error.issues[0]?.message ?? "Ungültiger Name",
			};
		}

		return await updateUserNameService({
			userId,
			name: validationResult.data.name,
		});
	} catch (error) {
		console.error("Fehler beim Aktualisieren des Usernamens:", error);
		return {
			success: false,
			error: "Fehler beim Aktualisieren des Usernamens",
		};
	}
}
