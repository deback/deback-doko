export type ChatAuthorRole = "player" | "spectator" | "system";

export interface ChatMessageAuthor {
	id: string;
	name: string;
	image?: string | null;
	role: ChatAuthorRole;
}

export interface ChatMessage {
	id: string;
	tableId: string;
	text: string;
	createdAt: number;
	author: ChatMessageAuthor;
}
