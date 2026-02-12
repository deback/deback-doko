"use server";

import { getUserByIdService } from "@/server/services/user-service";

export async function getUserById(userId: string) {
	return await getUserByIdService(userId);
}
