"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { sortDoppelkopfHand } from "@/lib/game-logic"; // Importiere die Logik
import { cn } from "@/lib/utils";
import type { Card as GameCard, Rank, Suit } from "@/types/game";

// --- Konstanten & Helper für UI ---
const SUIT_SYMBOLS: Record<Suit, string> = {
	hearts: "♥",
	diamonds: "♦",
	clubs: "♣",
	spades: "♠",
};

const SUIT_COLORS: Record<Suit, string> = {
	hearts: "text-red-600",
	diamonds: "text-red-500",
	clubs: "text-slate-900",
	spades: "text-slate-900",
};

const RANK_DISPLAY: Record<string, string> = {
	jack: "B",
	queen: "D",
	king: "K",
	ace: "A",
	"10": "10",
	"9": "9",
};

// --- Sub-Komponente für eine einzelne Karte ---
const PlayingCard = ({
	card,
	style,
}: {
	card: GameCard;
	style: React.CSSProperties;
}) => {
	const symbol = SUIT_SYMBOLS[card.suit] ?? "?";
	const rank = RANK_DISPLAY[card.rank] ?? card.rank;
	const colorClass = SUIT_COLORS[card.suit];

	return (
		<div
			className={cn(
				"absolute bottom-0 left-1/2 h-36 w-24 origin-bottom select-none",
				"rounded-lg border bg-white shadow-xl transition-all duration-300",
				"hover:scale-110", // Z-Index Trick & Hover Effekt
				colorClass,
			)}
			style={style}
		>
			{/* Ecken-Rendering (alle 4 Ecken) */}
			<CardCorner position="top-left" rank={rank} symbol={symbol} />
			<CardCorner position="top-right" rank={rank} symbol={symbol} />
			<CardCorner position="bottom-left" rank={rank} rotate symbol={symbol} />
			<CardCorner position="bottom-right" rank={rank} rotate symbol={symbol} />

			{/* Zentrum */}
			<div className="flex h-full items-center justify-center">
				<span className="text-4xl">{symbol}</span>
			</div>
		</div>
	);
};

interface CardCornerProps {
	rank: string;
	symbol: string;
	position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
	rotate?: boolean;
}

const CardCorner = ({ rank, symbol, position, rotate }: CardCornerProps) => {
	const positionClasses = {
		"top-left": "top-0 left-0",
		"top-right": "top-0 right-0",
		"bottom-left": "bottom-0 left-0",
		"bottom-right": "bottom-0 right-0",
	};

	return (
		<div
			className={cn(
				"absolute flex flex-col items-center gap-0.5 p-1",
				positionClasses[position],
				rotate && "rotate-180",
			)}
		>
			<span className="font-bold text-lg leading-none">{rank}</span>
			<span className="text-sm leading-none">{symbol}</span>
		</div>
	);
};

// --- Hauptkomponente ---
export function HandViewClient() {
	const [cards, setCards] = useState<GameCard[]>(() => generateRandomCards(12));

	// Sortierung ist jetzt ausgelagert und viel sauberer
	const sortedHand = useMemo(() => sortDoppelkopfHand(cards), [cards]);

	return (
		<div className="flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-100">
			<div className="z-10 mb-20">
				<Button onClick={() => setCards(generateRandomCards(12))}>
					Neu Geben
				</Button>
			</div>

			{/* Karten Container */}
			<div className="relative flex h-48 w-full max-w-4xl items-end justify-center">
				{sortedHand.map((card, index) => {
					const total = sortedHand.length;

					// Berechne Fan-Style
					// Rotation: Spreize Karten zwischen -30 und 30 Grad
					const rotation = (index - (total - 1) / 2) * 5;

					// X-Offset: Schiebe sie etwas zusammen
					const xOffset = (index - (total - 1) / 2) * 30;

					// Y-Offset: Bogenform (Arc)
					const yOffset = Math.abs(index - (total - 1) / 2) * 5;

					return (
						<PlayingCard
							card={card}
							key={card.id}
							style={{
								transform: `translateX(calc(-50% + ${xOffset}px)) translateY(${yOffset}px) rotate(${rotation}deg)`,
								zIndex: index, // Basis Z-Index
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}

// (Der Random Generator bleibt hier unten oder kommt auch in utils)
function generateRandomCards(count: number): GameCard[] {
	const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
	const ranks: Rank[] = ["9", "10", "jack", "queen", "king", "ace"];
	// ... dein bestehender Generator Code ...
	const allCards: GameCard[] = [];
	for (let deck = 0; deck < 2; deck++) {
		for (const suit of suits) {
			for (const rank of ranks) {
				allCards.push({
					suit,
					rank,
					id: `${suit}-${rank}-${deck}-${Math.random().toString(36).substring(7)}`,
				});
			}
		}
	}
	return allCards.sort(() => Math.random() - 0.5).slice(0, count);
}
