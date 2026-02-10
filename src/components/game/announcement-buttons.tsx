"use client";

import { Speech } from "lucide-react";
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
import type { AnnouncementType, PointAnnouncementType } from "@/types/game";

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

// Labels für Select-Optionen (lang)
const POINT_LABELS: Record<PointAnnouncementType, string> = {
	no90: "Keine 90",
	no60: "Keine 60",
	no30: "Keine 30",
	schwarz: "Schwarz",
};

// Kurz-Labels für kleine Screens
const POINT_SHORT_LABELS: Record<PointAnnouncementType, string> = {
	no90: "K90",
	no60: "K60",
	no30: "K30",
	schwarz: "SW",
};

/**
 * AnnouncementButtons - Re/Kontra Button + Select für Punkt-Ansagen
 *
 * Verwendet Store-Selektoren für Game-State.
 */
export function AnnouncementButtons({ className }: AnnouncementButtonsProps) {
	const [selected, setSelected] = useState<PointAnnouncementType | "">("");

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
			if (announcement !== teamAnnouncement) return false;
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
				const skippedMinCards = MIN_CARDS[skipped];
				if (cardCount < skippedMinCards) {
					return false;
				}
			}
		}

		return true;
	};

	// Re/Kontra Button
	const canAnnounceTeam = canAnnounce(teamAnnouncement);

	// Verfügbare Punkt-Ansagen für Select
	const allPointAnnouncements: PointAnnouncementType[] = [
		"no90",
		"no60",
		"no30",
		"schwarz",
	];
	const availablePoints = allPointAnnouncements.filter(canAnnounce);

	// Oberste Punkt-Ansage vorauswählen
	const effectiveSelected =
		selected && availablePoints.includes(selected)
			? selected
			: availablePoints[0];

	const handlePointAnnounce = () => {
		if (!effectiveSelected) return;
		announce(effectiveSelected);
		setSelected("");
	};

	// Nichts anzeigen wenn weder Re/Kontra noch Punkt-Ansagen möglich
	if (!canAnnounceTeam && availablePoints.length === 0) {
		return null;
	}

	return (
		<div className={cn("flex items-center gap-1.5", className)}>
			{/* Re/Kontra als direkter Button */}
			{canAnnounceTeam && (
				<Button onClick={() => announce(teamAnnouncement)} size="sm">
					{teamAnnouncement === "re" ? "Re" : "Kontra"}
				</Button>
			)}

			{/* Punkt-Ansagen als Select + Ansagen-Button */}
			{availablePoints.length > 0 && (
				<>
					<Select
						onValueChange={(v) => setSelected(v as PointAnnouncementType)}
						value={effectiveSelected}
					>
						<SelectTrigger
							className="bg-background/70 hover:bg-background/90 dark:bg-background/70 dark:hover:bg-background/90"
							size="sm"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{availablePoints.map((a) => (
								<SelectItem key={a} value={a}>
									<span className="sm:hidden">{POINT_SHORT_LABELS[a]}</span>
									<span className="hidden sm:inline">{POINT_LABELS[a]}</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						className="max-sm:size-8"
						onClick={handlePointAnnounce}
						size="sm"
					>
						<span className="hidden">Ansagen</span>
						<Speech className="size-4" />
					</Button>
				</>
			)}
		</div>
	);
}
