"use client";

import { MessageSquare, Send, XIcon } from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
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
	useChatHistoryVersion,
	useChatLocalError,
	useChatMessages,
	useChatPanelHydrated,
	useChatPanelOpen,
	useCurrentPlayer,
	useSendChatMessage,
	useSetChatCooldownUntil,
	useSetChatLocalError,
	useSetChatPanelOpen,
} from "@/stores/game-selectors";

const MAX_CHAT_LENGTH = 500;
const CHAT_COOLDOWN_MS = 1_000;
const SMOOTH_SCROLL_SNAP_DELAY_MS = 250;

export function GameChatPanel() {
	const currentPlayer = useCurrentPlayer();
	const chatMessages = useChatMessages();
	const chatHistoryVersion = useChatHistoryVersion();
	const chatCooldownUntil = useChatCooldownUntil();
	const chatLocalError = useChatLocalError();
	const chatPanelOpen = useChatPanelOpen();
	const chatPanelHydrated = useChatPanelHydrated();
	const sendChatMessage = useSendChatMessage();
	const setChatCooldownUntil = useSetChatCooldownUntil();
	const setChatLocalError = useSetChatLocalError();
	const setChatPanelOpen = useSetChatPanelOpen();
	const [draft, setDraft] = useState("");
	const [nowMs, setNowMs] = useState(() => Date.now());
	const [unreadCount, setUnreadCount] = useState(0);
	const [hasMounted, setHasMounted] = useState(false);
	const [disableInitialOpenAnimation, setDisableInitialOpenAnimation] =
		useState(false);
	const chatTextareaId = useId();
	const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
	const hasInitializedAnimationRef = useRef(false);
	const wasOpenRef = useRef(chatPanelOpen);
	const messagesContainerRef = useRef<HTMLDivElement | null>(null);
	const smoothSnapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const previousMessageCountRef = useRef(chatMessages.length);
	const previousOpenMessageCountRef = useRef(chatMessages.length);
	const lastHandledHistoryVersionRef = useRef(chatHistoryVersion);
	const normalizedDraft = draft.trim();
	const remainingCooldownMs = Math.max(0, (chatCooldownUntil ?? 0) - nowMs);
	const isCooldownActive = remainingCooldownMs > 0;
	const open = chatPanelOpen;
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

	const resizeTextarea = useCallback((element: HTMLTextAreaElement | null) => {
		if (!element) return;
		element.style.height = "auto";
		element.style.height = `${element.scrollHeight}px`;
	}, []);

	const clearSmoothSnapTimeout = useCallback(() => {
		if (smoothSnapTimeoutRef.current === null) return;
		clearTimeout(smoothSnapTimeoutRef.current);
		smoothSnapTimeoutRef.current = null;
	}, []);

	const scrollToBottomInstant = useCallback(
		(container: HTMLDivElement | null) => {
			if (!container) return;
			container.scrollTop = container.scrollHeight;
		},
		[],
	);

	const scrollToBottomSmoothWithSnap = useCallback(
		(container: HTMLDivElement | null) => {
			if (!container) return;
			clearSmoothSnapTimeout();
			container.scrollTo({
				top: container.scrollHeight,
				behavior: "smooth",
			});
			smoothSnapTimeoutRef.current = setTimeout(() => {
				window.requestAnimationFrame(() => {
					const currentContainer = messagesContainerRef.current ?? container;
					currentContainer.scrollTop = currentContainer.scrollHeight;
					smoothSnapTimeoutRef.current = null;
				});
			}, SMOOTH_SCROLL_SNAP_DELAY_MS);
		},
		[clearSmoothSnapTimeout],
	);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	useEffect(() => {
		return () => {
			clearSmoothSnapTimeout();
		};
	}, [clearSmoothSnapTimeout]);

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
		if (!chatPanelHydrated) return;
		if (hasInitializedAnimationRef.current) return;
		hasInitializedAnimationRef.current = true;
		setDisableInitialOpenAnimation(open);
	}, [chatPanelHydrated, open]);

	useEffect(() => {
		if (!disableInitialOpenAnimation) return;
		if (open) return;
		setDisableInitialOpenAnimation(false);
	}, [disableInitialOpenAnimation, open]);

	useEffect(() => {
		const wasOpen = wasOpenRef.current;
		wasOpenRef.current = open;
		if (!open) return;
		if (wasOpen) return;
		setUnreadCount(0);
		const hasMessages = chatMessages.length > 0;
		if (!hasMessages) return;
		const id = window.requestAnimationFrame(() => {
			scrollToBottomInstant(messagesContainerRef.current);
		});
		previousOpenMessageCountRef.current = chatMessages.length;
		return () => window.cancelAnimationFrame(id);
	}, [open, chatMessages.length, scrollToBottomInstant]);

	useEffect(() => {
		if (!open) return;
		if (chatHistoryVersion <= lastHandledHistoryVersionRef.current) return;

		lastHandledHistoryVersionRef.current = chatHistoryVersion;
		previousOpenMessageCountRef.current = chatMessages.length;

		const id = window.requestAnimationFrame(() => {
			scrollToBottomInstant(messagesContainerRef.current);
		});

		return () => window.cancelAnimationFrame(id);
	}, [open, chatHistoryVersion, chatMessages.length, scrollToBottomInstant]);

	useEffect(() => {
		if (!open) {
			previousOpenMessageCountRef.current = chatMessages.length;
			return;
		}
		if (chatHistoryVersion > lastHandledHistoryVersionRef.current) {
			return;
		}

		const previousCount = previousOpenMessageCountRef.current;
		if (chatMessages.length <= previousCount) return;

		const id = window.requestAnimationFrame(() => {
			scrollToBottomSmoothWithSnap(messagesContainerRef.current);
		});
		previousOpenMessageCountRef.current = chatMessages.length;
		return () => {
			window.cancelAnimationFrame(id);
			clearSmoothSnapTimeout();
		};
	}, [
		chatMessages,
		open,
		chatHistoryVersion,
		scrollToBottomSmoothWithSnap,
		clearSmoothSnapTimeout,
	]);

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
		window.requestAnimationFrame(() => {
			resizeTextarea(chatTextareaRef.current);
		});
	}

	if (!hasMounted || !chatPanelHydrated) {
		return null;
	}

	return (
		<Sheet modal={false} onOpenChange={setChatPanelOpen} open={open}>
			<SheetTrigger asChild>
				<Button
					aria-label="Chat öffnen"
					className="fixed right-4 bottom-4 z-50 -translate-y-1/2 rounded-full shadow-lg"
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

			<SheetContent
				className="flex h-full flex-col gap-0 bg-background/70 p-0 backdrop-blur-md"
				disableAnimation={disableInitialOpenAnimation}
				showCloseButton={false}
				showOverlay={false}
				side="right"
			>
				<SheetHeader className="hidden">
					<SheetTitle>Tisch-Chat</SheetTitle>
					<SheetDescription>
						Alle Spieler und Zuschauer an diesem Tisch können schreiben.
					</SheetDescription>
				</SheetHeader>
				<Button
					className="absolute top-2 right-2 z-10"
					onClick={() => setChatPanelOpen(false)}
					size="icon"
					variant="ghost"
				>
					<XIcon className="size-4" />
				</Button>
				<div
					className="flex min-h-0 flex-1 flex-col overflow-y-auto"
					ref={messagesContainerRef}
				>
					<div className="p-3">
						{chatMessages.length === 0 ? (
							<Card className="border-dashed py-4 text-center text-muted-foreground text-sm shadow-none">
								Noch keine Nachrichten.
							</Card>
						) : (
							chatMessages.map((message, index) => {
								const isSystem = message.author.role === "system";
								const isOwnMessage =
									!isSystem && message.author.id === currentPlayer?.id;
								const prevMessage = chatMessages[index - 1];
								const nextMessage = chatMessages[index + 1];
								const isPrevSameAuthor =
									!!prevMessage &&
									prevMessage.author.role !== "system" &&
									prevMessage.author.id === message.author.id &&
									prevMessage.author.role === message.author.role;
								const isNextSameAuthor =
									!!nextMessage &&
									nextMessage.author.role !== "system" &&
									nextMessage.author.id === message.author.id &&
									nextMessage.author.role === message.author.role;
								const showName = !isPrevSameAuthor;
								const isGroupBottom = !isNextSameAuthor;
								const rowMarginClass =
									index === 0 ? "mt-0" : isPrevSameAuthor ? "mt-1" : "mt-2";

								if (isSystem) {
									return (
										<div
											className={`${index === 0 ? "mt-0" : "mt-2"} px-2 py-1 text-center text-muted-foreground text-xs`}
											key={message.id}
										>
											{message.text}
										</div>
									);
								}

								return (
									<div
										className={`flex items-end gap-2 ${rowMarginClass} ${isOwnMessage ? "justify-end" : "justify-start"}`}
										key={message.id}
									>
										{!isOwnMessage && (
											<div className="flex size-6 items-end justify-center">
												{isGroupBottom && (
													<Avatar
														alt={message.author.name}
														fallback={message.author.name
															.charAt(0)
															.toUpperCase()}
														size="xs"
														src={message.author.image}
													/>
												)}
											</div>
										)}
										<div
											className={`max-w-[80%] gap-2 rounded-xl px-2 py-1 shadow-sm ${
												isOwnMessage
													? "bg-primary text-primary-foreground"
													: "bg-background"
											}`}
										>
											{showName && (
												<div
													className={`text-xs ${
														isOwnMessage
															? "text-primary-foreground/80"
															: "text-muted-foreground"
													}`}
												>
													{message.author.name}
												</div>
											)}
											<div className="relative">
												<div className="wrap-break-words whitespace-pre-wrap text-sm after:inline-block after:h-0 after:w-8 after:content-['']">
													{message.text}
												</div>
												<div
													className={`absolute right-0 bottom-0 text-[11px] ${
														isOwnMessage
															? "text-primary-foreground/70"
															: "text-muted-foreground"
													}`}
												>
													{timeFormatter.format(message.createdAt)}
												</div>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>
				</div>

				<div className="flex flex-row items-end gap-2 bg-background/1 p-3 shadow-lg">
					<Textarea
						className="h-9 min-h-9 resize-none overflow-hidden bg-background"
						id={chatTextareaId}
						maxLength={MAX_CHAT_LENGTH}
						name="table-chat-message"
						onChange={(event) => {
							setDraft(event.target.value);
							setChatLocalError(null);
							resizeTextarea(event.currentTarget);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								onSendMessage();
							}
						}}
						placeholder="Nachricht schreiben..."
						ref={chatTextareaRef}
						rows={1}
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
				</div>
			</SheetContent>
		</Sheet>
	);
}
