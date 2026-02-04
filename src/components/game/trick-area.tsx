"use client";

import { useDroppable } from "@dnd-kit/core";
import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/game";
import type { Player } from "@/types/tables";

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

// Positionen für gespiele Karten basierend auf Spielerposition
function getCardPosition(
	playerIndex: number,
	currentPlayerIndex: number,
	totalPlayers: number,
): { x: number; y: number; rotation: number } {
	// Berechne relative Position zum aktuellen Spieler
	const relativePosition =
		(playerIndex - currentPlayerIndex + totalPlayers) % totalPlayers;

	// Positionen: 0 = unten (aktueller Spieler), 1 = links, 2 = oben, 3 = rechts
	const positions: { x: number; y: number; rotation: number }[] = [
		{ x: 0, y: 40, rotation: 0 }, // Unten (Spieler)
		{ x: -60, y: 0, rotation: -8 }, // Links
		{ x: 0, y: -40, rotation: 4 }, // Oben
		{ x: 60, y: 0, rotation: 12 }, // Rechts
	];

	const defaultPosition = { x: 0, y: 40, rotation: 0 };
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

	return (
		<div
			className={cn(
				"relative flex items-center justify-center rounded-3xl transition-all duration-300",
				"h-56 w-72 sm:h-64 sm:w-80 md:h-72 md:w-96",
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

				return (
					<div
						className="absolute w-20 transition-all duration-300 sm:w-24"
						key={`trick-${trickCard.card.id}-${index}`}
						style={{
							transform: `translate(${position.x}px, ${position.y}px) rotate(${position.rotation}deg)`,
							zIndex: index + 1,
						}}
					>
						<CardImage
							className="shadow-lg"
							rank={trickCard.card.rank}
							suit={trickCard.card.suit}
						/>
					</div>
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
