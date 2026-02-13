import { afterEach, describe, expect, it, vi } from "vitest";
import { baseGameState, card, player } from "../../engine/fixtures";
import type { PointAnnouncementType } from "../../types";
import { decideBotAction } from "./heuristic-policy";
import * as legalView from "./legal-view";

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

function createAnnouncementState(options?: {
	cardCount?: number;
	reAnnounced?: boolean;
	rePointAnnouncements?: PointAnnouncementType[];
}) {
	const cardCount = options?.cardCount ?? 12;
	const gameState = baseGameState({
		players: [player("p1"), player("p2"), player("p3"), player("p4")],
		currentPlayerIndex: 0,
	});

	gameState.hands.p1 = Array.from({ length: cardCount }, (_, index) =>
		card("clubs", "9", `c9-${index}`),
	);
	gameState.announcements.re = options?.reAnnounced
		? { announced: true, by: "p1" }
		: { announced: false };
	gameState.announcements.rePointAnnouncements = (
		options?.rePointAnnouncements ?? []
	).map((type) => ({
		type,
		by: "p1",
	}));

	return gameState;
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

	it("never declares normal while awaiting contract declaration", () => {
		const gameState = createBiddingState();
		gameState.biddingPhase = {
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
		};
		gameState.hands.p1 = [
			card("clubs", "9", "c-9"),
			card("clubs", "10", "c-10"),
			card("clubs", "king", "c-king"),
			card("spades", "9", "s-9"),
			card("spades", "10", "s-10"),
			card("spades", "king", "s-king"),
			card("hearts", "9", "h-9"),
			card("hearts", "10", "h-10"),
			card("hearts", "king", "h-king"),
			card("diamonds", "9", "d-9"),
			card("diamonds", "10", "d-10"),
			card("diamonds", "king", "d-king"),
		];

		const decision = decideBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "declare-contract",
			contract: "solo-clubs",
			reasonCode: "contract.conservative.solo-clubs",
		});
	});
});

describe("bot/heuristic-policy announcements", () => {
	it("uses the stricter Re/Kontra threshold at 86 strength", () => {
		const strengthSpy = vi.spyOn(legalView, "estimateHandStrength");
		const belowThreshold = createAnnouncementState({
			cardCount: 12,
			reAnnounced: false,
		});
		strengthSpy.mockReturnValueOnce(85);

		const belowDecision = decideBotAction(belowThreshold, "p1");
		expect(belowDecision?.type).not.toBe("announce");

		const atThreshold = createAnnouncementState({
			cardCount: 12,
			reAnnounced: false,
		});
		strengthSpy.mockReturnValueOnce(86);

		const atDecision = decideBotAction(atThreshold, "p1");
		expect(atDecision).toEqual({
			type: "announce",
			announcement: "re",
			reasonCode: "announcement.team.safe-threshold",
		});
	});

	it("does not announce point levels at 12/11 cards even with very high strength", () => {
		const strengthSpy = vi
			.spyOn(legalView, "estimateHandStrength")
			.mockReturnValue(200);

		for (const cardCount of [12, 11]) {
			const gameState = createAnnouncementState({
				cardCount,
				reAnnounced: true,
			});
			const decision = decideBotAction(gameState, "p1");
			expect(decision?.type).not.toBe("announce");
		}

		expect(strengthSpy).toHaveBeenCalled();
	});

	it("announces only Keine 90 at 10 cards when threshold is met", () => {
		const gameState = createAnnouncementState({
			cardCount: 10,
			reAnnounced: true,
		});
		vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(110);

		const decision = decideBotAction(gameState, "p1");

		expect(decision).toEqual({
			type: "announce",
			announcement: "no90",
			reasonCode: "announcement.no90.safe-threshold",
		});
	});

	it("does not chain to Keine 60 at 10 cards after Keine 90 already exists", () => {
		const gameState = createAnnouncementState({
			cardCount: 10,
			reAnnounced: true,
			rePointAnnouncements: ["no90"],
		});
		vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(300);

		const decision = decideBotAction(gameState, "p1");

		expect(decision?.type).not.toBe("announce");
	});

	it("advances point announcements strictly by card-count stage (9/8/7)", () => {
		const scenarios: Array<{
			cardCount: number;
			rePointAnnouncements: PointAnnouncementType[];
			strength: number;
			expected: PointAnnouncementType;
		}> = [
			{
				cardCount: 9,
				rePointAnnouncements: ["no90"],
				strength: 122,
				expected: "no60",
			},
			{
				cardCount: 8,
				rePointAnnouncements: ["no90", "no60"],
				strength: 134,
				expected: "no30",
			},
			{
				cardCount: 7,
				rePointAnnouncements: ["no90", "no60", "no30"],
				strength: 146,
				expected: "schwarz",
			},
		];

		for (const scenario of scenarios) {
			const gameState = createAnnouncementState({
				cardCount: scenario.cardCount,
				reAnnounced: true,
				rePointAnnouncements: scenario.rePointAnnouncements,
			});
			vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(
				scenario.strength,
			);

			const decision = decideBotAction(gameState, "p1");

			expect(decision).toEqual({
				type: "announce",
				announcement: scenario.expected,
				reasonCode: `announcement.${scenario.expected}.safe-threshold`,
			});
			vi.restoreAllMocks();
		}
	});
});
