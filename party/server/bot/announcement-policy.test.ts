import { afterEach, describe, expect, it, vi } from "vitest";
import {
	announcements,
	baseGameState,
	card,
	player,
	trick,
} from "../../engine/fixtures";
import { decideAnnouncementAction } from "./announcement-policy";
import * as legalView from "./legal-view";

function createState(cardCount = 12) {
	const gameState = baseGameState({
		players: [player("p1"), player("p2"), player("p3"), player("p4")],
		currentPlayerIndex: 0,
	});
	gameState.hands.p1 = Array.from({ length: cardCount }, (_, index) =>
		card("clubs", "9", `c9-${index}`),
	);
	return gameState;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("bot/announcement-policy", () => {
	it("does not announce outside legal windows even with high strength", () => {
		const gameState = createState(10);
		vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(999);

		const decision = decideAnnouncementAction(gameState, "p1");

		expect(decision).toBeNull();
	});

	it("announces team call only at conservative threshold", () => {
		const gameState = createState(11);
		const strengthSpy = vi.spyOn(legalView, "estimateHandStrength");
		strengthSpy.mockReturnValueOnce(103);

		expect(decideAnnouncementAction(gameState, "p1")).toBeNull();

		strengthSpy.mockReturnValueOnce(104);
		expect(decideAnnouncementAction(gameState, "p1")).toEqual({
			type: "announce",
			announcement: "re",
			reasonCode: "announcement.team.ultra-conservative",
		});
	});

	it("requires excellent strength for counter-announcement", () => {
		const gameState = baseGameState({
			players: [player("p1"), player("p2"), player("p3"), player("p4")],
			currentPlayerIndex: 2,
			announcements: announcements({
				re: { announced: true, by: "p1" },
			}),
		});
		gameState.hands.p3 = Array.from({ length: 10 }, (_, index) =>
			card("spades", "ace", `s-ace-${index}`),
		);

		const strengthSpy = vi.spyOn(legalView, "estimateHandStrength");
		strengthSpy.mockReturnValueOnce(117);
		expect(decideAnnouncementAction(gameState, "p3")).toBeNull();

		strengthSpy.mockReturnValueOnce(118);
		expect(decideAnnouncementAction(gameState, "p3")).toEqual({
			type: "announce",
			announcement: "kontra",
			reasonCode: "announcement.team.counter-excellent",
		});
	});

	it("blocks early pos3/4 team announcement without double dulle", () => {
		const gameState = createState(12);
		gameState.currentTrick.cards = [
			{ playerId: "p2", card: card("clubs", "ace", "c-ace") },
			{ playerId: "p3", card: card("clubs", "10", "c-10") },
		];
		vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(999);

		expect(decideAnnouncementAction(gameState, "p1")).toBeNull();

		gameState.hands.p1 = [
			card("hearts", "10", "h10-a"),
			card("hearts", "10", "h10-b"),
			card("clubs", "queen", "cq-a"),
			card("spades", "queen", "sq-a"),
			card("diamonds", "ace", "da-a"),
			card("diamonds", "10", "d10-a"),
			card("diamonds", "king", "dk-a"),
			card("diamonds", "9", "d9-a"),
			card("spades", "ace", "sa-a"),
			card("hearts", "ace", "ha-a"),
			card("clubs", "9", "c9-a"),
			card("spades", "9", "s9-a"),
		];

		expect(decideAnnouncementAction(gameState, "p1")).toEqual({
			type: "announce",
			announcement: "re",
			reasonCode: "announcement.team.ultra-conservative",
		});
	});

	it("allows earlier team call via 25-eyes first trick signal", () => {
		const gameState = createState(11);
		gameState.completedTricks = [
			trick(
				[
					{ playerId: "p1", card: card("clubs", "ace", "c-ace-1") },
					{ playerId: "p2", card: card("clubs", "10", "c-10-1") },
					{ playerId: "p3", card: card("clubs", "9", "c-9-1") },
					{ playerId: "p4", card: card("clubs", "9", "c-9-2") },
				],
				{ winnerId: "p1", points: 31 },
			),
		];

		vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(96);

		expect(decideAnnouncementAction(gameState, "p1")).toEqual({
			type: "announce",
			announcement: "re",
			reasonCode: "announcement.team.ultra-conservative",
		});
	});

	it("applies safe-partner signal (3 high trumps + ace)", () => {
		const gameState = createState(11);
		gameState.hands.p1 = [
			card("hearts", "10", "h10-a"),
			card("clubs", "queen", "cq-a"),
			card("spades", "queen", "sq-a"),
			card("spades", "ace", "sa-a"),
			card("clubs", "9", "c9-a"),
			card("spades", "9", "s9-a"),
			card("hearts", "9", "h9-a"),
			card("diamonds", "9", "d9-a"),
			card("diamonds", "king", "dk-a"),
			card("diamonds", "ace", "da-a"),
			card("clubs", "king", "ck-a"),
		];
		vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(98);

		expect(decideAnnouncementAction(gameState, "p1")).toEqual({
			type: "announce",
			announcement: "re",
			reasonCode: "announcement.team.ultra-conservative",
		});
	});

	it("never announces deeper levels than no90", () => {
		const gameState = createState(9);
		gameState.announcements.re = { announced: true, by: "p1" };
		gameState.announcements.rePointAnnouncements = [{ type: "no90", by: "p1" }];
		vi.spyOn(legalView, "estimateHandStrength").mockReturnValue(999);

		expect(decideAnnouncementAction(gameState, "p1")).toBeNull();
	});

	it("announces no90 only with ultra-strong profile and secured points", () => {
		const gameState = createState(10);
		gameState.announcements.re = { announced: true, by: "p1" };
		gameState.hands.p1 = [
			card("hearts", "10", "h10-a"),
			card("hearts", "10", "h10-b"),
			card("clubs", "queen", "cq-a"),
			card("clubs", "queen", "cq-b"),
			card("spades", "queen", "sq-a"),
			card("diamonds", "ace", "da-a"),
			card("diamonds", "10", "d10-a"),
			card("diamonds", "king", "dk-a"),
			card("diamonds", "9", "d9-a"),
			card("clubs", "ace", "ca-a"),
		];

		const strengthSpy = vi.spyOn(legalView, "estimateHandStrength");
		strengthSpy.mockReturnValueOnce(150);
		expect(decideAnnouncementAction(gameState, "p1")).toBeNull();

		gameState.completedTricks = [
			trick(
				[
					{ playerId: "p1", card: card("clubs", "ace", "ca-1") },
					{ playerId: "p2", card: card("clubs", "10", "c10-1") },
					{ playerId: "p3", card: card("spades", "ace", "sa-1") },
					{ playerId: "p4", card: card("spades", "10", "s10-1") },
				],
				{ winnerId: "p1", points: 42 },
			),
		];
		strengthSpy.mockReturnValueOnce(136);

		expect(decideAnnouncementAction(gameState, "p1")).toEqual({
			type: "announce",
			announcement: "no90",
			reasonCode: "announcement.no90.ultra-conservative",
		});
	});
});
