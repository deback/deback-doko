import type { CardDesign } from "@/lib/hooks/use-card-design";
import type { PointAnnouncementType } from "@/types/game";

const BASE_CONTRACT_LABELS: Record<string, string> = {
	normal: "Normal",
	hochzeit: "Hochzeit",
	"solo-clubs": "♣",
	"solo-spades": "♠",
	"solo-hearts": "♥",
	"solo-diamonds": "♦",
	"solo-aces": "F",
};

/** Returns contract labels adjusted to card design (B/D for doko, J/Q for poker) */
export function getContractLabels(
	cardDesign: CardDesign = "doko",
): Record<string, string> {
	return {
		...BASE_CONTRACT_LABELS,
		"solo-queens": cardDesign === "poker" ? "Q" : "D",
		"solo-jacks": cardDesign === "poker" ? "J" : "B",
	};
}

/** Static default labels (doko) for components outside CardDesignProvider */
export const CONTRACT_LABELS = getContractLabels("doko");

/** Full contract names for tooltips, adjusted to card design */
export function getContractTooltips(
	cardDesign: CardDesign = "doko",
): Record<string, string> {
	const isPoker = cardDesign === "poker";
	return {
		"solo-clubs": "♣ Kreuz-Solo",
		"solo-spades": "♠ Pik-Solo",
		"solo-hearts": "♥ Herz-Solo",
		"solo-diamonds": "♦ Karo-Solo",
		"solo-queens": isPoker ? "Queens-Solo" : "Damen-Solo",
		"solo-jacks": isPoker ? "Jacks-Solo" : "Buben-Solo",
		"solo-aces": "Fleischloser",
		hochzeit: "Hochzeit",
	};
}

/** Kurz-Labels für Punkt-Ansagen */
export const POINT_ANNOUNCEMENT_LABELS: Record<PointAnnouncementType, string> =
	{
		no90: "90",
		no60: "60",
		no30: "30",
		schwarz: "S",
	};
