import type * as Party from "partykit/server";
import { contractToTrumpMode, isTrump } from "../../../src/lib/game/rules";
import type {
	ContractType,
	GameState,
	ReservationType,
	Trick,
} from "../../types";
import type Server from "../game-lifecycle";

export async function handleBid(
	server: Server,
	playerId: string,
	bid: ReservationType,
	sender: Party.Connection,
) {
	const gameState = server.games.get(server.room.id);
	if (!gameState || !gameState.biddingPhase?.active) {
		server.sendGameError(sender, "Keine aktive Vorbehaltsabfrage.");
		return;
	}

	const currentBidder =
		gameState.players[gameState.biddingPhase.currentBidderIndex];
	if (!currentBidder || currentBidder.id !== playerId) {
		server.sendGameError(sender, "Du bist nicht an der Reihe.");
		return;
	}

	gameState.biddingPhase.bids[playerId] = bid;
	await server.advanceBidding(gameState);
}

export async function handleDeclareContract(
	server: Server,
	playerId: string,
	contract: ContractType,
	sender: Party.Connection,
) {
	const gameState = server.games.get(server.room.id);
	if (!gameState || !gameState.biddingPhase?.active) {
		server.sendGameError(sender, "Keine aktive Vorbehaltsabfrage.");
		return;
	}

	const awaiting = gameState.biddingPhase.awaitingContractDeclaration ?? [];
	if (!awaiting.includes(playerId)) {
		server.sendGameError(sender, "Du musst keinen Vorbehalt deklarieren.");
		return;
	}

	if (contract === "hochzeit") {
		const hand = gameState.hands[playerId];
		if (!hand) {
			server.sendGameError(sender, "Spieler nicht gefunden.");
			return;
		}
		const clubsQueens = hand.filter(
			(card) => card.suit === "clubs" && card.rank === "queen",
		);
		if (clubsQueens.length !== 2) {
			server.sendGameError(
				sender,
				"Du brauchst beide Kreuz-Damen für eine Hochzeit.",
			);
			return;
		}
	}

	gameState.biddingPhase.pendingContracts[playerId] = contract;
	const remaining = awaiting.filter((id) => id !== playerId);
	gameState.biddingPhase.awaitingContractDeclaration = remaining;

	if (remaining.length > 0) {
		await server.persistAndBroadcastGame(gameState);
		return;
	}

	gameState.biddingPhase.awaitingContractDeclaration = undefined;
	await server.persistAndBroadcastGame(gameState);

	setTimeout(() => {
		server.resolveBidding(gameState);
	}, 2000);
}

export function findAllUndeclaredVorbehalt(
	_server: Server,
	gameState: GameState,
): string[] {
	if (!gameState.biddingPhase) return [];
	const result: string[] = [];
	const forehandIndex = (gameState.round - 1) % gameState.players.length;
	for (let i = 0; i < gameState.players.length; i++) {
		const index = (forehandIndex + i) % gameState.players.length;
		const player = gameState.players[index];
		if (!player) continue;
		if (
			gameState.biddingPhase.bids[player.id] === "vorbehalt" &&
			!gameState.biddingPhase.pendingContracts[player.id]
		) {
			result.push(player.id);
		}
	}
	return result;
}

export async function advanceBidding(server: Server, gameState: GameState) {
	if (!gameState.biddingPhase) return;

	gameState.biddingPhase.currentBidderIndex =
		(gameState.biddingPhase.currentBidderIndex + 1) % gameState.players.length;

	if (
		Object.keys(gameState.biddingPhase.bids).length >= gameState.players.length
	) {
		const undeclared = server.findAllUndeclaredVorbehalt(gameState);
		if (undeclared.length > 0) {
			gameState.biddingPhase.awaitingContractDeclaration = undeclared;
			await server.persistAndBroadcastGame(gameState);
			return;
		}

		await server.persistAndBroadcastGame(gameState);

		setTimeout(() => {
			server.resolveBidding(gameState);
		}, 2000);
		return;
	}

	await server.persistAndBroadcastGame(gameState);
}

export async function resolveBidding(server: Server, gameState: GameState) {
	if (!gameState.biddingPhase) return;

	const { bids, pendingContracts } = gameState.biddingPhase;

	const vorbehaltPlayers = Object.entries(bids)
		.filter(([_, bid]) => bid === "vorbehalt")
		.map(([playerId]) => playerId);

	if (vorbehaltPlayers.length === 0) {
		await server.setupNormalGame(gameState);
		return;
	}

	function contractPriority(contract: ContractType): number {
		if (contract === "normal") return 0;
		if (contract === "hochzeit") return 1;
		return 2;
	}

	const forehandIndex = (gameState.round - 1) % gameState.players.length;

	let winningPlayerId: string | undefined;
	let winningContract: ContractType = "normal";
	let winningPriority = -1;
	let winningPosition = 99;

	for (const playerId of vorbehaltPlayers) {
		const contract = pendingContracts[playerId];
		if (!contract) continue;

		const priority = contractPriority(contract);
		const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
		const position =
			(playerIndex - forehandIndex + gameState.players.length) %
			gameState.players.length;

		if (
			priority > winningPriority ||
			(priority === winningPriority && position < winningPosition)
		) {
			winningPlayerId = playerId;
			winningContract = contract;
			winningPriority = priority;
			winningPosition = position;
		}
	}

	if (!winningPlayerId || winningContract === "normal") {
		await server.setupNormalGame(gameState);
		return;
	}

	if (winningContract === "hochzeit") {
		await server.setupHochzeit(gameState, winningPlayerId);
	} else {
		await server.setupSolo(gameState, winningPlayerId, winningContract);
	}
}

export async function setupNormalGame(server: Server, gameState: GameState) {
	gameState.contractType = "normal";
	gameState.biddingPhase = undefined;

	await server.persistAndBroadcastGame(gameState);
}

export async function setupSolo(
	server: Server,
	gameState: GameState,
	soloistId: string,
	contract: ContractType,
) {
	gameState.contractType = contract;
	gameState.trump = contractToTrumpMode(contract);

	for (const player of gameState.players) {
		gameState.teams[player.id] = player.id === soloistId ? "re" : "kontra";
	}

	gameState.schweinereiPlayers = [];
	gameState.biddingPhase = undefined;

	await server.persistAndBroadcastGame(gameState);
}

export async function setupHochzeit(
	server: Server,
	gameState: GameState,
	seekerPlayerId: string,
) {
	gameState.contractType = "hochzeit";
	gameState.hochzeit = {
		active: true,
		seekerPlayerId,
		clarificationTrickNumber: 3,
		resolvedClarificationTrickNumber: undefined,
	};

	for (const player of gameState.players) {
		gameState.teams[player.id] = player.id === seekerPlayerId ? "re" : "kontra";
	}

	gameState.biddingPhase = undefined;

	await server.persistAndBroadcastGame(gameState);
}

export function checkHochzeitPartner(
	_server: Server,
	gameState: GameState,
	trick: Trick,
	winnerId: string,
	trickNumber: number,
) {
	if (!gameState.hochzeit) return;

	const seekerId = gameState.hochzeit.seekerPlayerId;

	const firstCard = trick.cards[0]?.card;
	if (!firstCard) return;

	const isFehlStich = !isTrump(firstCard, gameState.trump);

	if (isFehlStich && winnerId !== seekerId) {
		const resolvedTrick = Math.min(Math.max(trickNumber, 1), 3) as 1 | 2 | 3;
		gameState.hochzeit.partnerPlayerId = winnerId;
		gameState.hochzeit.active = false;
		gameState.hochzeit.resolvedClarificationTrickNumber = resolvedTrick;

		gameState.teams[seekerId] = "re";
		gameState.teams[winnerId] = "re";
		for (const player of gameState.players) {
			if (player.id !== seekerId && player.id !== winnerId) {
				gameState.teams[player.id] = "kontra";
			}
		}
	} else if (trickNumber >= gameState.hochzeit.clarificationTrickNumber) {
		gameState.hochzeit.active = false;
		gameState.hochzeit.resolvedClarificationTrickNumber = gameState.hochzeit
			.clarificationTrickNumber as 1 | 2 | 3;
	}
}
