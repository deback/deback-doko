"use server";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

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

		// Get current user to check for old image
		const currentUser = await db
			.select({ image: user.image })
			.from(user)
			.where(eq(user.id, session.user.id))
			.limit(1);

		const oldImageUrl = currentUser[0]?.image;

		// Update user profile
		await db
			.update(user)
			.set({
				name: validationResult.data.name,
				image: validationResult.data.image ?? null,
				updatedAt: new Date(),
			})
			.where(eq(user.id, session.user.id));

		// Delete old avatar from Blob store if it exists and is different
		if (
			oldImageUrl &&
			oldImageUrl !== validationResult.data.image &&
			oldImageUrl.includes("blob.vercel-storage.com")
		) {
			try {
				await del(oldImageUrl);
			} catch (error) {
				console.error("Fehler beim Loeschen des alten Avatars:", error);
				// Don't fail the whole operation if deletion fails
			}
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

		// Get current user to check for old image
		const currentUser = await db
			.select({ image: user.image })
			.from(user)
			.where(eq(user.id, session.user.id))
			.limit(1);

		const oldImageUrl = currentUser[0]?.image;

		// Update user image
		await db
			.update(user)
			.set({
				image: imageUrl,
				updatedAt: new Date(),
			})
			.where(eq(user.id, session.user.id));

		// Delete old avatar from Blob store if it exists and is different
		if (
			oldImageUrl &&
			oldImageUrl !== imageUrl &&
			oldImageUrl.includes("blob.vercel-storage.com")
		) {
			try {
				await del(oldImageUrl);
			} catch (error) {
				console.error("Fehler beim Loeschen des alten Avatars:", error);
			}
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
