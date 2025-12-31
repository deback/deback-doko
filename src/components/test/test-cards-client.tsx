"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Card as GameCard, Rank, Suit } from "@/types/game";

// --- KONSTANTEN & VISUALS ---

const SUIT_SYMBOL: Record<Suit, string> = {
	hearts: "♥",
	diamonds: "♦",
	clubs: "♣",
	spades: "♠",
};

const RANK_DISPLAY: Record<string, string> = {
	jack: "B",
	queen: "D",
	king: "K",
	ace: "A",
};

const SUIT_COLORS: Record<Suit, string> = {
	hearts: "text-red-600",
	diamonds: "text-red-500",
	clubs: "text-slate-900",
	spades: "text-slate-900",
};

// --- LOGIK & SORTIERUNG ---

/**
 * Bestimmt, ob eine Karte Trumpf ist.
 * Dient als "Single Source of Truth".
 */
const isTrump = (card: GameCard): boolean => {
	// 1. Herz 10 (Dullen)
	if (card.suit === "hearts" && card.rank === "10") return true;
	// 2. Damen
	if (card.rank === "queen") return true;
	// 3. Buben
	if (card.rank === "jack") return true;
	// 4. Karo (sofern nicht schon durch Dame/Bube abgedeckt)
	if (card.suit === "diamonds") return true;

	return false;
};

/**
 * Berechnet einen numerischen Wert für die Sortierung.
 * Hoher Wert = Weiter Links (Trumpf).
 * Niedriger Wert = Weiter Rechts (Fehlfarben).
 */
const getCardValue = (card: GameCard, hasSchweinerei: boolean): number => {
	// 1. Sonderfall Schweinerei (Karo Ass, wenn beide da sind)
	// Dies überschreibt alles andere.
	if (hasSchweinerei && card.suit === "diamonds" && card.rank === "ace") {
		return 1000;
	}

	// 2. Unterscheidung Trumpf vs. Fehlfarbe
	if (isTrump(card)) {
		// --- TRUMPF-LOGIK ---

		// Herz 10
		if (card.suit === "hearts" && card.rank === "10") return 900;

		// Damen (Reihenfolge: Kreuz, Pik, Herz, Karo)
		if (card.rank === "queen") {
			const suitVal =
				{ clubs: 4, spades: 3, hearts: 2, diamonds: 1 }[card.suit] || 0;
			return 800 + suitVal;
		}

		// Buben (Reihenfolge: Kreuz, Pik, Herz, Karo)
		if (card.rank === "jack") {
			const suitVal =
				{ clubs: 4, spades: 3, hearts: 2, diamonds: 1 }[card.suit] || 0;
			return 700 + suitVal;
		}

		// Farb-Trümpfe (Karo Ass, 10, K, 9 - sofern keine Schweinerei)
		// Ass=4, 10=3, K=2, 9=1
		const rankVal = { ace: 4, "10": 3, king: 2, "9": 1 }[card.rank] || 0;
		return 600 + rankVal;
	} else {
		// --- FEHLFARBEN-LOGIK ---
		// Doppelkopf Sortierung meist: Kreuz, Pik, Herz (Karo ist Trumpf)

		const suitBase: Record<Suit, number> = {
			clubs: 300,
			spades: 200,
			hearts: 100,
			diamonds: 0, // Karo ist eigentlich Trumpf, sollte hier nicht vorkommen
		};
		const suitVal = suitBase[card.suit] ?? 0;

		// Innerhalb der Fehlfarbe: A, 10, K, B, D, 9
		const rankValMap: Record<string, number> = {
			ace: 6,
			"10": 5,
			king: 4,
			jack: 3,
			queen: 2,
			"9": 1,
		};
		const rankVal = rankValMap[card.rank] ?? 0;

		return suitVal + rankVal;
	}
};

// --- KARTEN-KOMPONENTE ---

interface PlayingCardProps {
	card: GameCard;
	style: React.CSSProperties;
}

function PlayingCard({ card, style }: PlayingCardProps) {
	return (
		<div
			className={cn(
				"absolute bottom-0 left-1/2 h-36 w-24 origin-bottom", // Rotation vom unteren Rand
				"rounded-lg border bg-white shadow-xl transition-all duration-300 ease-out", // Animationen
				"hover:z-50 hover:-translate-y-12 hover:scale-110", // Interaktion: Hochspringen & Vergrößern
				"cursor-pointer select-none",
				SUIT_COLORS[card.suit],
			)}
			style={style}
		>
			{/* Ecken-Indikatoren (Oben Links & Unten Rechts) */}
			{[
				{ pos: "top-1 left-1", rot: "", id: "tl" },
				{ pos: "bottom-1 right-1", rot: "rotate-180", id: "br" },
			].map((corner) => (
				<div
					className={cn(
						"absolute flex flex-col items-center",
						corner.pos,
						corner.rot,
					)}
					key={`${card.id}-${corner.id}`}
				>
					<span className="font-bold text-lg leading-none">
						{RANK_DISPLAY[card.rank] ?? card.rank}
					</span>
					<span className="text-sm leading-none">{SUIT_SYMBOL[card.suit]}</span>
				</div>
			))}

			{/* Großes Symbol in der Mitte */}
			<div className="flex h-full items-center justify-center">
				<span className="text-5xl">{SUIT_SYMBOL[card.suit]}</span>
			</div>
		</div>
	);
}

// --- HAUPT-KOMPONENTE ---

export function TestCardsClient() {
	const [cards, setCards] = useState<GameCard[]>([]);
	const [isClient, setIsClient] = useState(false);

	// Hydration-Fix: Erst rendern, wenn Client bereit ist
	useEffect(() => {
		setIsClient(true);
		setCards(generateRandomCards(12));
	}, []);

	const sortedHand = useMemo(() => {
		if (!cards.length) return [];

		// Schweinerei-Check (Sind beide Karo Asse auf der Hand?)
		const diamondsAces = cards.filter(
			(c) => c.suit === "diamonds" && c.rank === "ace",
		);
		const hasSchweinerei = diamondsAces.length === 2;

		return [...cards].sort((a, b) => {
			const valA = getCardValue(a, hasSchweinerei);
			const valB = getCardValue(b, hasSchweinerei);
			// Absteigend sortieren: Höchste Werte (Trümpfe) links
			return valB - valA;
		});
	}, [cards]);

	const handleNewCards = () => {
		setCards(generateRandomCards(12));
	};

	if (!isClient) return null;

	return (
		<div className="flex flex-col items-center gap-8 p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Doppelkopf Hand ({cards.length} Karten)</CardTitle>
				</CardHeader>
				<CardContent>
					<Button className="w-full" onClick={handleNewCards}>
						Neu Geben
					</Button>
				</CardContent>
			</Card>

			{/* Hand-Container */}
			{/* perspective-1000 gibt den 3D-Effekt beim Rotieren */}
			<div className="perspective-1000 relative mt-10 flex h-48 w-full max-w-4xl justify-center">
				{sortedHand.map((card, index) => {
					const total = sortedHand.length;

					// --- Fächer-Berechnung ---

					// Gesamter Winkel des Fächers (z.B. 60 Grad)
					const angleRange = 60;

					// Winkel pro Karte
					const step = angleRange / (total - 1 || 1);

					// Aktueller Winkel (-30 bis +30)
					const rotate = -angleRange / 2 + index * step;

					// X-Versatz (Überlappung der Karten)
					// (index - Mitte) * Abstand
					const translateX = (index - (total - 1) / 2) * 35;

					// Y-Versatz (Bogenform)
					// Wir nutzen eine Parabel (x^2), damit die äußeren Karten tiefer sitzen
					// Multiplikator 0.2 bestimmt die "Krümmung" des Bogens
					const translateY = Math.abs(rotate) ** 2 * 0.2;

					return (
						<PlayingCard
							card={card}
							key={card.id}
							style={{
								// Die Reihenfolge der Transforms ist wichtig!
								transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg)`,
								zIndex: index + 1, // Standard Layering (links unten, rechts oben)
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}

// --- GENERATOR-FUNKTION ---

function generateRandomCards(count: number): GameCard[] {
	const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
	const ranks: Rank[] = ["9", "10", "jack", "queen", "king", "ace"];

	// 1. Erstelle ein einfaches Deck (24 Karten)
	const singleDeck = suits.flatMap((suit) =>
		ranks.map((rank) => ({ suit, rank })),
	);

	// 2. Verdopple das Deck für Doppelkopf (48 Karten)
	// Wir nutzen crypto.randomUUID() für eindeutige Keys, fallback auf Math.random
	const doubleDeck: GameCard[] = [...singleDeck, ...singleDeck].map((c) => ({
		...c,
		id:
			typeof crypto !== "undefined" && crypto.randomUUID
				? crypto.randomUUID()
				: `${c.suit}-${c.rank}-${Math.random().toString(36).substr(2, 9)}`,
	}));

	// 3. Fisher-Yates Shuffle (Effizienter als .sort mit random)
	for (let i = doubleDeck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = doubleDeck[i];
		if (temp && doubleDeck[j]) {
			doubleDeck[i] = doubleDeck[j];
			doubleDeck[j] = temp;
		}
	}

	// 4. Ziehe die gewünschte Anzahl
	return doubleDeck.slice(0, count);
}
