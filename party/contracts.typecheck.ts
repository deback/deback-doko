import type { z } from "zod";
import type {
	gameEventSchema,
	gameMessageSchema,
	tableEventSchema,
} from "./schemas";
import type { GameEvent, GameMessage, TableEvent } from "./types";

type Assert<T extends true> = T;

type SchemaGameEvent = z.infer<typeof gameEventSchema>;
type SchemaGameMessage = z.infer<typeof gameMessageSchema>;
type SchemaTableEvent = z.infer<typeof tableEventSchema>;

type _GameEventSchemaToType = Assert<
	SchemaGameEvent extends GameEvent ? true : false
>;
type _GameEventTypeToSchema = Assert<
	GameEvent extends SchemaGameEvent ? true : false
>;
type _GameMessageSchemaToType = Assert<
	SchemaGameMessage extends GameMessage ? true : false
>;
type _GameMessageTypeToSchema = Assert<
	GameMessage extends SchemaGameMessage ? true : false
>;
type _TableEventSchemaToType = Assert<
	SchemaTableEvent extends TableEvent ? true : false
>;
type _TableEventTypeToSchema = Assert<
	TableEvent extends SchemaTableEvent ? true : false
>;
