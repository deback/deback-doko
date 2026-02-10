"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { sortDoppelkopfHand } from "@/lib/game-logic";
import type { GameHistoryDetail } from "@/types/game-history";
import { GameSummary } from "./game-summary";
import { PlayerHandDisplay } from "./player-hand-display";
import { TrickDisplay } from "./trick-display";

interface GameReviewProps {
	game: GameHistoryDetail;
	currentUserId: string;
}

export function GameReview({ game, currentUserId }: GameReviewProps) {
	const hasDetailData =
		game.tricks.length > 0 && Object.keys(game.initialHands).length > 0;

	return (
		<div className="space-y-6">
			{/* Back link */}
			<Link
				className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
				href="/history"
			>
				<ArrowLeft className="size-4" />
				Zurück zur Übersicht
			</Link>

			{/* Game summary */}
			<GameSummary game={game} />

			{!hasDetailData ? (
				<p className="text-muted-foreground text-sm">
					Keine Detaildaten verfügbar für dieses Spiel.
				</p>
			) : (
				<>
					{/* Initial hands */}
					<div className="space-y-3">
						<h2 className="font-bold text-xl">Blätter</h2>
						<div className="space-y-2">
							{game.playerResults.map((player) => {
								const cards = game.initialHands[player.userId] ?? [];
								const sortedCards = sortDoppelkopfHand(cards);
								return (
									<PlayerHandDisplay
										cards={sortedCards}
										isCurrentUser={player.userId === currentUserId}
										key={player.userId}
										player={player}
									/>
								);
							})}
						</div>
					</div>

					{/* Tricks */}
					<div className="space-y-3">
						<h2 className="font-bold text-xl">Stiche</h2>
						<div className="space-y-2">
							{game.tricks.map((trick, index) => (
								<TrickDisplay
									key={trick.cards[0]?.card.id}
									players={game.playerResults}
									trick={trick}
									trickNumber={index + 1}
								/>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
