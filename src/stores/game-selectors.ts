/**
 * Game Store Selektoren
 *
 * Memoized Selektoren für abgeleitete States aus dem Game Store.
 * Vermeidet unnötige Re-Renders durch useMemo.
 */

import { useMemo } from "react";
import { getPlayableCards } from "@/lib/game/rules";
import { useGameStore } from "@/providers/game-store-provider";
import type { Card, ContractType } from "@/types/game";
import type { Player } from "@/types/tables";
import { sortHand } from "./sort-hand";

// =============================================================================
// Basis-Selektoren (direkte Store-Zugriffe)
// =============================================================================

/** Aktueller Spielzustand vom Server */
export const useGameState = () => useGameStore((s) => s.gameState);

/** Aktueller Spieler (der eingeloggte User) */
export const useCurrentPlayer = () => useGameStore((s) => s.currentPlayer);

/** Zuschauer-Modus aktiv */
export const useIsSpectator = () => useGameStore((s) => s.isSpectator);

/** WebSocket verbunden */
export const useIsConnected = () => useGameStore((s) => s.isConnected);

/** Fehlermeldung */
export const useError = () => useGameStore((s) => s.error);

// =============================================================================
// Abgeleitete Selektoren (memoized)
// =============================================================================

/**
 * Ist der aktuelle Spieler am Zug?
 */
export function useIsMyTurn(): boolean {
	const gameState = useGameStore((s) => s.gameState);
	const currentPlayer = useGameStore((s) => s.currentPlayer);

	return useMemo(() => {
		if (!gameState || !currentPlayer) return false;
		const currentTurnPlayer = gameState.players[gameState.currentPlayerIndex];
		return currentTurnPlayer?.id === currentPlayer.id;
	}, [gameState, currentPlayer]);
}

/**
 * Karten des aktuellen Spielers (unsortiert)
 */
export function useMyHand(): Card[] {
	const gameState = useGameStore((s) => s.gameState);
	const currentPlayer = useGameStore((s) => s.currentPlayer);

	return useMemo(() => {
		if (!gameState || !currentPlayer) return [];
		return gameState.hands[currentPlayer.id] ?? [];
	}, [gameState, currentPlayer]);
}

/**
 * Sortierte Hand des aktuellen Spielers
 * Nutzt previewTrumpMode (falls gesetzt) für Vorschau-Sortierung bei Solo-Auswahl
 */
export function useSortedHand(): Card[] {
	const hand = useMyHand();
	const gameState = useGameStore((s) => s.gameState);
	const currentPlayer = useGameStore((s) => s.currentPlayer);
	const previewTrumpMode = useGameStore((s) => s.previewTrumpMode);

	return useMemo(() => {
		if (!gameState || !currentPlayer || hand.length === 0) return [];
		const trump = previewTrumpMode ?? gameState.trump;
		const schweinereiPlayerId = gameState.schweinereiPlayers[0] ?? null;
		return sortHand(hand, trump, schweinereiPlayerId, currentPlayer.id);
	}, [hand, gameState, currentPlayer, previewTrumpMode]);
}

/**
 * IDs der spielbaren Karten
 */
export function usePlayableCardIds(): string[] {
	const sortedHand = useSortedHand();
	const gameState = useGameStore((s) => s.gameState);

	return useMemo(() => {
		if (!gameState || sortedHand.length === 0) return [];
		const playable = getPlayableCards(
			sortedHand,
			gameState.currentTrick,
			gameState.trump,
		);
		return playable.map((c) => c.id);
	}, [sortedHand, gameState]);
}

/**
 * Spieler an einer bestimmten Position (relativ zum aktuellen Spieler)
 * Position: 0 = unten (aktueller Spieler), 1 = links, 2 = oben, 3 = rechts
 */
export function usePlayerAtPosition(position: 0 | 1 | 2 | 3): Player | null {
	const gameState = useGameStore((s) => s.gameState);
	const currentPlayer = useGameStore((s) => s.currentPlayer);

	return useMemo(() => {
		if (!gameState || !currentPlayer) return null;
		// Bei weniger als 4 Spielern: keine Wraparound-Duplikate
		if (position >= gameState.players.length) return null;
		let currentIdx = gameState.players.findIndex(
			(p) => p.id === currentPlayer.id,
		);
		// Spectators: Ansicht aus Perspektive von Spieler 0
		if (currentIdx === -1) currentIdx = 0;
		const targetIdx = (currentIdx + position) % gameState.players.length;
		return gameState.players[targetIdx] ?? null;
	}, [gameState, currentPlayer, position]);
}

/**
 * Team des aktuellen Spielers
 */
export function useMyTeam(): "re" | "kontra" | null {
	const gameState = useGameStore((s) => s.gameState);
	const currentPlayer = useGameStore((s) => s.currentPlayer);

	return useMemo(() => {
		if (!gameState || !currentPlayer) return null;
		return gameState.teams[currentPlayer.id] ?? null;
	}, [gameState, currentPlayer]);
}

/**
 * Ansagen eines Spielers
 */
export function usePlayerAnnouncements(playerId: string) {
	const gameState = useGameStore((s) => s.gameState);

	return useMemo(() => {
		if (!gameState) return null;

		const team = gameState.teams[playerId];
		if (!team) return null;

		const teamAnnouncement =
			team === "re"
				? gameState.announcements.re
				: gameState.announcements.kontra;

		const pointAnnouncements =
			team === "re"
				? gameState.announcements.rePointAnnouncements
				: gameState.announcements.kontraPointAnnouncements;

		const playerPointAnnouncements = pointAnnouncements.filter(
			(a) => a.by === playerId,
		);

		return {
			team,
			badge: team === "re" ? "Re" : "Kontra",
			hasAnnounced:
				teamAnnouncement.announced && teamAnnouncement.by === playerId,
			teamHasAnnounced: teamAnnouncement.announced,
			pointAnnouncements: playerPointAnnouncements,
		};
	}, [gameState, playerId]);
}

/**
 * Ist der aktuelle Spieler aufgestanden (will nach der Runde den Tisch verlassen)?
 */
export function useIsStandingUp(): boolean {
	const gameState = useGameStore((s) => s.gameState);
	const currentPlayer = useGameStore((s) => s.currentPlayer);

	return useMemo(() => {
		if (!gameState || !currentPlayer) return false;
		return gameState.standingUpPlayers?.includes(currentPlayer.id) ?? false;
	}, [gameState, currentPlayer]);
}

/**
 * Hat der Stich bereits begonnen?
 */
export function useHasTrickStarted(): boolean {
	const gameState = useGameStore((s) => s.gameState);

	return useMemo(() => {
		if (!gameState) return false;
		return gameState.currentTrick.cards.length > 0;
	}, [gameState]);
}

/**
 * Hat der aktuelle Spieler bereits im Stich gespielt?
 */
export function useHasPlayerPlayedInTrick(): boolean {
	const gameState = useGameStore((s) => s.gameState);
	const currentPlayer = useGameStore((s) => s.currentPlayer);

	return useMemo(() => {
		if (!gameState || !currentPlayer) return false;
		return gameState.currentTrick.cards.some(
			(c) => c.playerId === currentPlayer.id,
		);
	}, [gameState, currentPlayer]);
}

/**
 * Ist die Bidding-Phase aktiv?
 */
export function useIsBiddingActive(): boolean {
	const gameState = useGameStore((s) => s.gameState);

	return useMemo(() => {
		return gameState?.biddingPhase?.active ?? false;
	}, [gameState]);
}

/**
 * Schweinerei-Spieler-ID (falls vorhanden)
 */
export function useSchweinereiPlayerId(): string | null {
	const gameState = useGameStore((s) => s.gameState);

	return useMemo(() => {
		return gameState?.schweinereiPlayers[0] ?? null;
	}, [gameState]);
}

/**
 * Welcher Spieler hat den aktiven Vertrag deklariert (Solo oder Hochzeit)?
 * Gibt null zurück bei normalen Spielen.
 */
export function useContractDeclarer(): {
	playerId: string;
	contractType: ContractType;
} | null {
	const gameState = useGameStore((s) => s.gameState);

	return useMemo(() => {
		if (!gameState) return null;
		const { contractType } = gameState;

		if (contractType === "normal") return null;

		if (contractType === "hochzeit" && gameState.hochzeit) {
			return {
				playerId: gameState.hochzeit.seekerPlayerId,
				contractType,
			};
		}

		if (contractType.startsWith("solo-")) {
			const soloistEntry = Object.entries(gameState.teams).find(
				([_, team]) => team === "re",
			);
			if (soloistEntry) {
				return {
					playerId: soloistEntry[0],
					contractType,
				};
			}
		}

		return null;
	}, [gameState]);
}

// =============================================================================
// Action Hooks (direkte Store-Zugriffe für Actions)
// =============================================================================

/** Karte spielen */
export const usePlayCard = () => useGameStore((s) => s.playCard);

/** Ansage machen (Re, Kontra, keine 90, etc.) */
export const useAnnounce = () => useGameStore((s) => s.announce);

/** Gebot abgeben (gesund/vorbehalt) */
export const useBid = () => useGameStore((s) => s.bid);

/** Spielart deklarieren (normal/hochzeit) */
export const useDeclareContract = () => useGameStore((s) => s.declareContract);

/** Automatisch spielen */
export const useAutoPlay = () => useGameStore((s) => s.autoPlay);

/** Alle restlichen Karten automatisch spielen */
export const useAutoPlayAll = () => useGameStore((s) => s.autoPlayAll);

/** Spiel zurücksetzen */
export const useResetGame = () => useGameStore((s) => s.resetGame);

/** Aufstehen/Platz nehmen umschalten */
export const useToggleStandUp = () => useGameStore((s) => s.toggleStandUp);

// =============================================================================
// Store Setter Hooks (für useGameConnection)
// =============================================================================

/** State Setter für useGameConnection */
export const useSetGameState = () => useGameStore((s) => s.setGameState);
export const useSetCurrentPlayer = () =>
	useGameStore((s) => s.setCurrentPlayer);
export const useSetSpectatorMode = () =>
	useGameStore((s) => s.setSpectatorMode);
export const useSetConnected = () => useGameStore((s) => s.setConnected);
export const useSetError = () => useGameStore((s) => s.setError);
export const useSetGameActions = () => useGameStore((s) => s.setGameActions);
export const useSetPreviewTrumpMode = () =>
	useGameStore((s) => s.setPreviewTrumpMode);
