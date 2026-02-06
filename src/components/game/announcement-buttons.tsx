"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnnouncementType, GameState } from "@/types/game";
import type { Player } from "@/types/tables";

interface AnnouncementButtonsProps {
	gameState: GameState;
	currentPlayer: Player;
	onAnnounce: (announcement: AnnouncementType) => void;
	className?: string;
}

// Mindest-Kartenanzahl für Ansagen
const MIN_CARDS: Record<AnnouncementType, number> = {
	re: 11,
	kontra: 11,
	no90: 10,
	no60: 9,
	no30: 8,
	schwarz: 7,
};

// Labels für Ansagen
const ANNOUNCEMENT_LABELS: Record<AnnouncementType, string> = {
	re: "Re",
	kontra: "Kontra",
	no90: "K90",
	no60: "K60",
	no30: "K30",
	schwarz: "Schwarz",
};

export function AnnouncementButtons({
	gameState,
	currentPlayer,
	onAnnounce,
	className,
}: AnnouncementButtonsProps) {
	const playerTeam = gameState.teams[currentPlayer.id];
	const hand = gameState.hands[currentPlayer.id];
	const cardCount = hand?.length ?? 0;

	if (!playerTeam || gameState.gameEnded || !gameState.announcements) {
		return null;
	}

	// Bestimme welche Re/Kontra Ansage der Spieler machen kann
	const teamAnnouncement: "re" | "kontra" =
		playerTeam === "re" ? "re" : "kontra";

	// Prüfe ob Re/Kontra bereits angesagt wurde (von diesem Team)
	const teamHasAnnounced =
		playerTeam === "re"
			? (gameState.announcements.re?.announced ?? false)
			: (gameState.announcements.kontra?.announced ?? false);

	// Aktuelle Punkt-Ansagen des Teams
	const teamPointAnnouncements =
		playerTeam === "re"
			? (gameState.announcements.rePointAnnouncements ?? [])
			: (gameState.announcements.kontraPointAnnouncements ?? []);

	// Helper um zu prüfen ob eine Punkt-Ansage bereits gemacht wurde
	const hasPointAnnouncement = (type: string): boolean => {
		return teamPointAnnouncements.some((pa) => pa.type === type);
	};

	// Prüfe ob eine Ansage möglich ist
	// Laut Regel 6.4.3: Man kann Stufen überspringen, aber alle übersprungenen
	// Ansagen müssen zu diesem Zeitpunkt noch legal sein (genug Karten)
	const canAnnounce = (announcement: AnnouncementType): boolean => {
		const minCards = MIN_CARDS[announcement];
		if (cardCount < minCards) return false;

		if (announcement === "re" || announcement === "kontra") {
			// Kann nur eigenes Team ansagen
			if (announcement !== teamAnnouncement) return false;
			// Bereits angesagt?
			return !teamHasAnnounced;
		}

		// Punkt-Ansagen benötigen vorherige Re/Kontra
		if (!teamHasAnnounced) return false;

		// Bereits gemacht?
		if (hasPointAnnouncement(announcement)) return false;

		// Alle übersprungenen Ansagen müssen auch noch legal sein (genug Karten)
		const order: AnnouncementType[] = ["no90", "no60", "no30", "schwarz"];
		const requestedIndex = order.indexOf(announcement);
		for (let i = 0; i < requestedIndex; i++) {
			const skipped = order[i];
			if (skipped && !hasPointAnnouncement(skipped)) {
				// Diese Ansage wird übersprungen - prüfe ob genug Karten
				const skippedMinCards = MIN_CARDS[skipped];
				if (cardCount < skippedMinCards) {
					return false;
				}
			}
		}

		return true;
	};

	// Prüfe welche Ansagen prinzipiell noch gemacht werden können (für UI)
	// Alle Buttons sollen sichtbar sein, solange sie nicht bereits gemacht wurden
	const isAnnouncementPossible = (announcement: AnnouncementType): boolean => {
		if (announcement === "re" || announcement === "kontra") {
			if (announcement !== teamAnnouncement) return false;
			return !teamHasAnnounced;
		}
		// Punkt-Ansagen - nur ausblenden wenn bereits gemacht
		if (hasPointAnnouncement(announcement)) return false;
		return true;
	};

	// Zeige nur relevante Buttons
	const pointAnnouncements: AnnouncementType[] = [
		"no90",
		"no60",
		"no30",
		"schwarz",
	];

	return (
		<div className={cn("flex items-center gap-1", className)}>
			{/* Re/Kontra Button */}
			{isAnnouncementPossible(teamAnnouncement) && (
				<Button
					className={cn(
						"h-7 px-2 text-xs font-semibold",
						teamAnnouncement === "re"
							? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/30"
							: "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/30",
					)}
					disabled={!canAnnounce(teamAnnouncement)}
					onClick={() => onAnnounce(teamAnnouncement)}
					size="sm"
					variant={canAnnounce(teamAnnouncement) ? "default" : "outline"}
				>
					{ANNOUNCEMENT_LABELS[teamAnnouncement]}
				</Button>
			)}

			{/* Punkt-Ansagen (nur wenn Re/Kontra angesagt) */}
			{teamHasAnnounced &&
				pointAnnouncements.map((announcement) => {
					if (!isAnnouncementPossible(announcement)) return null;
					const canMake = canAnnounce(announcement);
					return (
						<Button
							className="h-7 px-2 text-xs"
							disabled={!canMake}
							key={announcement}
							onClick={() => onAnnounce(announcement)}
							size="sm"
							variant={canMake ? "secondary" : "outline"}
						>
							{ANNOUNCEMENT_LABELS[announcement]}
						</Button>
					);
				})}
		</div>
	);
}
