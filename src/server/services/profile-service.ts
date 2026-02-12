import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { notifyPlayerInfoUpdate } from "../../lib/notify-partykit";
import { db } from "../db";
import { user } from "../db/schema";

function shouldDeleteOldAvatar(
	oldImageUrl: string | null | undefined,
	newImageUrl: string | null | undefined,
) {
	return (
		Boolean(oldImageUrl) &&
		oldImageUrl !== newImageUrl &&
		oldImageUrl?.includes("blob.vercel-storage.com")
	);
}

export async function updateProfileService(params: {
	userId: string;
	name: string;
	image?: string | null;
}) {
	try {
		const currentUser = await db
			.select({ image: user.image })
			.from(user)
			.where(eq(user.id, params.userId))
			.limit(1);

		const oldImageUrl = currentUser[0]?.image;

		await db
			.update(user)
			.set({
				name: params.name,
				image: params.image ?? null,
				updatedAt: new Date(),
			})
			.where(eq(user.id, params.userId));

		if (shouldDeleteOldAvatar(oldImageUrl, params.image ?? null)) {
			try {
				await del(oldImageUrl as string);
			} catch (error) {
				console.error("Fehler beim Loeschen des alten Avatars:", error);
			}
		}

		await notifyPlayerInfoUpdate(
			params.userId,
			params.name,
			params.image ?? null,
		);

		return { success: true as const };
	} catch (error) {
		console.error("Fehler beim Aktualisieren des Profils:", error);
		return {
			success: false as const,
			error: "Fehler beim Aktualisieren des Profils",
		};
	}
}

export async function updateUserImageService(params: {
	userId: string;
	image: string | null;
}) {
	try {
		const currentUser = await db
			.select({ image: user.image })
			.from(user)
			.where(eq(user.id, params.userId))
			.limit(1);

		const oldImageUrl = currentUser[0]?.image;

		await db
			.update(user)
			.set({
				image: params.image,
				updatedAt: new Date(),
			})
			.where(eq(user.id, params.userId));

		if (shouldDeleteOldAvatar(oldImageUrl, params.image)) {
			try {
				await del(oldImageUrl as string);
			} catch (error) {
				console.error("Fehler beim Loeschen des alten Avatars:", error);
			}
		}

		return { success: true as const };
	} catch (error) {
		console.error("Fehler beim Aktualisieren des Profilbilds:", error);
		return {
			success: false as const,
			error: "Fehler beim Aktualisieren des Profilbilds",
		};
	}
}

export async function updateUserNameService(params: {
	userId: string;
	name: string;
}) {
	try {
		const existingUser = await db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.id, params.userId))
			.limit(1);

		if (existingUser.length === 0) {
			return { success: false as const, error: "User nicht gefunden" };
		}

		await db
			.update(user)
			.set({
				name: params.name,
				updatedAt: new Date(),
			})
			.where(eq(user.id, params.userId));

		await notifyPlayerInfoUpdate(params.userId, params.name);

		return { success: true as const };
	} catch (error) {
		console.error("Fehler beim Aktualisieren des Usernamens:", error);
		return {
			success: false as const,
			error: "Fehler beim Aktualisieren des Usernamens",
		};
	}
}
