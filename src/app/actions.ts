"use server";

import { getAllUsersService } from "@/server/services/user-service";

export async function getAllUsers() {
	return await getAllUsersService();
}
