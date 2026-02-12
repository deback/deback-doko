"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/better-auth/server";
import {
	updateProfileService,
	updateUserImageService,
} from "@/server/services/profile-service";

const updateProfileSchema = z.object({
	name: z
		.string()
		.min(2, "Der Name muss mindestens 2 Zeichen lang sein.")
		.max(50, "Der Name darf maximal 50 Zeichen lang sein."),
	image: z.url().nullable().optional(),
});

export async function updateProfile(data: {
	name: string;
	image?: string | null;
}) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return { success: false, error: "Nicht autorisiert" };
		}

		const validationResult = updateProfileSchema.safeParse(data);
		if (!validationResult.success) {
			return {
				success: false,
				error:
					validationResult.error.issues[0]?.message ?? "Ungueltige Eingabe",
			};
		}

		const result = await updateProfileService({
			userId: session.user.id,
			name: validationResult.data.name,
			image: validationResult.data.image ?? null,
		});
		if (!result.success) {
			return result;
		}

		revalidatePath("/profile/me");
		revalidatePath("/players");
		revalidatePath("/tables");

		return { success: true };
	} catch (error) {
		console.error("Fehler beim Aktualisieren des Profils:", error);
		return {
			success: false,
			error: "Fehler beim Aktualisieren des Profils",
		};
	}
}

export async function updateUserImage(imageUrl: string | null) {
	try {
		const session = await getSession();
		if (!session?.user) {
			return { success: false, error: "Nicht autorisiert" };
		}

		const result = await updateUserImageService({
			userId: session.user.id,
			image: imageUrl,
		});
		if (!result.success) {
			return result;
		}

		revalidatePath("/profile/me");
		revalidatePath("/players");
		revalidatePath("/tables");

		return { success: true };
	} catch (error) {
		console.error("Fehler beim Aktualisieren des Profilbilds:", error);
		return {
			success: false,
			error: "Fehler beim Aktualisieren des Profilbilds",
		};
	}
}
