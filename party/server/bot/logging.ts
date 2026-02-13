import { logger } from "../../logger";
import type { BotDecisionLog } from "./types";

export function logBotDecision(entry: BotDecisionLog): void {
	logger.info("[bot-decision]", JSON.stringify(entry));
}
