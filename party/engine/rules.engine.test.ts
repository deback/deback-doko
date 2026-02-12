import { describe, expect, it } from "vitest";
import {
	calculateBalanceChange,
	canPlayCard,
	contractToTrumpMode,
	getPlayableCards,
	isSoloGame,
	isTrump,
} from "../../src/lib/game/rules";
import type { ContractType, TrumpMode } from "../types";
import { card, trick } from "./fixtures";

describe("rules engine", () => {
	it("evaluates trump matrix across all supported trump modes", () => {
		const cases: Array<{
			trump: TrumpMode;
			currentCard: ReturnType<typeof card>;
			expected: boolean;
		}> = [
			{ trump: "jacks", currentCard: card("hearts", "10"), expected: true },
			{ trump: "jacks", currentCard: card("diamonds", "9"), expected: true },
			{ trump: "jacks", currentCard: card("spades", "ace"), expected: false },
			{ trump: "hearts", currentCard: card("hearts", "ace"), expected: true },
			{ trump: "hearts", currentCard: card("clubs", "queen"), expected: true },
			{ trump: "hearts", currentCard: card("spades", "10"), expected: false },
			{
				trump: "queens-only",
				currentCard: card("clubs", "queen"),
				expected: true,
			},
			{
				trump: "queens-only",
				currentCard: card("clubs", "jack"),
				expected: false,
			},
			{
				trump: "jacks-only",
				currentCard: card("spades", "jack"),
				expected: true,
			},
			{
				trump: "jacks-only",
				currentCard: card("spades", "queen"),
				expected: false,
			},
			{ trump: "none", currentCard: card("hearts", "10"), expected: false },
		];

		for (const currentCase of cases) {
			expect(isTrump(currentCase.currentCard, currentCase.trump)).toBe(
				currentCase.expected,
			);
		}
	});

	it("returns all cards if no card was played in the current trick", () => {
		const hand = [card("clubs", "ace"), card("spades", "9")];
		const playable = getPlayableCards(
			hand,
			{ cards: [], completed: false },
			"jacks",
		);
		expect(playable).toEqual(hand);
	});

	it("enforces trump following when trump was led", () => {
		const hand = [
			card("spades", "ace", "a"),
			card("diamonds", "9", "b"),
			card("spades", "jack", "c"),
		];
		const currentTrick = trick(
			[{ playerId: "p1", card: card("hearts", "10") }],
			{
				completed: false,
			},
		);

		const playable = getPlayableCards(hand, currentTrick, "jacks");
		expect(playable.map((currentCard) => currentCard.id)).toEqual(["b", "c"]);
	});

	it("enforces suit following for non-trump lead", () => {
		const hand = [
			card("spades", "9", "s9"),
			card("clubs", "queen", "cq"),
			card("hearts", "ace", "ha"),
		];
		const currentTrick = trick(
			[{ playerId: "p1", card: card("spades", "ace") }],
			{
				completed: false,
			},
		);

		const playable = getPlayableCards(hand, currentTrick, "jacks");
		expect(playable.map((currentCard) => currentCard.id)).toEqual(["s9"]);
	});

	it("allows all cards when player cannot follow the led non-trump suit", () => {
		const hand = [
			card("diamonds", "9", "d9"),
			card("clubs", "queen", "cq"),
			card("hearts", "ace", "ha"),
		];
		const currentTrick = trick(
			[{ playerId: "p1", card: card("spades", "ace") }],
			{
				completed: false,
			},
		);

		const playable = getPlayableCards(hand, currentTrick, "jacks");
		expect(playable).toEqual(hand);
	});

	it("checks canPlayCard against playable-card constraints", () => {
		const legalCard = card("spades", "9", "s9");
		const illegalCard = card("hearts", "ace", "ha");
		const hand = [legalCard, illegalCard, card("clubs", "queen", "cq")];
		const currentTrick = trick(
			[{ playerId: "p1", card: card("spades", "ace") }],
			{
				completed: false,
			},
		);

		expect(canPlayCard(legalCard, hand, currentTrick, "jacks")).toBe(true);
		expect(canPlayCard(illegalCard, hand, currentTrick, "jacks")).toBe(false);
	});

	it("maps every contract to the expected trump mode", () => {
		const mapping: Array<{ contract: ContractType; trump: TrumpMode }> = [
			{ contract: "normal", trump: "jacks" },
			{ contract: "hochzeit", trump: "jacks" },
			{ contract: "solo-hearts", trump: "hearts" },
			{ contract: "solo-diamonds", trump: "diamonds" },
			{ contract: "solo-clubs", trump: "clubs" },
			{ contract: "solo-spades", trump: "spades" },
			{ contract: "solo-queens", trump: "queens-only" },
			{ contract: "solo-jacks", trump: "jacks-only" },
			{ contract: "solo-aces", trump: "none" },
		];

		for (const currentMapping of mapping) {
			expect(contractToTrumpMode(currentMapping.contract)).toBe(
				currentMapping.trump,
			);
		}
	});

	it("detects solo game state for solo contracts and stille Hochzeit", () => {
		expect(
			isSoloGame("solo-hearts", {
				p1: "re",
				p2: "kontra",
				p3: "kontra",
				p4: "kontra",
			}),
		).toBe(true);
		expect(
			isSoloGame("hochzeit", {
				p1: "re",
				p2: "re",
				p3: "kontra",
				p4: "kontra",
			}),
		).toBe(false);
		expect(
			isSoloGame("hochzeit", {
				p1: "re",
				p2: "kontra",
				p3: "kontra",
				p4: "kontra",
			}),
		).toBe(true);
	});

	it("calculates balance deltas for normal and solo games", () => {
		expect(calculateBalanceChange(2, "re", false)).toBe(100);
		expect(calculateBalanceChange(2, "kontra", false)).toBe(-100);
		expect(calculateBalanceChange(2, "re", true)).toBe(300);
		expect(calculateBalanceChange(2, "kontra", true)).toBe(-100);
		expect(calculateBalanceChange(-2, "re", true)).toBe(-300);
		expect(calculateBalanceChange(-2, "kontra", true)).toBe(100);
	});
});
