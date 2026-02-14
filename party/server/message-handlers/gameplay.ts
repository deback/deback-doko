import type * as Party from "partykit/server";
import { canPlayCard, getPlayableCards } from "../../../src/lib/game/rules";
import { TRICK_ANIMATION_DELAY } from "../../../src/lib/trick-animation";
import { canMakeAnnouncement } from "../../announcements";
import { calculateGamePoints } from "../../game-scoring";
import {
	calculateTrickPoints,
	determineTrickWinner,
} from "../../trick-scoring";
import type {
	AnnouncementType,
	GameState,
	PointAnnouncement,
	PointAnnouncementType,
} from "../../types";
import type Server from "../game-lifecycle";

const GAME_END_DIALOG_DELAY_MS = 1_000;
const RESTART_DELAY_MS = 5_000;

export async function handleAnnouncement(
	server: Server,
	announcement: AnnouncementType,
	playerId: string,
	sender: Party.Connection,
) {
	const gameState = server.games.get(server.room.id);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
		server.sendGameError(sender, "Spiel läuft nicht.");
		return;
	}

	if (gameState.biddingPhase?.active) {
		server.sendGameError(
			sender,
			"Ansagen sind während der Vorbehaltsabfrage nicht erlaubt.",
		);
		return;
	}

	const validation = canMakeAnnouncement(gameState, playerId, announcement);
	if (!validation.allowed) {
		server.sendGameError(sender, validation.reason || "Ansage nicht erlaubt.");
		return;
	}

	const playerTeam = gameState.teams[playerId];

	if (announcement === "re") {
		gameState.announcements.re = { announced: true, by: playerId };
	} else if (announcement === "kontra") {
		gameState.announcements.kontra = { announced: true, by: playerId };
	} else {
		const announcementOrder: PointAnnouncementType[] = [
			"no90",
			"no60",
			"no30",
			"schwarz",
		];
		const requestedIndex = announcementOrder.indexOf(
			announcement as PointAnnouncementType,
		);

		const teamPointAnnouncements =
			playerTeam === "re"
				? gameState.announcements.rePointAnnouncements
				: gameState.announcements.kontraPointAnnouncements;

		for (let i = 0; i <= requestedIndex; i++) {
			const announcementToAdd = announcementOrder[i];
			if (
				announcementToAdd &&
				!teamPointAnnouncements.some((pa) => pa.type === announcementToAdd)
			) {
				const pointAnnouncement: PointAnnouncement = {
					type: announcementToAdd,
					by: playerId,
				};
				teamPointAnnouncements.push(pointAnnouncement);
			}
		}
	}

	await server.persistAndBroadcastGame(gameState);
}

export async function playCard(
	server: Server,
	cardId: string,
	playerId: string,
	sender: Party.Connection,
) {
	const gameState = server.games.get(server.room.id);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
		server.sendGameError(sender, "Spiel wurde noch nicht gestartet.");
		return;
	}

	if (gameState.biddingPhase?.active) {
		server.sendGameError(sender, "Vorbehaltsabfrage läuft noch.");
		return;
	}

	if (
		gameState.currentTrick.completed ||
		gameState.currentTrick.cards.length >= 4
	) {
		return;
	}

	const currentPlayer = gameState.players[gameState.currentPlayerIndex];
	if (!currentPlayer || currentPlayer.id !== playerId) {
		server.sendGameError(sender, "Du bist nicht dran.");
		return;
	}

	const hand = gameState.hands[currentPlayer.id];
	if (!hand) {
		server.sendGameError(sender, "Spieler nicht gefunden.");
		return;
	}

	const cardIndex = hand.findIndex((c) => c.id === cardId);
	if (cardIndex === -1) {
		server.sendGameError(sender, "Karte nicht gefunden.");
		return;
	}

	const card = hand[cardIndex];
	if (!card) {
		server.sendGameError(sender, "Karte nicht gefunden.");
		return;
	}

	if (!canPlayCard(card, hand, gameState.currentTrick, gameState.trump)) {
		server.sendGameError(sender, "Du musst die angespielte Farbe bedienen.");
		return;
	}

	hand.splice(cardIndex, 1);
	gameState.handCounts[currentPlayer.id] = hand.length;

	gameState.currentTrick.cards.push({
		card,
		playerId: currentPlayer.id,
	});

	if (gameState.currentTrick.cards.length === 4) {
		await server.completeTrick(gameState);
	} else {
		gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
		await server.persistAndBroadcastGame(gameState);
	}
}

export async function completeTrick(server: Server, gameState: GameState) {
	const trick = gameState.currentTrick;
	const isLastTrick = gameState.completedTricks.length === 11;
	const trickNumber = gameState.completedTricks.length + 1;
	const winner = determineTrickWinner(
		trick,
		gameState.trump,
		gameState.schweinereiPlayers,
		isLastTrick,
	);
	trick.winnerId = winner;
	trick.completed = true;

	if (gameState.hochzeit?.active && !gameState.hochzeit.partnerPlayerId) {
		server.checkHochzeitPartner(gameState, trick, winner, trickNumber);
	}

	const trickPoints = calculateTrickPoints(trick);
	trick.points = trickPoints;

	if (winner && !gameState.scores[winner]) {
		gameState.scores[winner] = 0;
	}
	if (winner) {
		gameState.scores[winner] = (gameState.scores[winner] || 0) + trickPoints;
	}

	await server.persistAndBroadcastGame(gameState);

	setTimeout(async () => {
		gameState.completedTricks.push({ ...trick });
		gameState.currentPlayerIndex = gameState.players.findIndex(
			(p) => p.id === winner,
		);
		gameState.currentTrick = {
			cards: [],
			completed: false,
		};

		if (gameState.completedTricks.length >= 12) {
			await server.persistAndBroadcastGame(gameState);

			setTimeout(async () => {
				gameState.gameEnded = true;
				gameState.gamePointsResult = calculateGamePoints(gameState);
				server.saveGameResults(gameState);

				await server.persistAndBroadcastGame(gameState);

				setTimeout(() => {
					server.restartGame(gameState);
				}, RESTART_DELAY_MS);
			}, GAME_END_DIALOG_DELAY_MS);
			return;
		}

		await server.persistAndBroadcastGame(gameState);
	}, TRICK_ANIMATION_DELAY);
}

export async function autoPlay(server: Server, sender: Party.Connection) {
	if (process.env.NODE_ENV !== "development") {
		server.sendGameError(sender, "Auto-Play ist nur in Development verfügbar.");
		return;
	}

	const gameState = server.games.get(server.room.id);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) {
		server.sendGameError(sender, "Spiel läuft nicht.");
		return;
	}

	if (
		gameState.currentTrick.completed ||
		gameState.currentTrick.cards.length >= 4
	) {
		return;
	}

	if (gameState.biddingPhase?.active) {
		const awaitingPlayers = gameState.biddingPhase.awaitingContractDeclaration;
		const firstAwaiting = awaitingPlayers?.[0];
		if (firstAwaiting) {
			await server.handleDeclareContract(firstAwaiting, "normal", sender);
			return;
		}
		const currentBidder =
			gameState.players[gameState.biddingPhase.currentBidderIndex];
		if (currentBidder) {
			await server.handleBid(currentBidder.id, "gesund", sender);
		}
		return;
	}

	const currentPlayer = gameState.players[gameState.currentPlayerIndex];
	if (!currentPlayer) {
		server.sendGameError(sender, "Kein aktueller Spieler.");
		return;
	}

	const hand = gameState.hands[currentPlayer.id];
	if (!hand || hand.length === 0) {
		server.sendGameError(sender, "Keine Karten auf der Hand.");
		return;
	}

	const playableCards = getPlayableCards(
		hand,
		gameState.currentTrick,
		gameState.trump,
	);
	const cardToPlay = playableCards[0];
	if (!cardToPlay) {
		server.sendGameError(sender, "Keine spielbare Karte gefunden.");
		return;
	}

	await server.playCard(cardToPlay.id, currentPlayer.id, sender);
}

export async function autoPlayAll(server: Server, sender: Party.Connection) {
	if (process.env.NODE_ENV !== "development") {
		server.sendGameError(
			sender,
			"Auto-Play-All ist nur in Development verfügbar.",
		);
		return;
	}

	const gameState = server.games.get(server.room.id);
	if (!gameState || !gameState.gameStarted || gameState.gameEnded) return;

	if (
		gameState.currentTrick.completed ||
		gameState.currentTrick.cards.length >= 4
	) {
		return;
	}

	while (gameState.biddingPhase?.active) {
		const awaitingPlayers = gameState.biddingPhase.awaitingContractDeclaration;
		const firstAwaiting = awaitingPlayers?.[0];
		if (firstAwaiting) {
			await server.handleDeclareContract(firstAwaiting, "normal", sender);
			continue;
		}
		const currentBidder =
			gameState.players[gameState.biddingPhase.currentBidderIndex];
		if (currentBidder) {
			await server.handleBid(currentBidder.id, "gesund", sender);
		}
	}

	while (!gameState.gameEnded && gameState.completedTricks.length < 12) {
		while (gameState.currentTrick.cards.length < 4) {
			const currentPlayer = gameState.players[gameState.currentPlayerIndex];
			if (!currentPlayer) break;
			const hand = gameState.hands[currentPlayer.id];
			if (!hand || hand.length === 0) break;

			const playableCards = getPlayableCards(
				hand,
				gameState.currentTrick,
				gameState.trump,
			);
			const card = playableCards[0];
			if (!card) break;

			const cardIndex = hand.findIndex((c) => c.id === card.id);
			hand.splice(cardIndex, 1);
			gameState.handCounts[currentPlayer.id] = hand.length;
			gameState.currentTrick.cards.push({
				card,
				playerId: currentPlayer.id,
			});

			if (gameState.currentTrick.cards.length < 4) {
				gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % 4;
			}
		}

		const trick = gameState.currentTrick;
		const isLastTrick = gameState.completedTricks.length === 11;
		const trickNumber = gameState.completedTricks.length + 1;
		const winner = determineTrickWinner(
			trick,
			gameState.trump,
			gameState.schweinereiPlayers,
			isLastTrick,
		);
		trick.winnerId = winner;
		trick.completed = true;

		if (gameState.hochzeit?.active && !gameState.hochzeit.partnerPlayerId) {
			server.checkHochzeitPartner(gameState, trick, winner, trickNumber);
		}

		const trickPoints = calculateTrickPoints(trick);
		trick.points = trickPoints;
		if (winner) {
			gameState.scores[winner] = (gameState.scores[winner] || 0) + trickPoints;
		}

		gameState.completedTricks.push({ ...trick });
		gameState.currentPlayerIndex = gameState.players.findIndex(
			(p) => p.id === winner,
		);
		gameState.currentTrick = { cards: [], completed: false };

		if (gameState.completedTricks.length >= 12) {
			gameState.gameEnded = true;
			gameState.gamePointsResult = calculateGamePoints(gameState);
			server.saveGameResults(gameState);
		}
	}

	await server.persistAndBroadcastGame(gameState);

	if (gameState.gameEnded) {
		setTimeout(() => {
			server.restartGame(gameState);
		}, RESTART_DELAY_MS);
	}
}
