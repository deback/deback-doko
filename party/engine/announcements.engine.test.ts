import { describe, expect, it } from "vitest";
import {
	canMakeAnnouncement,
	getAnnouncementLabel,
	getMinCardsForAnnouncement,
} from "../announcements";
import type { AnnouncementType, PointAnnouncementType } from "../types";
import { announcements, baseGameState, card } from "./fixtures";

describe("announcements engine", () => {
	it("returns expected minimum card thresholds", () => {
		const mapping: Array<{ announcement: AnnouncementType; minCards: number }> =
			[
				{ announcement: "re", minCards: 11 },
				{ announcement: "kontra", minCards: 11 },
				{ announcement: "no90", minCards: 10 },
				{ announcement: "no60", minCards: 9 },
				{ announcement: "no30", minCards: 8 },
				{ announcement: "schwarz", minCards: 7 },
			];

		for (const currentCase of mapping) {
			expect(getMinCardsForAnnouncement(currentCase.announcement)).toBe(
				currentCase.minCards,
			);
		}
	});

	it("rejects announcement when player has no assigned team", () => {
		const state = baseGameState({ teams: {} });
		const result = canMakeAnnouncement(state, "p1", "re");
		expect(result.allowed).toBe(false);
	});

	it("rejects announcement when done too late", () => {
		const state = baseGameState({
			hands: {
				p1: Array.from({ length: 10 }, (_, index) =>
					card("clubs", "9", `c-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
		});

		const result = canMakeAnnouncement(state, "p1", "re");
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("Zu spät");
	});

	it("rejects team-mismatched and duplicate team announcements", () => {
		const teamMismatchState = baseGameState({
			hands: {
				p1: Array.from({ length: 11 }, (_, index) =>
					card("clubs", "9", `team-mismatch-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
		});
		expect(canMakeAnnouncement(teamMismatchState, "p1", "kontra").allowed).toBe(
			false,
		);

		const duplicateState = baseGameState({
			hands: {
				p1: Array.from({ length: 11 }, (_, index) =>
					card("hearts", "9", `duplicate-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
			announcements: announcements({ re: { announced: true, by: "p1" } }),
		});
		expect(canMakeAnnouncement(duplicateState, "p1", "re").allowed).toBe(false);
	});

	it("requires initial re/kontra before point announcements", () => {
		const state = baseGameState({
			hands: {
				p1: Array.from({ length: 10 }, (_, index) =>
					card("diamonds", "9", `point-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
			announcements: announcements(),
		});

		const result = canMakeAnnouncement(state, "p1", "no90");
		expect(result.allowed).toBe(false);
	});

	it("enforces skipped-announcement legality rule", () => {
		const invalidSkip = baseGameState({
			hands: {
				p1: Array.from({ length: 9 }, (_, index) =>
					card("spades", "9", `skip-invalid-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
			announcements: announcements({ re: { announced: true, by: "p1" } }),
		});
		expect(canMakeAnnouncement(invalidSkip, "p1", "no60").allowed).toBe(false);

		const validSkip = baseGameState({
			hands: {
				p1: Array.from({ length: 10 }, (_, index) =>
					card("spades", "10", `skip-valid-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
			announcements: announcements({ re: { announced: true, by: "p1" } }),
		});
		expect(canMakeAnnouncement(validSkip, "p1", "no60").allowed).toBe(true);
	});

	it("accepts golden-path announcements for both teams", () => {
		const state = baseGameState({
			hands: {
				p1: Array.from({ length: 10 }, (_, index) =>
					card("clubs", "ace", `gold-re-${index}`),
				),
				p2: [],
				p3: Array.from({ length: 10 }, (_, index) =>
					card("hearts", "ace", `gold-kontra-${index}`),
				),
				p4: [],
			},
			announcements: announcements({
				re: { announced: true, by: "p1" },
				kontra: { announced: true, by: "p3" },
			}),
		});

		expect(canMakeAnnouncement(state, "p1", "no90").allowed).toBe(true);
		expect(canMakeAnnouncement(state, "p3", "no90").allowed).toBe(true);
	});

	it("maps announcement labels", () => {
		const mapping: Array<{ announcement: AnnouncementType; label: string }> = [
			{ announcement: "re", label: "Re" },
			{ announcement: "kontra", label: "Kontra" },
			{ announcement: "no90", label: "Keine 90" },
			{ announcement: "no60", label: "Keine 60" },
			{ announcement: "no30", label: "Keine 30" },
			{ announcement: "schwarz", label: "Schwarz" },
		];

		for (const currentCase of mapping) {
			expect(getAnnouncementLabel(currentCase.announcement)).toBe(
				currentCase.label,
			);
		}
	});

	it("keeps escalating point announcements valid in normal sequence", () => {
		const existingPointAnnouncements: Array<{
			type: PointAnnouncementType;
			by: string;
		}> = [{ type: "no90", by: "p1" }];
		const state = baseGameState({
			hands: {
				p1: Array.from({ length: 9 }, (_, index) =>
					card("diamonds", "10", `seq-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
			announcements: announcements({
				re: { announced: true, by: "p1" },
				rePointAnnouncements: existingPointAnnouncements,
			}),
		});

		expect(canMakeAnnouncement(state, "p1", "no60").allowed).toBe(true);
	});

	it("allows counter announcement with one card less (rule 6.4.4)", () => {
		const state = baseGameState({
			hands: {
				p1: Array.from({ length: 11 }, (_, index) =>
					card("clubs", "9", `counter-re-${index}`),
				),
				p2: [],
				p3: Array.from({ length: 10 }, (_, index) =>
					card("spades", "9", `counter-kontra-${index}`),
				),
				p4: [],
			},
			announcements: announcements({
				re: { announced: true, by: "p1" },
			}),
		});

		expect(canMakeAnnouncement(state, "p3", "kontra").allowed).toBe(true);
	});

	it("blocks counter announcement when one-card-less window is missed", () => {
		const state = baseGameState({
			hands: {
				p1: Array.from({ length: 11 }, (_, index) =>
					card("clubs", "9", `counter-late-re-${index}`),
				),
				p2: [],
				p3: Array.from({ length: 9 }, (_, index) =>
					card("spades", "9", `counter-late-kontra-${index}`),
				),
				p4: [],
			},
			announcements: announcements({
				re: { announced: true, by: "p1" },
			}),
		});

		expect(canMakeAnnouncement(state, "p3", "kontra").allowed).toBe(false);
	});

	it("blocks first Re/Kontra announcement before Hochzeit clarification is resolved", () => {
		const state = baseGameState({
			contractType: "hochzeit",
			hochzeit: {
				active: true,
				seekerPlayerId: "p1",
				clarificationTrickNumber: 3,
			},
			hands: {
				p1: Array.from({ length: 11 }, (_, index) =>
					card("clubs", "queen", `hochzeit-pending-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
		});

		const result = canMakeAnnouncement(state, "p1", "re");
		expect(result.allowed).toBe(false);
		expect(result.reason).toContain("Klärungsstich");
	});

	it("reduces windows by one card when Hochzeit clarification happened in trick 2", () => {
		const state = baseGameState({
			contractType: "hochzeit",
			hochzeit: {
				active: false,
				seekerPlayerId: "p1",
				partnerPlayerId: "p2",
				clarificationTrickNumber: 3,
				resolvedClarificationTrickNumber: 2,
			},
			hands: {
				p1: Array.from({ length: 10 }, (_, index) =>
					card("clubs", "queen", `hochzeit-shift-re-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
		});

		expect(canMakeAnnouncement(state, "p1", "re").allowed).toBe(true);

		state.announcements.re = { announced: true, by: "p1" };
		state.hands.p1 = Array.from({ length: 9 }, (_, index) =>
			card("hearts", "ace", `hochzeit-shift-no90-${index}`),
		);

		expect(canMakeAnnouncement(state, "p1", "no90").allowed).toBe(true);
	});

	it("reduces windows by two cards when Hochzeit clarification happened in trick 3", () => {
		const state = baseGameState({
			contractType: "hochzeit",
			hochzeit: {
				active: false,
				seekerPlayerId: "p1",
				clarificationTrickNumber: 3,
				resolvedClarificationTrickNumber: 3,
			},
			hands: {
				p1: Array.from({ length: 9 }, (_, index) =>
					card("diamonds", "ace", `hochzeit-shift2-re-${index}`),
				),
				p2: [],
				p3: [],
				p4: [],
			},
		});

		expect(canMakeAnnouncement(state, "p1", "re").allowed).toBe(true);
	});
});
