"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Player } from "@/types/tables";
import { GameBoard } from "./game-board";
import { useGameConnection } from "./hooks/use-game-connection";
import { SpectatorBoard } from "./spectator-board";

interface GameClientProps {
	player: Player;
	gameId: string;
	isSpectator?: boolean;
}

export function GameClient({
	player,
	gameId,
	isSpectator = false,
}: GameClientProps) {
	const {
		gameState,
		error,
		isConnected,
		isSpectator: spectatorMode,
		playCard,
	} = useGameConnection({
		gameId,
		player,
		isSpectator,
	});

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

	// Render spectator view if in spectator mode
	if (spectatorMode) {
		return <SpectatorBoard gameState={gameState} />;
	}

	return (
		<GameBoard
			currentPlayer={player}
			gameState={gameState}
			playCard={playCard}
		/>
	);
}
