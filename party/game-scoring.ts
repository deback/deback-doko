import type {
	GamePointEntry,
	GamePointsResult,
	GameState,
	PointAnnouncementType,
} from "./types";

/**
 * Berechnet die Spielpunkte nach DDV-Turnierregeln (Abschnitt 7)
 * Jeder Spielpunkt entspricht 0,50$ Einsatz
 */
export function calculateGamePoints(gameState: GameState): GamePointsResult {
	const points: GamePointEntry[] = [];
	const isSolo =
		gameState.contractType !== "normal" &&
		gameState.contractType !== "hochzeit";

	// Kartenpunkte pro Team berechnen
	let reCardPoints = 0;
	let kontraCardPoints = 0;
	for (const player of gameState.players) {
		const score = gameState.scores[player.id] || 0;
		if (gameState.teams[player.id] === "re") {
			reCardPoints += score;
		} else {
			kontraCardPoints += score;
		}
	}

	// Stiche pro Team zählen
	let reTricks = 0;
	let kontraTricks = 0;
	for (const trick of gameState.completedTricks) {
		if (trick.winnerId && gameState.teams[trick.winnerId] === "re") {
			reTricks++;
		} else {
			kontraTricks++;
		}
	}

	// Ansagen ermitteln
	const { announcements } = gameState;
	const reAnnounced = announcements.re.announced;
	const kontraAnnounced = announcements.kontra.announced;
	const rePointAnnouncements = announcements.rePointAnnouncements.map(
		(a) => a.type,
	);
	const kontraPointAnnouncements = announcements.kontraPointAnnouncements.map(
		(a) => a.type,
	);

	// Höchste Ansage pro Team bestimmen
	const reHighest = getHighestAnnouncement(rePointAnnouncements);
	const kontraHighest = getHighestAnnouncement(kontraPointAnnouncements);

	// === 7.1 Gewinnbedingungen ===
	const { reWon, kontraWon } = determineWinner(
		reCardPoints,
		kontraCardPoints,
		reTricks,
		kontraTricks,
		reAnnounced,
		kontraAnnounced,
		reHighest,
		kontraHighest,
	);

	// === 7.2.2 Spielpunkte ===

	// (a) Gewonnen + Gewinnstufen
	if (reWon || kontraWon) {
		const winnerTeam = reWon ? "re" : "kontra";
		const loserCardPoints = reWon ? kontraCardPoints : reCardPoints;
		const loserTricks = reWon ? kontraTricks : reTricks;

		points.push({ label: "Gewonnen", team: winnerTeam, value: 1 });

		if (loserCardPoints < 90) {
			points.push({ label: "Keine 90", team: winnerTeam, value: 1 });
		}
		if (loserCardPoints < 60) {
			points.push({ label: "Keine 60", team: winnerTeam, value: 1 });
		}
		if (loserCardPoints < 30) {
			points.push({ label: "Keine 30", team: winnerTeam, value: 1 });
		}
		if (loserTricks === 0) {
			points.push({ label: "Schwarz", team: winnerTeam, value: 1 });
		}
	}

	// (b) Re/Kontra Ansagen (immer, egal wer gewinnt)
	if (reAnnounced) {
		points.push({
			label: "Re angesagt",
			team: reWon ? "re" : "kontra",
			value: 2,
		});
	}
	if (kontraAnnounced) {
		points.push({
			label: "Kontra angesagt",
			team: kontraWon ? "kontra" : "re",
			value: 2,
		});
	}

	// (c) Re-Punktansagen
	for (const ann of rePointAnnouncements) {
		points.push({
			label: `${announcementLabel(ann)} angesagt`,
			team: reWon ? "re" : "kontra",
			value: 1,
		});
	}

	// (d) Kontra-Punktansagen
	for (const ann of kontraPointAnnouncements) {
		points.push({
			label: `${announcementLabel(ann)} angesagt`,
			team: kontraWon ? "kontra" : "re",
			value: 1,
		});
	}

	// (e) Re-Team erzielt Punkte gegen Kontra-Ansagen
	if (kontraPointAnnouncements.includes("no90") && reCardPoints >= 120) {
		points.push({
			label: "120 gegen Keine 90",
			team: "re",
			value: 1,
		});
	}
	if (kontraPointAnnouncements.includes("no60") && reCardPoints >= 90) {
		points.push({
			label: "90 gegen Keine 60",
			team: "re",
			value: 1,
		});
	}
	if (kontraPointAnnouncements.includes("no30") && reCardPoints >= 60) {
		points.push({
			label: "60 gegen Keine 30",
			team: "re",
			value: 1,
		});
	}
	if (kontraPointAnnouncements.includes("schwarz") && reTricks > 0) {
		points.push({
			label: "Stich gegen Schwarz",
			team: "re",
			value: 1,
		});
	}

	// (f) Kontra-Team erzielt Punkte gegen Re-Ansagen
	if (rePointAnnouncements.includes("no90") && kontraCardPoints >= 120) {
		points.push({
			label: "120 gegen Keine 90",
			team: "kontra",
			value: 1,
		});
	}
	if (rePointAnnouncements.includes("no60") && kontraCardPoints >= 90) {
		points.push({
			label: "90 gegen Keine 60",
			team: "kontra",
			value: 1,
		});
	}
	if (rePointAnnouncements.includes("no30") && kontraCardPoints >= 60) {
		points.push({
			label: "60 gegen Keine 30",
			team: "kontra",
			value: 1,
		});
	}
	if (rePointAnnouncements.includes("schwarz") && kontraTricks > 0) {
		points.push({
			label: "Stich gegen Schwarz",
			team: "kontra",
			value: 1,
		});
	}

	// === 7.2.3 Sonderpunkte (nur im Normalspiel, nicht bei Solo) ===
	if (!isSolo) {
		// Gegen die Alten (Kontra gewinnt)
		if (kontraWon) {
			points.push({
				label: "Gegen die Alten",
				team: "kontra",
				value: 1,
			});
		}

		// Doppelkopf (Stich mit >= 40 Kartenpunkten)
		for (const trick of gameState.completedTricks) {
			const trickPoints = trick.points ?? 0;
			if (trickPoints >= 40 && trick.winnerId) {
				const winnerTeam = gameState.teams[trick.winnerId] || "kontra";
				points.push({
					label: "Doppelkopf",
					team: winnerTeam,
					value: 1,
				});
			}
		}

		// Fuchs (Karo-Ass des Gegners gefangen)
		for (const trick of gameState.completedTricks) {
			if (!trick.winnerId) continue;
			const winnerTeam = gameState.teams[trick.winnerId] || "kontra";
			for (const cardEntry of trick.cards) {
				if (
					cardEntry.card.suit === "diamonds" &&
					cardEntry.card.rank === "ace"
				) {
					const cardTeam = gameState.teams[cardEntry.playerId] || "kontra";
					// Fuchs: Karo-Ass wurde vom gegnerischen Team gefangen
					if (cardTeam !== winnerTeam) {
						points.push({
							label: "Fuchs gefangen",
							team: winnerTeam,
							value: 1,
						});
					}
				}
			}
		}

		// Karlchen (Letzter Stich mit Kreuz-Bube gewonnen)
		const lastTrick =
			gameState.completedTricks[gameState.completedTricks.length - 1];
		if (lastTrick?.winnerId) {
			const winnerTeam = gameState.teams[lastTrick.winnerId] || "kontra";
			// Prüfe ob der Gewinner des letzten Stichs Kreuz-Bube gespielt hat
			const winnerCard = lastTrick.cards.find(
				(c) => c.playerId === lastTrick.winnerId,
			);
			if (
				winnerCard?.card.suit === "clubs" &&
				winnerCard?.card.rank === "jack"
			) {
				points.push({
					label: "Karlchen",
					team: winnerTeam,
					value: 1,
				});
			}
		}
	}

	// Punkte summieren
	let totalReGamePoints = 0;
	let totalKontraGamePoints = 0;
	for (const p of points) {
		if (p.team === "re") {
			totalReGamePoints += p.value;
		} else {
			totalKontraGamePoints += p.value;
		}
	}

	const netGamePoints = totalReGamePoints - totalKontraGamePoints;

	return {
		points,
		reWon,
		kontraWon,
		reCardPoints,
		kontraCardPoints,
		totalReGamePoints,
		totalKontraGamePoints,
		netGamePoints,
	};
}

/**
 * Bestimmt den Gewinner nach DDV-Regeln 7.1
 */
function determineWinner(
	reCardPoints: number,
	kontraCardPoints: number,
	reTricks: number,
	kontraTricks: number,
	reAnnounced: boolean,
	kontraAnnounced: boolean,
	reHighest: PointAnnouncementType | null,
	kontraHighest: PointAnnouncementType | null,
): { reWon: boolean; kontraWon: boolean } {
	// Re-Gewinnbedingung prüfen
	let reWon = false;
	let kontraWon = false;

	// 7.1.2 / 7.1.3: Basis-Gewinnbedingungen
	if (!reAnnounced && !kontraAnnounced) {
		// Keine Ansagen: Re braucht ≥121, Kontra braucht ≥120
		reWon = reCardPoints >= 121;
		kontraWon = kontraCardPoints >= 120;
	} else if (reAnnounced && !kontraAnnounced) {
		// Nur Re angesagt: Re braucht ≥121, Kontra braucht ≥120
		reWon = reCardPoints >= 121;
		kontraWon = kontraCardPoints >= 120;
	} else if (!reAnnounced && kontraAnnounced) {
		// Nur Kontra angesagt: Re braucht ≥120, Kontra braucht ≥121
		reWon = reCardPoints >= 120;
		kontraWon = kontraCardPoints >= 121;
	} else {
		// Beide angesagt: Re braucht ≥121, Kontra braucht ≥120
		reWon = reCardPoints >= 121;
		kontraWon = kontraCardPoints >= 120;
	}

	// Punktansagen überschreiben Gewinnbedingungen (7.1.2.5-8 / 7.1.3.5-8)
	if (reHighest) {
		const reTarget = getAnnouncementTarget(reHighest);
		if (reTarget === "all_tricks") {
			reWon = kontraTricks === 0;
		} else {
			reWon = reCardPoints >= reTarget;
		}
	}

	if (kontraHighest) {
		const kontraTarget = getAnnouncementTarget(kontraHighest);
		if (kontraTarget === "all_tricks") {
			kontraWon = reTricks === 0;
		} else {
			kontraWon = kontraCardPoints >= kontraTarget;
		}
	}

	// Defensive Gewinne: Gegner hat Ansage nicht erfüllt (7.1.2.7-8 / 7.1.3.7-8)
	if (kontraHighest && !reHighest) {
		// Kontra hat Ansage gemacht, Re hat keine höhere Ansage
		const kontraTarget = getAnnouncementTarget(kontraHighest);
		if (kontraTarget === "all_tricks") {
			if (reTricks > 0) reWon = true;
		} else {
			const defensiveTarget = getDefensiveTarget(kontraHighest);
			if (reCardPoints >= defensiveTarget) reWon = true;
		}
	}

	if (reHighest && !kontraHighest) {
		// Re hat Ansage gemacht, Kontra hat keine höhere Ansage
		const reTarget = getAnnouncementTarget(reHighest);
		if (reTarget === "all_tricks") {
			if (kontraTricks > 0) kontraWon = true;
		} else {
			const defensiveTarget = getDefensiveTarget(reHighest);
			if (kontraCardPoints >= defensiveTarget) kontraWon = true;
		}
	}

	return { reWon, kontraWon };
}

function getHighestAnnouncement(
	announcements: PointAnnouncementType[],
): PointAnnouncementType | null {
	const order: PointAnnouncementType[] = ["schwarz", "no30", "no60", "no90"];
	for (const ann of order) {
		if (announcements.includes(ann)) return ann;
	}
	return null;
}

function getAnnouncementTarget(
	ann: PointAnnouncementType,
): number | "all_tricks" {
	switch (ann) {
		case "no90":
			return 151;
		case "no60":
			return 181;
		case "no30":
			return 211;
		case "schwarz":
			return "all_tricks";
	}
}

function getDefensiveTarget(ann: PointAnnouncementType): number {
	switch (ann) {
		case "no90":
			return 90;
		case "no60":
			return 60;
		case "no30":
			return 30;
		case "schwarz":
			return 1; // nur 1 Stich reicht
	}
}

function announcementLabel(ann: PointAnnouncementType): string {
	switch (ann) {
		case "no90":
			return "Keine 90";
		case "no60":
			return "Keine 60";
		case "no30":
			return "Keine 30";
		case "schwarz":
			return "Schwarz";
	}
}
