import {
	getAnnouncementMinCards,
	getBaseMinCardsForAnnouncement,
	isAnnouncementBlockedByHochzeitWindow,
} from "../src/lib/game/announcement-windows";
import type {
	AnnouncementType,
	GameState,
	PointAnnouncementType,
} from "./types";

export function getPlayerCardCount(
	gameState: GameState,
	playerId: string,
): number {
	const hand = gameState.hands[playerId];
	return hand ? hand.length : 0;
}

export function getMinCardsForAnnouncement(
	announcement: AnnouncementType,
): number {
	return getBaseMinCardsForAnnouncement(announcement);
}

export function canMakeAnnouncement(
	gameState: GameState,
	playerId: string,
	announcement: AnnouncementType,
): { allowed: boolean; reason?: string } {
	const playerTeam = gameState.teams[playerId];
	if (!playerTeam) {
		return { allowed: false, reason: "Spieler hat kein Team." };
	}

	const cardCount = getPlayerCardCount(gameState, playerId);
	const minCards = getAnnouncementMinCards(gameState, playerId, announcement);

	if (isAnnouncementBlockedByHochzeitWindow(gameState, announcement)) {
		return {
			allowed: false,
			reason:
				"In der angesagten Hochzeit ist die erste Re/Kontra-Ansage erst nach dem Klärungsstich erlaubt.",
		};
	}

	if (cardCount < minCards) {
		return {
			allowed: false,
			reason: `Zu spät! Du brauchst mindestens ${minCards} Karten.`,
		};
	}

	// Re/Kontra Ansage
	if (announcement === "re" || announcement === "kontra") {
		// Spieler kann nur für sein eigenes Team ansagen
		if (playerTeam === "re" && announcement !== "re") {
			return {
				allowed: false,
				reason: "Du bist im Re-Team und kannst nur Re sagen.",
			};
		}
		if (playerTeam === "kontra" && announcement !== "kontra") {
			return {
				allowed: false,
				reason: "Du bist im Kontra-Team und kannst nur Kontra sagen.",
			};
		}

		// Prüfe ob bereits angesagt
		if (announcement === "re" && gameState.announcements.re.announced) {
			return { allowed: false, reason: "Re wurde bereits angesagt." };
		}
		if (announcement === "kontra" && gameState.announcements.kontra.announced) {
			return { allowed: false, reason: "Kontra wurde bereits angesagt." };
		}

		return { allowed: true };
	}

	// Punkt-Ansagen (keine 90, keine 60, keine 30, schwarz)
	const teamAnnouncement = playerTeam === "re" ? "re" : "kontra";
	const teamHasAnnounced =
		playerTeam === "re"
			? gameState.announcements.re.announced
			: gameState.announcements.kontra.announced;

	if (!teamHasAnnounced) {
		return {
			allowed: false,
			reason: `Du musst zuerst ${teamAnnouncement === "re" ? "Re" : "Kontra"} sagen.`,
		};
	}

	// Prüfe ob diese Ansage bereits gemacht wurde
	const teamPointAnnouncements =
		playerTeam === "re"
			? gameState.announcements.rePointAnnouncements
			: gameState.announcements.kontraPointAnnouncements;

	if (teamPointAnnouncements.some((pa) => pa.type === announcement)) {
		return { allowed: false, reason: "Diese Ansage wurde bereits gemacht." };
	}

	// Prüfe ob übersprungene Ansagen noch legal wären (Regel 6.4.3)
	// Man kann Stufen überspringen, aber alle übersprungenen Ansagen
	// müssen zu diesem Zeitpunkt noch legal sein (genug Karten)
	const announcementOrder: PointAnnouncementType[] = [
		"no90",
		"no60",
		"no30",
		"schwarz",
	];
	const requestedIndex = announcementOrder.indexOf(
		announcement as PointAnnouncementType,
	);

	for (let i = 0; i < requestedIndex; i++) {
		const skippedAnnouncement = announcementOrder[i];
		if (
			skippedAnnouncement &&
			!teamPointAnnouncements.some((pa) => pa.type === skippedAnnouncement)
		) {
			// Diese Ansage wird übersprungen - prüfe ob genug Karten
			const skippedMinCards = getAnnouncementMinCards(
				gameState,
				playerId,
				skippedAnnouncement,
			);
			if (cardCount < skippedMinCards) {
				return {
					allowed: false,
					reason: `Zu spät! Um "${getAnnouncementLabel(announcement)}" zu sagen, hättest du "${getAnnouncementLabel(skippedAnnouncement)}" noch sagen können müssen (mind. ${skippedMinCards} Karten).`,
				};
			}
		}
	}

	return { allowed: true };
}

export function getAnnouncementLabel(announcement: AnnouncementType): string {
	switch (announcement) {
		case "re":
			return "Re";
		case "kontra":
			return "Kontra";
		case "no90":
			return "Keine 90";
		case "no60":
			return "Keine 60";
		case "no30":
			return "Keine 30";
		case "schwarz":
			return "Schwarz";
		default:
			return announcement;
	}
}
