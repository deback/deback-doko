"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
	useError,
	useGameState,
	useIsConnected,
} from "@/stores/game-selectors";
import type { Player } from "@/types/tables";
import { ConnectionLoadingCard } from "./connection-loading-card";
import { GameBoard } from "./game-board";
import { useAnnouncementAudio } from "./hooks/use-announcement-audio";
import { useConnectionLoadingState } from "./hooks/use-connection-loading-state";
import { useGameConnection } from "./hooks/use-game-connection";

interface GameContentProps {
	player: Player;
	gameId: string;
}

/**
 * GameContent - Innerer Content des Spiels
 *
 * Verwendet den Game Store für State-Management.
 * Zeigt Loading/Error States oder das Spielbrett.
 */
export function GameContent({ player, gameId }: GameContentProps) {
	// Initialize WebSocket connection and sync with store
	useGameConnection({ gameId, player });
	useAnnouncementAudio();

	// Read state from store
	const gameState = useGameState();
	const error = useError();
	const isConnected = useIsConnected();
	const loadingState = useConnectionLoadingState({
		isConnected,
		hasGameState: Boolean(gameState),
	});

	// Loading state
	if (!gameState) {
		return (
			<div className="flex h-dvh w-screen items-center justify-center">
				<ConnectionLoadingCard
					loadingState={loadingState}
					onBackToLobby={() => {
						window.location.href = "/tables";
					}}
					onRetry={() => window.location.reload()}
				/>
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

	// Game board (handles both player and spectator mode internally, including waiting state)
	return <GameBoard />;
}
