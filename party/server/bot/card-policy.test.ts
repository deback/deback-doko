import { describe, expect, it } from "vitest";
import { baseGameState, card, player } from "../../engine/fixtures";
import { decideCardAction } from "./card-policy";

function createState() {
	return baseGameState({
		players: [player("p1"), player("p2"), player("p3"), player("p4")],
		currentPlayerIndex: 0,
	});
}

describe("bot/card-policy", () => {
	it("does not overtake a partner trick when an alternative exists", () => {
		const gameState = createState();
		gameState.currentTrick.cards = [
			{ playerId: "p2", card: card("clubs", "ace", "c-ace") },
			{ playerId: "p3", card: card("clubs", "10", "c-10") },
		];
		gameState.hands.p1 = [
			card("hearts", "10", "h10"),
			card("spades", "9", "s9"),
		];

		const decision = decideCardAction(gameState, "p1");

		expect(decision).toEqual({
			type: "play-card",
			cardId: "s9",
			reasonCode: "play-card.rule.partner-protect",
		});
	});

	it("avoids dulle lead as kontra when alternatives exist", () => {
		const gameState = createState();
		gameState.teams = {
			p1: "kontra",
			p2: "re",
			p3: "re",
			p4: "kontra",
		};
		gameState.hands.p1 = [
			card("hearts", "10", "h10"),
			card("clubs", "9", "c9"),
			card("spades", "9", "s9"),
		];

		const decision = decideCardAction(gameState, "p1");

		expect(decision?.type).toBe("play-card");
		expect(
			decision && decision.type === "play-card" && decision.cardId,
		).not.toBe("h10");
		expect(decision?.reasonCode).toBe("play-card.rule.avoid-kontra-dulle-lead");
	});

	it("avoids alte on position 2 in a trump trick", () => {
		const gameState = createState();
		gameState.teams = {
			p1: "re",
			p2: "kontra",
			p3: "re",
			p4: "kontra",
		};
		gameState.currentTrick.cards = [
			{ playerId: "p2", card: card("hearts", "10", "lead-h10") },
		];
		gameState.hands.p1 = [
			card("clubs", "queen", "alte"),
			card("diamonds", "9", "d9"),
		];

		const decision = decideCardAction(gameState, "p1");

		expect(decision).toEqual({
			type: "play-card",
			cardId: "d9",
			reasonCode: "play-card.rule.avoid-alte-pos2",
		});
	});

	it("prioritizes single black ace lead over double ace", () => {
		const gameState = createState();
		gameState.hands.p1 = [
			card("spades", "ace", "sa"),
			card("hearts", "ace", "ha1"),
			card("hearts", "ace", "ha2"),
			card("clubs", "9", "c9"),
		];

		const decision = decideCardAction(gameState, "p1");

		expect(decision).toEqual({
			type: "play-card",
			cardId: "sa",
			reasonCode: "play-card.rule.fehl-priority",
		});
	});

	it("does not lead trump from weak trump profile", () => {
		const gameState = createState();
		gameState.hands.p1 = [
			card("diamonds", "9", "d9"),
			card("hearts", "9", "h9"),
			card("spades", "9", "s9"),
		];

		const decision = decideCardAction(gameState, "p1");

		expect(decision?.type).toBe("play-card");
		const played = gameState.hands.p1.find(
			(current) =>
				current.id ===
				(decision && decision.type === "play-card" ? decision.cardId : ""),
		);
		expect(played).toBeDefined();
		expect(played && played.suit === "diamonds").toBe(false);
		expect(decision?.reasonCode).toBe("play-card.rule.fehl-priority");
	});

	it("captures valuable enemy trick with cheapest winner and saves dulle", () => {
		const gameState = createState();
		gameState.teams = {
			p1: "re",
			p2: "kontra",
			p3: "kontra",
			p4: "re",
		};
		gameState.currentTrick.cards = [
			{ playerId: "p2", card: card("clubs", "ace", "c-ace") },
			{ playerId: "p3", card: card("clubs", "10", "c-10") },
		];
		gameState.hands.p1 = [
			card("hearts", "10", "h10"),
			card("clubs", "queen", "cq"),
			card("spades", "9", "s9"),
		];

		const decision = decideCardAction(gameState, "p1");

		expect(decision).toEqual({
			type: "play-card",
			cardId: "cq",
			reasonCode: "play-card.rule.save-dulle",
		});
	});
});
