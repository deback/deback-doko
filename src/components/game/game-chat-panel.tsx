"use client";

import { MessageSquare, Send } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
	useChatCooldownUntil,
	useChatLocalError,
	useChatMessages,
	useCurrentPlayer,
	useSendChatMessage,
	useSetChatCooldownUntil,
	useSetChatLocalError,
} from "@/stores/game-selectors";

const MAX_CHAT_LENGTH = 500;
const CHAT_COOLDOWN_MS = 1_000;

export function GameChatPanel() {
	const currentPlayer = useCurrentPlayer();
	const chatMessages = useChatMessages();
	const chatCooldownUntil = useChatCooldownUntil();
	const chatLocalError = useChatLocalError();
	const sendChatMessage = useSendChatMessage();
	const setChatCooldownUntil = useSetChatCooldownUntil();
	const setChatLocalError = useSetChatLocalError();

	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState("");
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [unreadCount, setUnreadCount] = useState(0);
	const chatTextareaId = useId();
	const messagesEndRef = useRef<HTMLDivElement | null>(null);
	const previousMessageCountRef = useRef(chatMessages.length);
	const normalizedDraft = draft.trim();
	const remainingCooldownMs = Math.max(0, (chatCooldownUntil ?? 0) - nowMs);
	const isCooldownActive = remainingCooldownMs > 0;
	const canSend =
		normalizedDraft.length > 0 &&
		normalizedDraft.length <= MAX_CHAT_LENGTH &&
		!isCooldownActive;

	const timeFormatter = useMemo(
		() =>
			new Intl.DateTimeFormat("de-DE", {
				hour: "2-digit",
				minute: "2-digit",
			}),
		[],
	);

	useEffect(() => {
		const previousCount = previousMessageCountRef.current;
		if (chatMessages.length > previousCount && !open) {
			const newMessages = chatMessages.slice(previousCount);
			const incomingCount = newMessages.filter(
				(message) => message.author.id !== currentPlayer?.id,
			).length;
			if (incomingCount > 0) {
				setUnreadCount((count) => count + incomingCount);
			}
		}

		previousMessageCountRef.current = chatMessages.length;
	}, [chatMessages, open, currentPlayer?.id]);

	useEffect(() => {
		if (!open) return;
		setUnreadCount(0);
		const hasMessages = chatMessages.length > 0;
		if (!hasMessages) return;
		const id = window.requestAnimationFrame(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		});
		return () => window.cancelAnimationFrame(id);
	}, [open, chatMessages]);

	useEffect(() => {
		if (!chatCooldownUntil) return;
		if (chatCooldownUntil <= Date.now()) {
			setChatCooldownUntil(null);
			return;
		}

		setNowMs(Date.now());
		const intervalId = window.setInterval(() => {
			const currentNow = Date.now();
			setNowMs(currentNow);
			if (currentNow >= chatCooldownUntil) {
				setChatCooldownUntil(null);
			}
		}, 100);

		return () => window.clearInterval(intervalId);
	}, [chatCooldownUntil, setChatCooldownUntil]);

	function onSendMessage() {
		if (!canSend) return;
		sendChatMessage(normalizedDraft);
		setChatLocalError(null);
		setChatCooldownUntil(Date.now() + CHAT_COOLDOWN_MS);
		setNowMs(Date.now());
		setDraft("");
	}

	return (
		<Sheet onOpenChange={setOpen} open={open}>
			<SheetTrigger asChild>
				<Button
					aria-label="Chat öffnen"
					className="fixed relative top-1/2 right-4 z-50 -translate-y-1/2 rounded-full shadow-lg"
					size="icon-lg"
					variant="secondary"
				>
					<MessageSquare className="size-5" />
					{unreadCount > 0 && (
						<Badge className="absolute -top-1 -right-1 px-1.5 py-0 text-[10px]">
							{unreadCount}
						</Badge>
					)}
				</Button>
			</SheetTrigger>

			<SheetContent className="flex h-full flex-col p-0" side="right">
				<SheetHeader className="border-b p-4 pr-10">
					<SheetTitle>Tisch-Chat</SheetTitle>
					<SheetDescription>
						Alle Spieler und Zuschauer an diesem Tisch können schreiben.
					</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
					<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
						{chatMessages.length === 0 ? (
							<Card className="border-dashed py-4 text-center text-muted-foreground text-sm shadow-none">
								Noch keine Nachrichten.
							</Card>
						) : (
							chatMessages.map((message) => {
								const isSystem = message.author.role === "system";
								const isOwnMessage =
									!isSystem && message.author.id === currentPlayer?.id;

								if (isSystem) {
									return (
										<div
											className="px-2 py-1 text-center text-muted-foreground text-xs"
											key={message.id}
										>
											{message.text}
										</div>
									);
								}

								return (
									<div
										className={`flex items-end gap-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}
										key={message.id}
									>
										{!isOwnMessage && (
											<Avatar
												alt={message.author.name}
												fallback={message.author.name.charAt(0).toUpperCase()}
												size="xs"
												src={message.author.image}
											/>
										)}
										<Card
											className={`max-w-[80%] gap-2 px-3 py-2 shadow-sm ${
												isOwnMessage
													? "bg-primary text-primary-foreground"
													: "bg-background"
											}`}
										>
											<div
												className={`text-[11px] ${
													isOwnMessage
														? "text-primary-foreground/80"
														: "text-muted-foreground"
												}`}
											>
												{message.author.name} ·{" "}
												{timeFormatter.format(message.createdAt)}
											</div>
											<div className="whitespace-pre-wrap break-words text-sm">
												{message.text}
											</div>
										</Card>
									</div>
								);
							})
						)}
						<div ref={messagesEndRef} />
					</div>

					<Card className="flex flex-row items-end gap-2 p-3 shadow-none">
						<Textarea
							className="resize-none"
							id={chatTextareaId}
							maxLength={MAX_CHAT_LENGTH}
							name="table-chat-message"
							onChange={(event) => {
								setDraft(event.target.value);
								setChatLocalError(null);
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter" && !event.shiftKey) {
									event.preventDefault();
									onSendMessage();
								}
							}}
							placeholder="Nachricht schreiben..."
							rows={3}
							value={draft}
						/>
						<div className="flex items-center justify-between">
							{/*<span className="text-muted-foreground text-xs">
								{normalizedDraft.length}/{MAX_CHAT_LENGTH}
							</span>*/}
							<Button disabled={!canSend} onClick={onSendMessage} size="icon">
								<Send className="size-4" />
							</Button>
						</div>
						{chatLocalError && (
							<p className="text-destructive text-xs">{chatLocalError}</p>
						)}
					</Card>
				</div>
			</SheetContent>
		</Sheet>
	);
}
