import { describe, expect, it } from "vitest";
import { baseGameState, card, player } from "../../engine/fixtures";
import { decideFallbackBotAction } from "./fallback";

function createAwaitingDeclarationState() {
	return baseGameState({
		players: [player("p1"), player("p2"), player("p3"), player("p4")],
		biddingPhase: {
			active: true,
			currentBidderIndex: 1,
			bids: {
				p1: "vorbehalt",
				p2: "gesund",
				p3: "gesund",
				p4: "gesund",
			},
			awaitingContractDeclaration: ["p1"],
			pendingContracts: {},
		},
	});
}

describe("bot/fallback contract declaration", () => {
	it("declares an emergency special contract instead of normal", () => {
		const gameState = createAwaitingDeclarationState();
		gameState.hands.p1 = [
			card("clubs", "9", "c-9"),
			card("clubs", "10", "c-10"),
			card("spades", "9", "s-9"),
			card("spades", "10", "s-10"),
			card("hearts", "9", "h-9"),
			card("hearts", "10", "h-10"),
			card("diamonds", "9", "d-9"),
			card("diamonds", "10", "d-10"),
		];

		const decision = decideFallbackBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "declare-contract",
			contract: "solo-clubs",
			reasonCode: "fallback.contract.emergency-special",
		});
	});

	it("prefers hochzeit when both clubs queens are available", () => {
		const gameState = createAwaitingDeclarationState();
		gameState.hands.p1 = [
			card("clubs", "queen", "cq-1"),
			card("clubs", "queen", "cq-2"),
			card("spades", "ace", "s-ace"),
			card("hearts", "ace", "h-ace"),
		];

		const decision = decideFallbackBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "declare-contract",
			contract: "hochzeit",
			reasonCode: "fallback.contract.emergency-special",
		});
	});
});
