import { z } from "zod";

const playerResultSchema = z.object({
	id: z.string(),
	name: z.string(),
	score: z.number(),
	team: z.enum(["re", "kontra"]),
	won: z.boolean(),
	balanceChange: z.number(),
});

export const gameResultPayloadSchema = z.object({
	gameId: z.string(),
	tableId: z.string(),
	players: z.array(playerResultSchema).min(1),
	tricks: z.unknown().optional(),
	initialHands: z.unknown().optional(),
	announcements: z.unknown().optional(),
	contractType: z.string().optional(),
	schweinereiPlayers: z.unknown().optional(),
});

export type GameResultPayload = z.infer<typeof gameResultPayloadSchema>;
