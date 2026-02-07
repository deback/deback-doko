import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTableCreator,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `deback-doko_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.text().primaryKey(),
		name: d.varchar({ length: 256 }),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => user.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);

export const user = createTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified")
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
	balance: integer("balance").default(5000).notNull(),
	gamesPlayed: integer("games_played").default(0).notNull(),
	gamesWon: integer("games_won").default(0).notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const session = createTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const account = createTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = createTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
	updatedAt: timestamp("updated_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
});

export const gameResult = createTable("game_result", {
	id: text("id").primaryKey(),
	tableId: text("table_id").notNull(),
	tricks: jsonb("tricks"),
	initialHands: jsonb("initial_hands"),
	announcements: jsonb("announcements"),
	contractType: text("contract_type"),
	schweinereiPlayers: jsonb("schweinerei_players"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
});

export const playerGameResult = createTable(
	"player_game_result",
	(d) => ({
		gameResultId: d
			.text("game_result_id")
			.notNull()
			.references(() => gameResult.id),
		userId: d
			.text("user_id")
			.notNull()
			.references(() => user.id),
		score: d.integer().notNull(),
		team: d.text().notNull(), // "re" | "kontra"
		won: d.boolean().notNull(),
		balanceChange: d.integer("balance_change").notNull(),
	}),
	(t) => [
		primaryKey({ columns: [t.gameResultId, t.userId] }),
		index("player_game_result_user_idx").on(t.userId),
		index("player_game_result_game_idx").on(t.gameResultId),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	account: many(account),
	session: many(session),
	playerGameResults: many(playerGameResult),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const gameResultRelations = relations(gameResult, ({ many }) => ({
	playerResults: many(playerGameResult),
}));

export const playerGameResultRelations = relations(
	playerGameResult,
	({ one }) => ({
		gameResult: one(gameResult, {
			fields: [playerGameResult.gameResultId],
			references: [gameResult.id],
		}),
		user: one(user, {
			fields: [playerGameResult.userId],
			references: [user.id],
		}),
	}),
);
