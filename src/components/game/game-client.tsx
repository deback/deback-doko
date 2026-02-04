"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Player } from "@/types/tables";
import { GameBoard } from "./game-board";
import { useGameConnection } from "./hooks/use-game-connection";

interface GameClientProps {
	player: Player;
	gameId: string;
}

export function GameClient({ player, gameId }: GameClientProps) {
	const { gameState, error, isConnected, playCard } = useGameConnection({
		gameId,
		player,
	});

	if (!gameState) {
		return (
			<div className="flex h-dvh w-screen items-center justify-center bg-wood">
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
			<div className="flex h-dvh w-screen items-center justify-center bg-wood">
				<Card className="border-destructive bg-black/40 text-white backdrop-blur-sm">
					<CardContent className="pt-6">
						<p className="text-center text-red-400">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<GameBoard
			currentPlayer={player}
			gameState={gameState}
			playCard={playCard}
		/>
	);
}
