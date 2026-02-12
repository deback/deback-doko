import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { gameResultPayloadSchema } from "@/lib/validations/game-results";
import { saveGameResultService } from "@/server/services/game-results-service";

export async function POST(request: NextRequest) {
	// Verify API secret
	const authHeader = request.headers.get("Authorization");

	if (authHeader !== `Bearer ${env.PARTYKIT_API_SECRET}`) {
		console.error("Game results API: unauthorized request");
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const parsed = gameResultPayloadSchema.safeParse(await request.json());

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid game result payload" },
			{ status: 400 },
		);
	}

	const result = await saveGameResultService(parsed.data);
	if (result.success) {
		return NextResponse.json({ success: true });
	}

	return NextResponse.json({ error: result.error }, { status: 500 });
}
