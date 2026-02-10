import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/server/better-auth/server";

export async function POST(request: Request): Promise<NextResponse> {
	const session = await getSession();

	if (!session?.user) {
		return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
	}

	const body = (await request.json()) as HandleUploadBody;

	try {
		const jsonResponse = await handleUpload({
			body,
			request,
			onBeforeGenerateToken: async (_pathname) => {
				// User is already authenticated above
				return {
					allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
					maximumSizeInBytes: 5 * 1024 * 1024, // 5MB
					addRandomSuffix: true,
				};
			},
			onUploadCompleted: async ({ blob }) => {
				// This callback won't work on localhost
				// The actual profile update is done via server action after upload
				console.log("Avatar upload completed:", blob.url);
			},
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
