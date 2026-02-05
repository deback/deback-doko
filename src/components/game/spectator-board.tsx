"use client";

import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameState } from "@/types/game";
import type { Player } from "@/types/tables";
import { Badge } from "../ui/badge";
import { OpponentHand } from "./opponent-hand";
import { PlayerInfo } from "./player-info";
import { TrickArea } from "./trick-area";

interface SpectatorBoardProps {
	gameState: GameState;
	className?: string;
}

export function SpectatorBoard({ gameState, className }: SpectatorBoardProps) {
	// For spectators, we show all players as "opponents" (card backs)
	// We'll use the first player as the "bottom" position for consistent viewing

	const getPlayerAtPosition = (
		relativePosition: number,
	): Player | undefined => {
		const index = relativePosition % gameState.players.length;
		return gameState.players[index];
	};

	const bottomPlayer = getPlayerAtPosition(0);
	const leftPlayer = getPlayerAtPosition(1);
	const topPlayer = getPlayerAtPosition(2);
	const rightPlayer = getPlayerAtPosition(3);

	// Use handCounts for spectator view (since hands are empty for spectators)
	const getCardCount = (playerId: string) => {
		return (
			gameState.handCounts[playerId] ?? gameState.hands[playerId]?.length ?? 0
		);
	};

	return (
		<div
			className={cn(
				"relative h-dvh w-screen overflow-hidden bg-wood",
				className,
			)}
		>
			{/* Spectator Badge */}
			<div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
				<Badge
					className="gap-2 bg-amber-500/20 px-4 py-2 text-amber-700 dark:text-amber-400"
					variant="secondary"
				>
					<Eye className="h-4 w-4" />
					Zuschauer-Modus
				</Badge>
			</div>

			{/* Top Player - wie in /test/hand */}
			{topPlayer && (
				<>
					<div className="fixed top-4 left-1/2 z-10 -translate-x-1/2 translate-y-8">
						<PlayerInfo
							cardCount={getCardCount(topPlayer.id)}
							isCurrentPlayer={false}
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								topPlayer.id
							}
							player={topPlayer}
							position="top"
							score={gameState.scores[topPlayer.id] || 0}
							team={gameState.teams[topPlayer.id]}
						/>
					</div>
					<OpponentHand
						cardCount={getCardCount(topPlayer.id)}
						position="top"
					/>
				</>
			)}

			{/* Left Player - wie in /test/hand */}
			{leftPlayer && (
				<>
					<div className="fixed left-4 top-1/2 z-10 -translate-y-1/2">
						<PlayerInfo
							cardCount={getCardCount(leftPlayer.id)}
							isCurrentPlayer={false}
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								leftPlayer.id
							}
							player={leftPlayer}
							position="left"
							score={gameState.scores[leftPlayer.id] || 0}
							team={gameState.teams[leftPlayer.id]}
						/>
					</div>
					<OpponentHand
						cardCount={getCardCount(leftPlayer.id)}
						position="left"
					/>
				</>
			)}

			{/* Right Player - wie in /test/hand */}
			{rightPlayer && (
				<>
					<div className="fixed right-4 top-1/2 z-10 -translate-y-1/2">
						<PlayerInfo
							cardCount={getCardCount(rightPlayer.id)}
							isCurrentPlayer={false}
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								rightPlayer.id
							}
							player={rightPlayer}
							position="right"
							score={gameState.scores[rightPlayer.id] || 0}
							team={gameState.teams[rightPlayer.id]}
						/>
					</div>
					<OpponentHand
						cardCount={getCardCount(rightPlayer.id)}
						position="right"
					/>
				</>
			)}

			{/* Trick Area (Center) */}
			<TrickArea
				currentPlayerId={gameState.players[0]?.id || ""}
				players={gameState.players}
				trickCards={gameState.currentTrick.cards}
			/>

			{/* Bottom Player - wie in /test/hand */}
			{bottomPlayer && (
				<>
					<div className="fixed bottom-[25%] left-1/2 z-10 -translate-x-1/2">
						<PlayerInfo
							cardCount={getCardCount(bottomPlayer.id)}
							isCurrentPlayer={false}
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								bottomPlayer.id
							}
							player={bottomPlayer}
							position="bottom"
							score={gameState.scores[bottomPlayer.id] || 0}
							team={gameState.teams[bottomPlayer.id]}
						/>
					</div>
					<OpponentHand
						cardCount={getCardCount(bottomPlayer.id)}
						position="bottom"
					/>
				</>
			)}

			{/* Turn Indicator */}
			<div className="fixed top-1/2 left-1/2 z-20 -translate-x-1/2 translate-y-24">
				<div className="rounded-full bg-black/60 px-4 py-2 text-white/80 text-sm backdrop-blur-sm">
					{gameState.players[gameState.currentPlayerIndex]?.name} ist am Zug
				</div>
			</div>

			{/* Connection Status */}
			<div className="fixed top-4 right-4 z-20 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
				<div className={cn("h-2 w-2 rounded-full", "bg-emerald-500")} />
				<span className="text-white/70 text-xs">Verbunden</span>
			</div>

			{/* Spectator Count */}
			{gameState.spectatorCount > 0 && (
				<div className="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
					<Eye className="h-3 w-3 text-white/70" />
					<span className="text-white/70 text-xs">
						{gameState.spectatorCount} Zuschauer
					</span>
				</div>
			)}

			{/* Game End Overlay */}
			{gameState.gameEnded && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
					<div className="rounded-xl bg-white/90 p-8 text-center shadow-2xl">
						<h2 className="mb-4 font-bold text-2xl text-emerald-600">
							Spiel beendet!
						</h2>
						<div className="space-y-2">
							{gameState.players
								.sort(
									(a, b) =>
										(gameState.scores[b.id] || 0) -
										(gameState.scores[a.id] || 0),
								)
								.map((player, index) => (
									<div
										className="flex items-center justify-between gap-4"
										key={player.id}
									>
										<span
											className={cn(
												"font-medium",
												index === 0 && "text-yellow-600",
											)}
										>
											{index + 1}. {player.name}
										</span>
										<span className="font-bold">
											{gameState.scores[player.id] || 0} Pkt.
										</span>
									</div>
								))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
