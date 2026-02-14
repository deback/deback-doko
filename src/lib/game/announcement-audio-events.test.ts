import { describe, expect, it } from "vitest";
import type { GameState, PointAnnouncementType } from "@/types/game";
import { getAnnouncementAudioEvents } from "./announcement-audio-events";

const testPlayers: GameState["players"] = [
	{
		id: "player-1",
		name: "Player 1",
		gamesPlayed: 0,
		gamesWon: 0,
		balance: 0,
	},
	{
		id: "player-2",
		name: "Player 2",
		gamesPlayed: 0,
		gamesWon: 0,
		balance: 0,
	},
];

function createState(
	overrides: Partial<GameState> = {},
	pointAnnouncements: {
		re?: PointAnnouncementType[];
		kontra?: PointAnnouncementType[];
	} = {},
): GameState {
	return {
		id: "game-1",
		tableId: "table-1",
		gameStarted: true,
		gameEnded: false,
		round: 1,
		currentPlayerIndex: 0,
		standingUpPlayers: [],
		players: testPlayers,
		hands: {},
		handCounts: {},
		teams: {},
		scores: {},
		schweinereiPlayers: [],
		currentTrick: {
			cards: [],
			completed: false,
		},
		completedTricks: [],
		trump: "jacks",
		contractType: "normal",
		spectators: [],
		spectatorCount: 0,
		announcements: {
			re: { announced: false },
			kontra: { announced: false },
			rePointAnnouncements: (pointAnnouncements.re ?? []).map((type) => ({
				type,
				by: "player-re",
			})),
			kontraPointAnnouncements: (pointAnnouncements.kontra ?? []).map(
				(type) => ({
					type,
					by: "player-kontra",
				}),
			),
		},
		botControlByPlayer: {},
		presenceByPlayer: {},
		botRoundScope: "current-round",
		...overrides,
	};
}

describe("announcement audio events", () => {
	it("returns no events when no previous state exists (baseline)", () => {
		const nextState = createState({
			announcements: {
				re: { announced: true, by: "player-1" },
				kontra: { announced: false },
				rePointAnnouncements: [],
				kontraPointAnnouncements: [],
			},
		});

		const events = getAnnouncementAudioEvents(null, nextState);

		expect(events).toEqual([]);
	});

	it("detects team announcements exactly once", () => {
		const prevState = createState();
		const nextState = createState({
			announcements: {
				re: { announced: true, by: "player-1" },
				kontra: { announced: true, by: "player-2" },
				rePointAnnouncements: [],
				kontraPointAnnouncements: [],
			},
		});

		const first = getAnnouncementAudioEvents(prevState, nextState);
		const second = getAnnouncementAudioEvents(nextState, nextState);

		expect(first.map((event) => event.text)).toEqual(["Re", "Kontra"]);
		expect(second).toEqual([]);
	});

	it("emits only the highest point announcement when levels are skipped", () => {
		const prevState = createState();
		const nextState = createState(
			{},
			{
				re: ["no90", "no60", "no30"],
			},
		);

		const events = getAnnouncementAudioEvents(prevState, nextState);

		expect(events.map((event) => event.text)).toEqual(["Keine 30"]);
	});

	it("emits stepwise point announcements for incremental escalation", () => {
		const baseline = createState();
		const no90State = createState(
			{},
			{
				re: ["no90"],
			},
		);
		const no60State = createState(
			{},
			{
				re: ["no90", "no60"],
			},
		);

		const firstStep = getAnnouncementAudioEvents(baseline, no90State);
		const secondStep = getAnnouncementAudioEvents(no90State, no60State);

		expect(firstStep.map((event) => event.text)).toEqual(["Keine 90"]);
		expect(secondStep.map((event) => event.text)).toEqual(["Keine 60"]);
	});

	it("detects contract transitions for solos and hochzeit", () => {
		const baseline = createState();
		const soloState = createState({ contractType: "solo-hearts" });
		const hochzeitState = createState({ contractType: "hochzeit" });

		expect(getAnnouncementAudioEvents(baseline, soloState)).toEqual([
			{ type: "contract", text: "Herz-Solo" },
		]);
		expect(getAnnouncementAudioEvents(baseline, hochzeitState)).toEqual([
			{ type: "contract", text: "Hochzeit" },
		]);
	});

	it("detects new gesund/vorbehalt bids in player order", () => {
		const baseline = createState({
			biddingPhase: {
				active: true,
				currentBidderIndex: 0,
				bids: {},
				pendingContracts: {},
			},
		});
		const gesundState = createState({
			biddingPhase: {
				active: true,
				currentBidderIndex: 1,
				bids: {
					"player-1": "gesund",
				},
				pendingContracts: {},
			},
		});
		const vorbehaltState = createState({
			biddingPhase: {
				active: true,
				currentBidderIndex: 0,
				bids: {
					"player-1": "gesund",
					"player-2": "vorbehalt",
				},
				pendingContracts: {},
			},
		});

		expect(getAnnouncementAudioEvents(baseline, gesundState)).toEqual([
			{ type: "bid", text: "Gesund" },
		]);
		expect(getAnnouncementAudioEvents(gesundState, vorbehaltState)).toEqual([
			{ type: "bid", text: "Vorbehalt" },
		]);
	});

	it("does not replay old announcements when state is unchanged", () => {
		const announcedState = createState({
			announcements: {
				re: { announced: true, by: "player-1" },
				kontra: { announced: false },
				rePointAnnouncements: [],
				kontraPointAnnouncements: [],
			},
		});

		const events = getAnnouncementAudioEvents(announcedState, announcedState);

		expect(events).toEqual([]);
	});
});
