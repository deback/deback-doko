"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
	useError,
	useGameState,
	useIsConnected,
	useIsSpectator,
} from "@/stores/game-selectors";
import type { Player } from "@/types/tables";
import { GameBoard } from "./game-board";
import { useGameConnection } from "./hooks/use-game-connection";
import { SpectatorBoard } from "./spectator-board";

interface GameContentProps {
	player: Player;
	gameId: string;
	isSpectator?: boolean;
}

/**
 * GameContent - Innerer Content des Spiels
 *
 * Verwendet den Game Store für State-Management.
 * Zeigt Loading/Error States oder das Spielbrett.
 */
export function GameContent({
	player,
	gameId,
	isSpectator = false,
}: GameContentProps) {
	// Initialize WebSocket connection and sync with store
	useGameConnection({
		gameId,
		player,
		isSpectator,
	});

	// Read state from store
	const gameState = useGameState();
	const error = useError();
	const isConnected = useIsConnected();
	const spectatorMode = useIsSpectator();

	// Loading state
	if (!gameState) {
		return (
			<div className="flex h-dvh w-screen items-center justify-center">
				<Card className="border-none bg-black/40 text-white backdrop-blur-sm">
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
							<p className="text-white/80">
								{isConnected ? "Warte auf Spielstart..." : "Verbinde..."}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex h-dvh w-screen items-center justify-center">
				<Card className="border-destructive bg-black/40 text-white backdrop-blur-sm">
					<CardContent className="pt-6">
						<p className="text-center text-red-400">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Spectator view
	if (spectatorMode) {
		return <SpectatorBoard gameState={gameState} />;
	}

	// Main game board
	// Note: GameBoard still uses props for now (will be migrated to store selectors)
	return <GameBoard />;
}
