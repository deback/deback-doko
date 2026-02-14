import { afterEach, describe, expect, it, vi } from "vitest";
import { baseGameState, card, player } from "../../engine/fixtures";
import { decideAnnouncementAction } from "./announcement-policy";
import { decideCardAction } from "./card-policy";
import { decideBotAction } from "./heuristic-policy";

vi.mock("./announcement-policy", async () => {
	const actual = await vi.importActual<typeof import("./announcement-policy")>(
		"./announcement-policy",
	);
	return {
		...actual,
		decideAnnouncementAction: vi.fn(actual.decideAnnouncementAction),
	};
});

vi.mock("./card-policy", async () => {
	const actual =
		await vi.importActual<typeof import("./card-policy")>("./card-policy");
	return {
		...actual,
		decideCardAction: vi.fn(actual.decideCardAction),
	};
});

function createBiddingState() {
	return baseGameState({
		players: [player("p1"), player("p2"), player("p3"), player("p4")],
		currentPlayerIndex: 0,
		biddingPhase: {
			active: true,
			currentBidderIndex: 0,
			bids: {},
			pendingContracts: {},
		},
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("bot/heuristic-policy bidding", () => {
	it("bids gesund when no special contract is available", () => {
		const gameState = createBiddingState();
		gameState.hands.p1 = [
			card("clubs", "ace", "c-ace"),
			card("clubs", "10", "c-10"),
			card("spades", "king", "s-king"),
			card("spades", "9", "s-9"),
			card("hearts", "king", "h-king"),
			card("hearts", "9", "h-9"),
			card("diamonds", "king", "d-king"),
			card("diamonds", "9", "d-9"),
		];

		const decision = decideBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "bid",
			bid: "gesund",
			reasonCode: "bid.default.gesund",
		});
	});

	it("bids vorbehalt when a special contract is available", () => {
		const gameState = createBiddingState();
		gameState.hands.p1 = [
			card("clubs", "queen", "cq-1"),
			card("clubs", "queen", "cq-2"),
			card("spades", "ace", "s-ace"),
			card("spades", "10", "s-10"),
		];

		const decision = decideBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "bid",
			bid: "vorbehalt",
			reasonCode: "bid.conservative.vorbehalt-threshold",
		});
	});
});

describe("bot/heuristic-policy orchestration", () => {
	it("prioritizes announcement decision over card decision", () => {
		const gameState = baseGameState({
			players: [player("p1"), player("p2"), player("p3"), player("p4")],
			currentPlayerIndex: 0,
		});

		const announcementSpy = vi.mocked(decideAnnouncementAction);
		const cardSpy = vi.mocked(decideCardAction);
		announcementSpy.mockReturnValueOnce({
			type: "announce",
			announcement: "re",
			reasonCode: "announcement.team.ultra-conservative",
		});

		const decision = decideBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "announce",
			announcement: "re",
			reasonCode: "announcement.team.ultra-conservative",
		});
		expect(cardSpy).not.toHaveBeenCalled();
	});

	it("falls back to card decision when no announcement is made", () => {
		const gameState = baseGameState({
			players: [player("p1"), player("p2"), player("p3"), player("p4")],
			currentPlayerIndex: 0,
		});
		const announcementSpy = vi.mocked(decideAnnouncementAction);
		const cardSpy = vi.mocked(decideCardAction);
		announcementSpy.mockReturnValueOnce(null);
		cardSpy.mockReturnValueOnce({
			type: "play-card",
			cardId: "c9",
			reasonCode: "play-card.rule.default-low-risk",
		});

		const decision = decideBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "play-card",
			cardId: "c9",
			reasonCode: "play-card.rule.default-low-risk",
		});
		expect(cardSpy).toHaveBeenCalledTimes(1);
	});

	it("returns null when it is not the player's turn", () => {
		const gameState = baseGameState({
			players: [player("p1"), player("p2"), player("p3"), player("p4")],
			currentPlayerIndex: 1,
		});

		const decision = decideBotAction(gameState, "p1");

		expect(decision).toBeNull();
	});
});
