"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	useAnnounce,
	useCurrentPlayer,
	useGameState,
	useMyHand,
	useMyTeam,
} from "@/stores/game-selectors";
import type { AnnouncementType } from "@/types/game";

interface AnnouncementButtonsProps {
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

// Labels für Select-Optionen
const ANNOUNCEMENT_SELECT_LABELS: Record<AnnouncementType, string> = {
	re: "Re",
	kontra: "Kontra",
	no90: "Keine 90",
	no60: "Keine 60",
	no30: "Keine 30",
	schwarz: "Schwarz",
};

/**
 * AnnouncementButtons - Select + "Ansagen"-Button für Re/Kontra und Punkt-Ansagen
 *
 * Verwendet Store-Selektoren für Game-State.
 */
export function AnnouncementButtons({ className }: AnnouncementButtonsProps) {
	const [selected, setSelected] = useState<AnnouncementType | "">("");

	// Store Selectors
	const gameState = useGameState();
	const currentPlayer = useCurrentPlayer();
	const playerTeam = useMyTeam();
	const hand = useMyHand();
	const announce = useAnnounce();

	const cardCount = hand.length;

	// Early return if no valid state
	if (
		!gameState ||
		!currentPlayer ||
		!playerTeam ||
		gameState.gameEnded ||
		!gameState.announcements
	) {
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

	// Berechne verfügbare Ansagen
	const allAnnouncements: AnnouncementType[] = [
		teamAnnouncement,
		"no90",
		"no60",
		"no30",
		"schwarz",
	];
	const availableAnnouncements = allAnnouncements.filter(canAnnounce);

	// Keine Ansagen möglich → nichts anzeigen
	if (availableAnnouncements.length === 0) {
		return null;
	}

	// Oberste Ansage immer vorauswählen (auch nach Ansage oder wenn Auswahl ungültig wird)
	const effectiveSelected =
		selected && availableAnnouncements.includes(selected)
			? selected
			: availableAnnouncements[0];

	const handleAnnounce = () => {
		if (!effectiveSelected) return;
		announce(effectiveSelected);
		setSelected("");
	};

	return (
		<div className={cn("flex flex-col items-center gap-1.5", className)}>
			<Select
				onValueChange={(v) => setSelected(v as AnnouncementType)}
				value={effectiveSelected}
			>
				<SelectTrigger className="bg-background" size="sm">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{availableAnnouncements.map((a) => (
						<SelectItem key={a} value={a}>
							{ANNOUNCEMENT_SELECT_LABELS[a]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button onClick={handleAnnounce} size="sm">
				Ansagen
			</Button>
		</div>
	);
}
