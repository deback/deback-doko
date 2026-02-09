import type { PointAnnouncementType } from "@/types/game";

/** Labels für Vertragstypen (Deutsch) */
export const CONTRACT_LABELS: Record<string, string> = {
	normal: "Normal",
	hochzeit: "Hochzeit",
	"solo-clubs": "♣ Kreuz-Solo",
	"solo-spades": "♠ Pik-Solo",
	"solo-hearts": "♥ Herz-Solo",
	"solo-diamonds": "♦ Karo-Solo",
	"solo-queens": "Damen-Solo",
	"solo-jacks": "Buben-Solo",
	"solo-aces": "Fleischloser",
};

/** Kurz-Labels für Punkt-Ansagen */
export const POINT_ANNOUNCEMENT_LABELS: Record<PointAnnouncementType, string> =
	{
		no90: "90",
		no60: "60",
		no30: "30",
		schwarz: "S",
	};
