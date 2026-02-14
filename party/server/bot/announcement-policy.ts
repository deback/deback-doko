import { canMakeAnnouncement } from "../../announcements";
import type { AnnouncementType, GameState } from "../../types";
import { estimateHandStrength, getBotHand } from "./legal-view";
import { buildTacticalSnapshot } from "./tactical-view";
import type { BotDecision } from "./types";

const TEAM_ANNOUNCE_BASE_STRENGTH = 104;
const TEAM_COUNTER_MIN_STRENGTH = 118;
const TEAM_SIGNAL_DISCOUNT = 6;
const TEAM_25_EYES_DISCOUNT = 8;
const TEAM_LATE_FIRST_TRICK_DOUBLE_DULLE_PENALTY = 4;

const NO90_MIN_STRENGTH = 136;
const NO90_MIN_TEAM_POINTS = 25;

function getTeamAnnouncement(
	team: "re" | "kontra",
): Extract<AnnouncementType, "re" | "kontra"> {
	return team === "re" ? "re" : "kontra";
}

function hasOpponentAnnounced(
	gameState: GameState,
	team: "re" | "kontra",
): boolean {
	return team === "re"
		? gameState.announcements.kontra.announced
		: gameState.announcements.re.announced;
}

function isLatePositionBeforeFirstOwnCardInFirstTrick(
	gameState: GameState,
	ownCardsPlayed: number,
	positionInTrick: number,
): boolean {
	return (
		ownCardsPlayed === 0 &&
		gameState.completedTricks.length === 0 &&
		(positionInTrick === 3 || positionInTrick === 4)
	);
}

function decideTeamAnnouncement(
	gameState: GameState,
	playerId: string,
	team: "re" | "kontra",
	strength: number,
): BotDecision | null {
	const announcement = getTeamAnnouncement(team);
	const validation = canMakeAnnouncement(gameState, playerId, announcement);
	if (!validation.allowed) return null;

	const tactical = buildTacticalSnapshot(gameState, playerId);
	const opponentAnnounced = hasOpponentAnnounced(gameState, team);
	const latePositionBeforeOwnLead =
		isLatePositionBeforeFirstOwnCardInFirstTrick(
			gameState,
			tactical.ownCardsPlayed,
			tactical.positionInTrick,
		);

	if (latePositionBeforeOwnLead && !tactical.handProfile.hasDoubleDulle) {
		return null;
	}

	let requiredStrength = opponentAnnounced
		? TEAM_COUNTER_MIN_STRENGTH
		: TEAM_ANNOUNCE_BASE_STRENGTH;

	if (tactical.handProfile.safePartnerSignal) {
		requiredStrength -= TEAM_SIGNAL_DISCOUNT;
	}
	if (tactical.firstTrickSelfWinAtLeast25) {
		requiredStrength -= TEAM_25_EYES_DISCOUNT;
	}
	if (latePositionBeforeOwnLead && tactical.handProfile.hasDoubleDulle) {
		requiredStrength += TEAM_LATE_FIRST_TRICK_DOUBLE_DULLE_PENALTY;
	}

	if (strength < requiredStrength) return null;

	return {
		type: "announce",
		announcement,
		reasonCode: opponentAnnounced
			? "announcement.team.counter-excellent"
			: "announcement.team.ultra-conservative",
	};
}

function decideNo90Announcement(
	gameState: GameState,
	playerId: string,
	team: "re" | "kontra",
	strength: number,
): BotDecision | null {
	const teamPointAnnouncements =
		team === "re"
			? gameState.announcements.rePointAnnouncements
			: gameState.announcements.kontraPointAnnouncements;
	if (
		teamPointAnnouncements.some((announcement) => announcement.type === "no90")
	) {
		return null;
	}

	const validation = canMakeAnnouncement(gameState, playerId, "no90");
	if (!validation.allowed) return null;

	const tactical = buildTacticalSnapshot(gameState, playerId);
	if (strength < NO90_MIN_STRENGTH) return null;
	if (!tactical.handProfile.hasStrongTrumpControl) return null;
	if (tactical.teamSecuredPoints < NO90_MIN_TEAM_POINTS) return null;

	return {
		type: "announce",
		announcement: "no90",
		reasonCode: "announcement.no90.ultra-conservative",
	};
}

export function decideAnnouncementAction(
	gameState: GameState,
	playerId: string,
): BotDecision | null {
	if (gameState.biddingPhase?.active) return null;

	const team = gameState.teams[playerId];
	if (!team) return null;

	const hand = getBotHand(gameState, playerId);
	const strength = estimateHandStrength(gameState, hand);
	const teamHasAnnounced =
		team === "re"
			? gameState.announcements.re.announced
			: gameState.announcements.kontra.announced;

	if (!teamHasAnnounced) {
		return decideTeamAnnouncement(gameState, playerId, team, strength);
	}

	// Bot-Deckel: keine tieferen Absagen als Keine 90.
	return decideNo90Announcement(gameState, playerId, team, strength);
}
