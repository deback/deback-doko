"use client";

import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";
import type { Player } from "@/types/tables";

// Hook to detect landscape orientation
function useIsLandscape() {
	const [isLandscape, setIsLandscape] = useState(false);

	useEffect(() => {
		const checkOrientation = () => {
			setIsLandscape(window.innerWidth > window.innerHeight);
		};

		// Initial check
		checkOrientation();

		// Listen to resize events
		window.addEventListener("resize", checkOrientation);
		return () => window.removeEventListener("resize", checkOrientation);
	}, []);

	return isLandscape;
}

interface TrickCard {
	card: Card;
	playerId: string;
}

interface TrickAreaProps {
	trickCards: TrickCard[];
	players: Player[];
	currentPlayerId: string;
	className?: string;
}

// Positionen für gespiele Karten basierend auf Spielerposition (in %)
function getCardPosition(
	playerIndex: number,
	currentPlayerIndex: number,
	totalPlayers: number,
): { x: number; y: number; rotation: number } {
	// Berechne relative Position zum aktuellen Spieler
	const relativePosition =
		(playerIndex - currentPlayerIndex + totalPlayers) % totalPlayers;

	// Positionen: 0 = unten (aktueller Spieler), 1 = links, 2 = oben, 3 = rechts
	// Werte in % relativ zur Kartengröße
	const positions: { x: number; y: number; rotation: number }[] = [
		{ x: 0, y: 60, rotation: 0 }, // Unten (Spieler)
		{ x: -80, y: 0, rotation: -8 }, // Links
		{ x: 0, y: -60, rotation: 4 }, // Oben
		{ x: 80, y: 0, rotation: 12 }, // Rechts
	];

	const defaultPosition = { x: 0, y: 60, rotation: 0 };
	return positions[relativePosition] ?? defaultPosition;
}

export function TrickArea({
	trickCards,
	players,
	currentPlayerId,
	className,
}: TrickAreaProps) {
	const { setNodeRef, isOver, active } = useDroppable({
		id: "trick-area",
	});

	const canDrop = active?.data?.current?.type === "card";
	const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);
	const isLandscape = useIsLandscape();

	// Kartenbreite: 1/5 von max 1200px = max 240px = 20vw (bei 1200px viewport)
	// Bei einem 1200px viewport: 1200 * 0.2 = 240px
	// Wir verwenden die gleiche Berechnung wie die Hand: min(20vw, 240px)
	const cardWidth = "min(20vw, 240px)";

	// Bei Landscape werden alle Karten um 90° gedreht
	const landscapeRotation = isLandscape ? 90 : 0;

	return (
		<div
			className={cn(
				"relative flex items-center justify-center rounded-3xl transition-all duration-300",
				// Container groß genug für 4 Karten mit Abstand
				"h-[50vw] w-[60vw] max-h-[500px] max-w-[600px]",
				isOver &&
					canDrop &&
					"scale-105 bg-emerald-500/20 ring-4 ring-emerald-400",
				!isOver && "bg-black/10",
				className,
			)}
			ref={setNodeRef}
		>
			{/* Drop-Zone Hinweis */}
			{trickCards.length === 0 && !isOver && (
				<span className="text-white/30 text-sm">Karte hier ablegen</span>
			)}

			{/* Gespielte Karten */}
			{trickCards.map((trickCard, index) => {
				const playerIndex = players.findIndex(
					(p) => p.id === trickCard.playerId,
				);
				const position = getCardPosition(
					playerIndex,
					currentPlayerIndex,
					players.length,
				);

				// Gesamtrotation: Position-Rotation + Landscape-Rotation
				const totalRotation = position.rotation + landscapeRotation;

				return (
					<CardImage
						className="absolute shadow-lg transition-all duration-300"
						key={`trick-${trickCard.card.id}-${index}`}
						rank={trickCard.card.rank}
						style={{
							width: cardWidth,
							transform: `translateX(${position.x}%) translateY(${position.y}%) rotate(${totalRotation}deg)`,
							zIndex: index + 1,
						}}
						suit={trickCard.card.suit}
					/>
				);
			})}

			{/* Hover-Effekt */}
			{isOver && canDrop && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="animate-pulse text-emerald-400 text-lg font-semibold">
						Loslassen zum Spielen
					</div>
				</div>
			)}
		</div>
	);
}
