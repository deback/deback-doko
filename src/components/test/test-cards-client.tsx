"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Card as GameCard, Rank, Suit } from "@/types/game";

export function TestCardsClient() {
	const [cards, setCards] = useState<GameCard[]>([]);

	useEffect(() => {
		// Generiere Karten nur auf dem Client, um Hydration-Fehler zu vermeiden
		setCards(generateRandomCards(12));
	}, []);

	// Für Test: Verwende "jacks" als Standard-Trumpf
	const trump: Suit | "jacks" | "queens" = "jacks";

	const getCardValueForSort = useCallback(
		(card: GameCard, _trump: Suit | "jacks" | "queens"): number => {
			// Herz 10 ist höchster Trumpf
			if (card.suit === "hearts" && card.rank === "10") return 1100;
			// Damen sind zweithöchster Trumpf
			if (card.rank === "queen") return 1000;
			// Buben sind dritthöchster Trumpf
			if (card.rank === "jack") return 900;
			// Karo (Diamonds) ist auch Trumpf
			if (card.suit === "diamonds") {
				if (card.rank === "ace") return 850;
				if (card.rank === "king") return 840;
				if (card.rank === "10") return 830;
				if (card.rank === "9") return 820;
			}
			return 0;
		},
		[],
	);

	const sortedHand = useMemo(() => {
		return [...cards].sort((a, b) => {
			// Check if cards are trump (Herz 10 ist immer Trumpf)
			const aIsHearts10 = a.suit === "hearts" && a.rank === "10";
			const bIsHearts10 = b.suit === "hearts" && b.rank === "10";
			const aIsTrump =
				aIsHearts10 ||
				(trump === "jacks"
					? a.rank === "jack" || a.rank === "queen" || a.suit === "diamonds"
					: a.rank === "queen" || a.suit === "diamonds");
			const bIsTrump =
				bIsHearts10 ||
				(trump === "jacks"
					? b.rank === "jack" || b.rank === "queen" || b.suit === "diamonds"
					: b.rank === "queen" || b.suit === "diamonds");

			// Trump cards come first
			if (aIsTrump && !bIsTrump) return -1;
			if (!aIsTrump && bIsTrump) return 1;

			// If both are trump, sort by trump value
			if (aIsTrump && bIsTrump) {
				// Herz 10 ist immer höchster Trumpf
				if (aIsHearts10 && !bIsHearts10) return -1;
				if (!aIsHearts10 && bIsHearts10) return 1;

				const aValue = getCardValueForSort(a, trump);
				const bValue = getCardValueForSort(b, trump);
				return bValue - aValue; // Higher value first
			}

			// If neither is trump, sort by suit then rank
			// Doppelkopf Farb-Reihenfolge: Kreuz, Herz, Pik, Karo
			const suitOrder: Record<Suit, number> = {
				clubs: 1,
				hearts: 2,
				spades: 3,
				diamonds: 4,
			};

			if (a.suit !== b.suit) {
				const aOrder = suitOrder[a.suit] ?? 99;
				const bOrder = suitOrder[b.suit] ?? 99;
				return aOrder - bOrder;
			}

			// Same suit, sort by rank (Doppelkopf order: Ass, 10, König, Bube, Dame, 9)
			const rankOrder: Record<string, number> = {
				ace: 1,
				"10": 2,
				king: 3,
				jack: 4,
				queen: 5,
				"9": 6,
			};

			const aRankOrder = rankOrder[a.rank] ?? 99;
			const bRankOrder = rankOrder[b.rank] ?? 99;
			return aRankOrder - bRankOrder;
		});
	}, [cards, getCardValueForSort]);

	const getSuitColor = (suit: string) => {
		switch (suit) {
			case "hearts":
				return "text-red-600";
			case "diamonds":
				return "text-red-500";
			case "clubs":
				return "text-black";
			case "spades":
				return "text-black";
			default:
				return "text-gray-600";
		}
	};

	const getSuitSymbol = (suit: string) => {
		switch (suit) {
			case "hearts":
				return "♥";
			case "diamonds":
				return "♦";
			case "clubs":
				return "♣";
			case "spades":
				return "♠";
			default:
				return "";
		}
	};

	const getRankDisplay = (rank: string) => {
		switch (rank) {
			case "jack":
				return "B";
			case "queen":
				return "D";
			case "king":
				return "K";
			case "ace":
				return "A";
			default:
				return rank;
		}
	};

	const generateNewCards = () => {
		setCards(generateRandomCards(12));
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>12 Zufällige Karten</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="mb-4">
						<Button onClick={generateNewCards}>Neue Karten generieren</Button>
					</div>
				</CardContent>
			</Card>
			<div className="fixed right-0 bottom-0 left-0 z-10 flex items-end justify-center">
				<div className="relative w-full max-w-2xl">
					{sortedHand.map((card, index) => {
						// Berechne Rotation und Position
						const totalCards = sortedHand.length;
						const maxRotation = 10; // Maximale Rotation in Grad
						// maxSpread: 80vw, aber maximal 80% von 1024px = 819.2px
						// Bei 1024px Viewport: 80vw = 819.2px, das ist unser Maximum
						const maxSpreadVw = 80;
						const maxSpreadPx = 819.2; // 80% von 1024px

						// Rotation berechnen
						const rotationStep = (maxRotation * 2) / (totalCards - 1 || 1);
						const rotation = -maxRotation + index * rotationStep;

						// Lineare Positionierung: Karten nebeneinander
						// Abstand zwischen Karten: min(maxSpreadVw / totalCards, maxSpreadPx / totalCards)
						const centerIndex = (totalCards - 1) / 2;
						const cardSpacingVw = maxSpreadVw / totalCards;
						const cardSpacingPx = maxSpreadPx / totalCards;
						const translateX = `calc((${index} - ${centerIndex}) * min(${cardSpacingVw}vw, ${cardSpacingPx}px))`;

						// translateY: Je größer die Rotation, desto weiter nach unten
						let translateY = 0;
						if (maxRotation > 0) {
							const radius = 180; // Radius des Halbkreises
							const absRotation = Math.abs(rotation); // Absolute Rotation
							const angle = (absRotation * Math.PI) / 180; // Winkel in Radiant
							// Je größer die Rotation, desto größer translateY (weiter unten)
							// Bei rotation = 0: translateY = 0
							// Bei größerer Rotation: translateY wird größer (weiter unten)
							// Multiplikator für stärkere Verschiebung nach unten
							const downShiftMultiplier = 7;
							translateY = (1 - Math.cos(angle)) * radius * downShiftMultiplier;
						}

						return (
							<Button
								className={cn(
									"absolute bottom-0 left-1/2 h-36 w-24 rounded-lg bg-white transition-all duration-200 dark:bg-gray-800",
									getSuitColor(card.suit),
								)}
								key={card.id}
								onMouseEnter={(e) => {
									e.currentTarget.style.setProperty("--scale", "1.1");
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.setProperty("--scale", "1");
								}}
								style={
									{
										"--translate-x": translateX,
										"--translate-y": translateY > 0 ? `${translateY}px` : "0",
										"--rotation": `${rotation}deg`,
										"--scale": "1",
										transform: `translate(calc(-50% + var(--translate-x)), var(--translate-y)) rotate(var(--rotation)) scale(var(--scale))`,
									} as React.CSSProperties
								}
								variant="outline"
							>
								{/* Oben links */}
								<div className="absolute top-1 left-1 flex flex-col items-center">
									<span className="font-bold text-lg leading-none">
										{getRankDisplay(card.rank)}
									</span>
									<span className="text-sm leading-none">
										{getSuitSymbol(card.suit)}
									</span>
								</div>

								{/* Oben rechts */}
								<div className="absolute top-1 right-1 flex flex-col items-center">
									<span className="font-bold leading-none">
										{getRankDisplay(card.rank)}
									</span>
									<span className="text-sm leading-none">
										{getSuitSymbol(card.suit)}
									</span>
								</div>

								{/* Unten links */}
								<div className="absolute bottom-1 left-1 flex rotate-180 flex-col items-center">
									<span className="font-bold leading-none">
										{getRankDisplay(card.rank)}
									</span>
									<span className="text-sm leading-none">
										{getSuitSymbol(card.suit)}
									</span>
								</div>

								{/* Unten rechts */}
								<div className="absolute right-1 bottom-1 flex rotate-180 flex-col items-center">
									<span className="font-bold leading-none">
										{getRankDisplay(card.rank)}
									</span>
									<span className="text-sm leading-none">
										{getSuitSymbol(card.suit)}
									</span>
								</div>

								{/* Zentrum - größere Anzeige (nur Symbol) */}
								<div className="flex h-full items-center justify-center">
									<div className="flex items-center justify-center">
										<span className="font-bold text-4xl">
											{getSuitSymbol(card.suit)}
										</span>
									</div>
								</div>
							</Button>
						);
					})}
				</div>
			</div>
		</>
	);
}

function generateRandomCards(count: number): GameCard[] {
	const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
	const ranks: Rank[] = ["9", "10", "jack", "queen", "king", "ace"];

	const allCards: GameCard[] = [];
	for (const suit of suits) {
		for (const rank of ranks) {
			allCards.push({
				suit,
				rank,
				id: `${suit}-${rank}-${Math.random().toString(36).substring(7)}`,
			});
		}
	}

	// Mische die Karten
	for (let i = allCards.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = allCards[i];
		if (temp && allCards[j]) {
			allCards[i] = allCards[j];
			allCards[j] = temp;
		}
	}

	// Nimm die ersten 'count' Karten
	return allCards.slice(0, count);
}
