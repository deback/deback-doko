import type {
	AnnouncementType,
	ContractType,
	GameState,
	ReservationType,
} from "../../types";

export const BOT_DISCONNECT_GRACE_MS = 30_000;
export const BOT_TURN_TIMEOUT_MS = 8_000;
export const BOT_TURN_DELAY_MS = 250;

export type BotActionType =
	| "bid"
	| "declare-contract"
	| "announce"
	| "play-card";

export interface BotDecisionBase {
	type: BotActionType;
	reasonCode: string;
}

export interface BotBidDecision extends BotDecisionBase {
	type: "bid";
	bid: ReservationType;
}

export interface BotDeclareContractDecision extends BotDecisionBase {
	type: "declare-contract";
	contract: ContractType;
}

export interface BotAnnouncementDecision extends BotDecisionBase {
	type: "announce";
	announcement: AnnouncementType;
}

export interface BotPlayCardDecision extends BotDecisionBase {
	type: "play-card";
	cardId: string;
}

export type BotDecision =
	| BotBidDecision
	| BotDeclareContractDecision
	| BotAnnouncementDecision
	| BotPlayCardDecision;

export interface BotDecisionLog {
	gameId: string;
	playerId: string;
	phase: "bidding" | "contract" | "announcement" | "play-card";
	decision: string;
	reasonCode: string;
	durationMs: number;
	fallbackUsed: boolean;
}

export function getDecisionPhase(
	gameState: GameState,
): BotDecisionLog["phase"] {
	if (gameState.biddingPhase?.active) {
		if (gameState.biddingPhase.awaitingContractDeclaration?.length) {
			return "contract";
		}
		return "bidding";
	}

	if (gameState.currentTrick.completed) {
		return "announcement";
	}

	return "play-card";
}
