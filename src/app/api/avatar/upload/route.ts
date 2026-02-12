import type { HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/server/better-auth/server";
import { processAvatarUpload } from "@/server/services/avatar-upload-service";

export async function POST(request: Request): Promise<NextResponse> {
	const session = await getSession();

	if (!session?.user) {
		return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
	}

	const body = (await request.json()) as HandleUploadBody;

	try {
		const jsonResponse = await processAvatarUpload({
			request,
			body,
		});

		return NextResponse.json(jsonResponse);
	} catch (error) {
		console.error("Avatar upload error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : String(error) },
			{ status: 400 },
		);
	}
}
