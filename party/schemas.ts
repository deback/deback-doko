import { z } from "zod";

const playerSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().optional(),
	image: z.string().nullable().optional(),
	gamesPlayed: z.number(),
	gamesWon: z.number(),
	balance: z.number(),
});

export const gameEventSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("get-state") }),
	z.object({
		type: z.literal("play-card"),
		cardId: z.string(),
		playerId: z.string(),
	}),
	z.object({ type: z.literal("auto-play") }),
	z.object({ type: z.literal("auto-play-all") }),
	z.object({ type: z.literal("reset-game") }),
	z.object({
		type: z.literal("start-game"),
		players: z.array(playerSchema),
		tableId: z.string(),
	}),
	z.object({
		type: z.literal("spectate-game"),
		gameId: z.string(),
		spectatorId: z.string(),
		spectatorName: z.string(),
		spectatorImage: z.string().nullable().optional(),
	}),
	z.object({
		type: z.literal("announce"),
		announcement: z.enum(["re", "kontra", "no90", "no60", "no30", "schwarz"]),
		playerId: z.string(),
	}),
	z.object({
		type: z.literal("bid"),
		playerId: z.string(),
		bid: z.enum(["gesund", "vorbehalt"]),
	}),
	z.object({
		type: z.literal("declare-contract"),
		playerId: z.string(),
		contract: z.enum([
			"normal",
			"hochzeit",
			"solo-clubs",
			"solo-spades",
			"solo-hearts",
			"solo-diamonds",
			"solo-queens",
			"solo-jacks",
			"solo-aces",
		]),
	}),
]);

export const tableEventSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("get-state") }),
	z.object({
		type: z.literal("create-table"),
		name: z.string(),
		player: playerSchema,
	}),
	z.object({
		type: z.literal("join-table"),
		tableId: z.string(),
		player: playerSchema,
	}),
	z.object({
		type: z.literal("leave-table"),
		tableId: z.string(),
		playerId: z.string(),
	}),
	z.object({
		type: z.literal("delete-table"),
		tableId: z.string(),
		playerId: z.string(),
	}),
]);
