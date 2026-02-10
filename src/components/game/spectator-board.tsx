"use client";

import { Eye } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GameState } from "@/types/game";
import type { Player } from "@/types/tables";
import { Badge } from "../ui/badge";
import Card, { CARD_SIZE } from "./card";
import { OpponentHand } from "./opponent-hand";
import { PlayerInfo } from "./player-info";
import { TrickArea } from "./trick-area";

interface SpectatorBoardProps {
	gameState: GameState;
	className?: string;
}

export function SpectatorBoard({ gameState, className }: SpectatorBoardProps) {
	const [showGameEndDialog, setShowGameEndDialog] = useState(true);
	const [cachedEndGameState, setCachedEndGameState] =
		useState<GameState | null>(null);

	// Cache game state when game ends, reset dialog when new game starts
	useEffect(() => {
		if (gameState.gameEnded) {
			setCachedEndGameState(gameState);
		} else if (cachedEndGameState?.gameEnded) {
			setShowGameEndDialog(true);
		}
	}, [gameState.gameEnded, gameState, cachedEndGameState?.gameEnded]);

	// Clear cached state when dialog is closed
	const handleCloseGameEndDialog = useCallback(() => {
		setShowGameEndDialog(false);
		setCachedEndGameState(null);
	}, []);

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
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								topPlayer.id
							}
							player={topPlayer}
							position="top"
						/>
					</div>
					<OpponentHand cardCount={getCardCount(topPlayer.id)} position="top" />
				</>
			)}

			{/* Left Player - wie in /test/hand */}
			{leftPlayer && (
				<>
					<div className="fixed top-1/2 left-4 z-10 -translate-y-1/2">
						<PlayerInfo
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								leftPlayer.id
							}
							player={leftPlayer}
							position="left"
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
					<div className="fixed top-1/2 right-4 z-10 -translate-y-1/2">
						<PlayerInfo
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								rightPlayer.id
							}
							player={rightPlayer}
							position="right"
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
				trickWinnerId={gameState.currentTrick.winnerId}
			/>

			{/* Bottom Player - wie in /test/hand */}
			{bottomPlayer && (
				<>
					<div className="fixed bottom-[25%] left-1/2 z-10 -translate-x-1/2">
						<PlayerInfo
							isCurrentTurn={
								gameState.players[gameState.currentPlayerIndex]?.id ===
								bottomPlayer.id
							}
							player={bottomPlayer}
							position="bottom"
						/>
					</div>
					<div className="fixed bottom-0 left-1/2 -translate-x-1/2 translate-y-4/5 lg:translate-y-2/3">
						<div className={`@container relative ${CARD_SIZE}`}>
							{Array.from({ length: getCardCount(bottomPlayer.id) }).map(
								(_, index) => {
									const t = index - (getCardCount(bottomPlayer.id) - 1) / 2;
									const angle = t * 1.2;
									return (
										<Card
											angle={angle}
											className="top-0 left-0 h-full w-full"
											// biome-ignore lint/suspicious/noArrayIndexKey: spectator cards are identical
											key={`spectator-bottom-${index}`}
											showBack
										/>
									);
								},
							)}
						</div>
					</div>
				</>
			)}

			{/* Turn Indicator */}
			<div className="fixed top-1/2 left-1/2 z-20 -translate-x-1/2 translate-y-24">
				<div className="rounded-full bg-black/60 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
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
				<div className="fixed right-4 bottom-4 z-20 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
					<Eye className="h-3 w-3 text-white/70" />
					<span className="text-white/70 text-xs">
						{gameState.spectatorCount} Zuschauer
					</span>
				</div>
			)}

			{/* Game End Dialog - use cached state to keep dialog open during new game start */}
			<Dialog
				onOpenChange={(open) => !open && handleCloseGameEndDialog()}
				open={!!cachedEndGameState && showGameEndDialog}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-center text-2xl text-emerald-600">
							Spiel beendet!
						</DialogTitle>
					</DialogHeader>
					{cachedEndGameState && (
						<div className="space-y-4">
							{(() => {
								const gpr = cachedEndGameState.gamePointsResult;
								const reCardPoints =
									gpr?.reCardPoints ??
									cachedEndGameState.players
										.filter((p) => cachedEndGameState.teams[p.id] === "re")
										.reduce(
											(sum, p) => sum + (cachedEndGameState.scores[p.id] || 0),
											0,
										);
								const kontraCardPoints =
									gpr?.kontraCardPoints ??
									cachedEndGameState.players
										.filter((p) => cachedEndGameState.teams[p.id] === "kontra")
										.reduce(
											(sum, p) => sum + (cachedEndGameState.scores[p.id] || 0),
											0,
										);
								const reWon = gpr?.reWon ?? reCardPoints > kontraCardPoints;
								const kontraWon = gpr?.kontraWon ?? !reWon;

								return (
									<>
										{/* Kartenpunkte */}
										<div className="flex gap-2">
											<div
												className={cn(
													"flex-1 rounded-lg p-3",
													reWon ? "bg-emerald-500/20" : "bg-muted",
												)}
											>
												<div className="mb-1 flex items-center justify-between">
													<span
														className={cn(
															"font-bold text-sm",
															reWon && "text-emerald-600",
														)}
													>
														Re {reWon && "\u{1F3C6}"}
													</span>
													<span className="font-bold">{reCardPoints} Pkt.</span>
												</div>
												<div className="text-muted-foreground text-xs">
													{cachedEndGameState.players
														.filter(
															(p) => cachedEndGameState.teams[p.id] === "re",
														)
														.map((p) => p.name)
														.join(", ")}
												</div>
											</div>
											<div
												className={cn(
													"flex-1 rounded-lg p-3",
													kontraWon ? "bg-emerald-500/20" : "bg-muted",
												)}
											>
												<div className="mb-1 flex items-center justify-between">
													<span
														className={cn(
															"font-bold text-sm",
															kontraWon && "text-emerald-600",
														)}
													>
														Kontra {kontraWon && "\u{1F3C6}"}
													</span>
													<span className="font-bold">
														{kontraCardPoints} Pkt.
													</span>
												</div>
												<div className="text-muted-foreground text-xs">
													{cachedEndGameState.players
														.filter(
															(p) =>
																cachedEndGameState.teams[p.id] === "kontra",
														)
														.map((p) => p.name)
														.join(", ")}
												</div>
											</div>
										</div>

										{/* Spielpunkte */}
										{gpr && gpr.points.length > 0 && (
											<div className="space-y-1">
												<h4 className="font-semibold text-sm">Spielpunkte</h4>
												<div className="space-y-0.5 rounded-lg border p-2">
													{gpr.points.map(
														(
															point: {
																label: string;
																team: "re" | "kontra";
																value: number;
															},
															idx: number,
														) => (
															<div
																className="flex items-center justify-between text-sm"
																key={`${point.label}-${point.team}-${idx}`}
															>
																<span className="text-muted-foreground">
																	{point.label}
																</span>
																<span
																	className={cn(
																		"font-medium",
																		point.team === "re"
																			? "text-blue-600"
																			: "text-orange-600",
																	)}
																>
																	{point.team === "re" ? "Re" : "Ko"} +
																	{point.value}
																</span>
															</div>
														),
													)}
													<div className="mt-1 flex items-center justify-between border-t pt-1 font-bold text-sm">
														<span>Gesamt</span>
														<span>
															{gpr.netGamePoints > 0
																? "Re"
																: gpr.netGamePoints < 0
																	? "Kontra"
																	: "Unentschieden"}{" "}
															{gpr.netGamePoints !== 0 &&
																`${Math.abs(gpr.netGamePoints)} Punkt${Math.abs(gpr.netGamePoints) !== 1 ? "e" : ""}`}
														</span>
													</div>
												</div>
											</div>
										)}
									</>
								);
							})()}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
