"use client";

import { CardDesignProvider } from "@/lib/hooks/use-card-design";
import { GameStoreProvider } from "@/providers/game-store-provider";
import type { Player } from "@/types/tables";
import { GameContent } from "./game-content";

interface GameClientProps {
	player: Player;
	gameId: string;
	isSpectator?: boolean;
}

/**
 * GameClient - Haupteinstiegspunkt für das Spiel
 *
 * Wrapped den GameContent mit dem GameStoreProvider und CardDesignProvider.
 * Der Store wird pro Game-Session erstellt.
 */
export function GameClient({
	player,
	gameId,
	isSpectator = false,
}: GameClientProps) {
	return (
		<GameStoreProvider initialState={{ currentPlayer: player, isSpectator }}>
			<CardDesignProvider>
				<GameContent
					gameId={gameId}
					player={player}
					isSpectator={isSpectator}
				/>
			</CardDesignProvider>
		</GameStoreProvider>
	);
}
