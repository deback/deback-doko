import { describe, expect, it } from "vitest";
import {
	calculateTrickPoints,
	determineTrickWinner,
	getCardValue,
} from "../trick-scoring";
import { card, trick } from "./fixtures";

describe("trick scoring engine", () => {
	it("returns empty winner for empty tricks", () => {
		expect(
			determineTrickWinner({ cards: [], completed: true }, "jacks", []),
		).toBe("");
	});

	it("lets trump beat the led non-trump suit", () => {
		const currentTrick = trick([
			{ playerId: "p1", card: card("clubs", "ace") },
			{ playerId: "p2", card: card("spades", "10") },
			{ playerId: "p3", card: card("diamonds", "9") },
			{ playerId: "p4", card: card("clubs", "king") },
		]);

		expect(determineTrickWinner(currentTrick, "jacks", [])).toBe("p3");
	});

	it("uses the second hearts-10 rule on the last trick only when hearts-10 is trump", () => {
		const lastTrick = trick([
			{ playerId: "p1", card: card("hearts", "10") },
			{ playerId: "p2", card: card("hearts", "10", "h10-2") },
			{ playerId: "p3", card: card("clubs", "queen") },
			{ playerId: "p4", card: card("spades", "jack") },
		]);

		expect(determineTrickWinner(lastTrick, "jacks", [], true)).toBe("p2");
		expect(determineTrickWinner(lastTrick, "queens-only", [], true)).toBe("p3");
	});

	it("ranks schweinerei diamonds-ace above normal trump order", () => {
		const currentTrick = trick([
			{ playerId: "p1", card: card("hearts", "10") },
			{ playerId: "p2", card: card("diamonds", "ace") },
			{ playerId: "p3", card: card("clubs", "queen") },
		]);

		expect(determineTrickWinner(currentTrick, "jacks", ["p2"])).toBe("p2");
	});

	it("provides stable card ordering for solo-queens and solo-aces contexts", () => {
		const clubsQueen = getCardValue(
			card("clubs", "queen"),
			"hearts",
			"queens-only",
			"p1",
			[],
		);
		const heartsQueen = getCardValue(
			card("hearts", "queen"),
			"hearts",
			"queens-only",
			"p1",
			[],
		);
		expect(clubsQueen).toBeGreaterThan(heartsQueen);

		const aceValue = getCardValue(
			card("hearts", "ace"),
			"hearts",
			"none",
			"p1",
			[],
		);
		const tenValue = getCardValue(
			card("hearts", "10"),
			"hearts",
			"none",
			"p1",
			[],
		);
		expect(aceValue).toBeGreaterThan(tenValue);
	});

	it("applies expected trump values for solo-hearts and normal game", () => {
		expect(
			getCardValue(card("hearts", "ace"), "clubs", "hearts", "p1", []),
		).toBe(850);
		expect(
			getCardValue(card("diamonds", "king"), "clubs", "jacks", "p1", []),
		).toBe(830);
	});

	it("sums trick points through calculateTrickPoints", () => {
		const currentTrick = trick([
			{ playerId: "p1", card: card("hearts", "ace") },
			{ playerId: "p2", card: card("clubs", "10") },
			{ playerId: "p3", card: card("diamonds", "jack") },
		]);

		expect(calculateTrickPoints(currentTrick)).toBe(23);
	});
});
