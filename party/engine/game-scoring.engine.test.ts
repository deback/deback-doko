import { describe, expect, it } from "vitest";
import { calculateGamePoints } from "../game-scoring";
import type { ContractType } from "../types";
import { announcements, baseGameState, card, trick } from "./fixtures";

function getLabels(result: ReturnType<typeof calculateGamePoints>): string[] {
	return result.points.map((pointEntry) => pointEntry.label);
}

describe("game scoring engine", () => {
	it("scores a baseline no-announcement win with 121/120 thresholds", () => {
		const state = baseGameState({
			scores: {
				p1: 70,
				p2: 60,
				p3: 50,
				p4: 60,
			},
			completedTricks: [
				trick([{ playerId: "p3", card: card("spades", "9") }], {
					winnerId: "p3",
					points: 0,
				}),
			],
			announcements: announcements(),
		});

		const result = calculateGamePoints(state);
		expect(result.reWon).toBe(true);
		expect(result.kontraWon).toBe(false);
		expect(result.reCardPoints).toBe(130);
		expect(result.kontraCardPoints).toBe(110);
		expect(result.netGamePoints).toBe(1);
		expect(getLabels(result)).toContain("Keine 120");
	});

	it("awards normal-game special points for Gegen die Alten, Fuchs and Karlchen", () => {
		const state = baseGameState({
			scores: {
				p1: 45,
				p2: 55,
				p3: 70,
				p4: 70,
			},
			completedTricks: [
				trick(
					[
						{ playerId: "p1", card: card("diamonds", "ace") },
						{ playerId: "p3", card: card("clubs", "ace") },
					],
					{ winnerId: "p3", points: 21 },
				),
				trick(
					[
						{ playerId: "p4", card: card("clubs", "jack") },
						{ playerId: "p2", card: card("spades", "9") },
					],
					{ winnerId: "p4", points: 2 },
				),
			],
		});

		const result = calculateGamePoints(state);
		expect(result.reWon).toBe(false);
		expect(result.kontraWon).toBe(true);
		expect(getLabels(result)).toContain("Gegen die Alten");
		expect(getLabels(result)).toContain("Fuchs gefangen");
		expect(getLabels(result)).toContain("Karlchen");
	});

	it("applies defensive win when announced target is missed", () => {
		const state = baseGameState({
			scores: {
				p1: 70,
				p2: 70,
				p3: 50,
				p4: 50,
			},
			announcements: announcements({
				re: { announced: true, by: "p1" },
				rePointAnnouncements: [{ type: "no90", by: "p1" }],
			}),
		});

		const result = calculateGamePoints(state);
		expect(result.reWon).toBe(false);
		expect(result.kontraWon).toBe(true);
		expect(getLabels(result)).toContain("Re angesagt");
		expect(getLabels(result)).toContain("Keine 90 angesagt");
	});

	it.each<ContractType>([
		"solo-hearts",
		"solo-queens",
		"solo-aces",
	])("marks %s as solo and suppresses normal-game special points", (contractType) => {
		const state = baseGameState({
			contractType,
			teams: {
				p1: "re",
				p2: "kontra",
				p3: "kontra",
				p4: "kontra",
			},
			scores: {
				p1: 130,
				p2: 40,
				p3: 35,
				p4: 35,
			},
			completedTricks: [
				trick(
					[
						{ playerId: "p2", card: card("diamonds", "ace") },
						{ playerId: "p1", card: card("clubs", "ace") },
					],
					{ winnerId: "p1", points: 21 },
				),
				trick(
					[
						{ playerId: "p1", card: card("clubs", "jack") },
						{ playerId: "p3", card: card("spades", "9") },
					],
					{ winnerId: "p1", points: 2 },
				),
			],
		});

		const result = calculateGamePoints(state);
		const labels = getLabels(result);
		expect(result.isSolo).toBe(true);
		expect(labels).not.toContain("Gegen die Alten");
		expect(labels).not.toContain("Fuchs gefangen");
		expect(labels).not.toContain("Karlchen");
	});

	it("distinguishes Hochzeit with partner from stille Hochzeit", () => {
		const hochzeitWithPartner = calculateGamePoints(
			baseGameState({
				contractType: "hochzeit",
				teams: {
					p1: "re",
					p2: "re",
					p3: "kontra",
					p4: "kontra",
				},
				scores: {
					p1: 60,
					p2: 61,
					p3: 59,
					p4: 60,
				},
			}),
		);

		const stilleHochzeit = calculateGamePoints(
			baseGameState({
				contractType: "hochzeit",
				teams: {
					p1: "re",
					p2: "kontra",
					p3: "kontra",
					p4: "kontra",
				},
				scores: {
					p1: 130,
					p2: 40,
					p3: 35,
					p4: 35,
				},
			}),
		);

		expect(hochzeitWithPartner.isSolo).toBe(false);
		expect(stilleHochzeit.isSolo).toBe(true);
	});
});
