import { z } from "zod";
import type { GameState } from "./types";

const playerSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().optional(),
	image: z.string().nullable().optional(),
	gamesPlayed: z.number(),
	gamesWon: z.number(),
	balance: z.number(),
});

const chatAuthorSchema = z.object({
	id: z.string(),
	name: z.string(),
	image: z.string().nullable().optional(),
	role: z.enum(["player", "spectator", "system"]),
});

const chatMessageSchema = z.object({
	id: z.string(),
	tableId: z.string(),
	text: z.string(),
	createdAt: z.number(),
	author: chatAuthorSchema,
});

export const gameEventSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("get-state"),
		playerId: z.string().optional(),
		playerName: z.string().optional(),
		playerImage: z.string().nullable().optional(),
	}),
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
	z.object({
		type: z.literal("toggle-stand-up"),
		playerId: z.string(),
	}),
	z.object({
		type: z.literal("bot-control"),
		action: z.enum(["takeover", "release"]),
		targetPlayerId: z.string(),
	}),
	z.object({
		type: z.literal("update-player-info"),
		playerId: z.string(),
		name: z.string(),
		image: z.string().nullable().optional(),
	}),
	z.object({
		type: z.literal("chat-send"),
		text: z.string(),
	}),
]);

const gameStateSchema = z.custom<GameState>((value) => {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as Partial<GameState>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.tableId === "string" &&
		typeof candidate.botControlByPlayer === "object" &&
		candidate.botControlByPlayer !== null &&
		typeof candidate.presenceByPlayer === "object" &&
		candidate.presenceByPlayer !== null &&
		candidate.botRoundScope === "current-round"
	);
});

export const gameMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("state"),
		state: gameStateSchema,
		isSpectator: z.boolean().optional(),
	}),
	z.object({
		type: z.literal("error"),
		message: z.string(),
	}),
	z.object({
		type: z.literal("game-started"),
		gameId: z.string(),
	}),
	z.object({
		type: z.literal("spectator-count"),
		gameId: z.string(),
		count: z.number(),
	}),
	z.object({
		type: z.literal("redirect-to-lobby"),
		tableId: z.string(),
	}),
	z.object({
		type: z.literal("chat-history"),
		messages: z.array(chatMessageSchema),
	}),
	z.object({
		type: z.literal("chat-message"),
		message: chatMessageSchema,
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
	z.object({
		type: z.literal("update-player-info"),
		playerId: z.string(),
		name: z.string(),
		image: z.string().nullable().optional(),
	}),
]);
