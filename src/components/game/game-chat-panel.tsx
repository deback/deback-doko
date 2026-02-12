"use client";

import {
	Loader2,
	MessageSquare,
	Mic,
	MicOff,
	Send,
	Square,
	XIcon,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useSpeechToText } from "@/components/game/hooks/use-speech-to-text";
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
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
const CHAT_SPEECH_LANGUAGE = "de-DE";
const CHAT_SPEECH_SILENCE_TIMEOUT_MS = 3_000;
const SPEECH_PERMISSION_DENIED_MESSAGE = "Mikrofonzugriff wurde nicht erlaubt.";
const SPEECH_UNSUPPORTED_MESSAGE =
	"Spracherkennung wird in diesem Browser nicht unterstützt.";

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
	const {
		status: speechStatus,
		isSupported: isSpeechSupported,
		permissionDenied,
		finalText: speechFinalText,
		interimText: speechInterimText,
		errorMessage: speechErrorMessage,
		start: startSpeechToText,
		stop: stopSpeechToText,
	} = useSpeechToText({
		lang: CHAT_SPEECH_LANGUAGE,
		silenceTimeoutMs: CHAT_SPEECH_SILENCE_TIMEOUT_MS,
	});
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
	const speechBaseDraftRef = useRef("");
	const normalizedDraft = draft.trim();
	const remainingCooldownMs = Math.max(0, (chatCooldownUntil ?? 0) - nowMs);
	const isCooldownActive = remainingCooldownMs > 0;
	const open = chatPanelOpen;
	const isSpeechActive =
		speechStatus === "listening" || speechStatus === "processing";
	const canSend =
		normalizedDraft.length > 0 &&
		normalizedDraft.length <= MAX_CHAT_LENGTH &&
		!isCooldownActive &&
		!isSpeechActive;
	const speechTooltipMessage = permissionDenied
		? SPEECH_PERMISSION_DENIED_MESSAGE
		: !isSpeechSupported
			? SPEECH_UNSUPPORTED_MESSAGE
			: null;

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
		if (!speechErrorMessage) return;
		if (permissionDenied) {
			if (chatLocalError === speechErrorMessage) {
				setChatLocalError(null);
			}
			return;
		}
		setChatLocalError(speechErrorMessage);
	}, [chatLocalError, permissionDenied, speechErrorMessage, setChatLocalError]);

	useEffect(() => {
		if (!isSpeechActive && !speechFinalText && !speechInterimText) return;

		const combinedSpeech = [speechFinalText, speechInterimText]
			.map((part) => part.trim())
			.filter(Boolean)
			.join(" ");

		if (!combinedSpeech) {
			setDraft(speechBaseDraftRef.current);
			return;
		}

		const baseDraft = speechBaseDraftRef.current;
		const separator = baseDraft.trim().length > 0 ? " " : "";
		setDraft(`${baseDraft}${separator}${combinedSpeech}`);
	}, [isSpeechActive, speechFinalText, speechInterimText]);

	useEffect(() => {
		const currentDraftLength = draft.length;
		const id = window.requestAnimationFrame(() => {
			if (currentDraftLength < 0) return;
			resizeTextarea(chatTextareaRef.current);
		});
		return () => window.cancelAnimationFrame(id);
	}, [draft, resizeTextarea]);

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

	function onSpeechButtonClick() {
		if (!isSpeechSupported) return;
		if (isSpeechActive) {
			stopSpeechToText();
			return;
		}
		speechBaseDraftRef.current = draft;
		setChatLocalError(null);
		startSpeechToText();
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
				className="flex h-full flex-col gap-0 border-none bg-background/70 p-0 backdrop-blur-md"
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
				<div className="absolute top-2 right-2 z-10 rounded bg-background">
					<Button
						className=""
						onClick={() => setChatPanelOpen(false)}
						size="icon"
						variant="outline"
					>
						<XIcon className="size-4" />
					</Button>
				</div>
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
								const bubbleTailClass = isGroupBottom
									? isOwnMessage
										? "before:absolute before:right-[-5px] before:bottom-[7px] before:h-0 before:w-0 before:border-y-[5px] before:border-l-[8px] before:border-y-transparent before:border-l-[#D3C4B5] dark:before:border-l-[#5A4A3B] before:content-['']"
										: "before:absolute before:bottom-[7px] before:left-[-5px] before:h-0 before:w-0 before:border-y-[5px] before:border-r-[8px] before:border-y-transparent before:border-r-background before:content-['']"
									: "";

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
											className={`relative max-w-[80%] gap-2 overflow-visible rounded-xl px-2 py-1 shadow-sm ${bubbleTailClass} ${
												isOwnMessage
													? "bg-[#D3C4B5] text-foreground dark:bg-[#5A4A3B]"
													: "bg-background"
											}`}
										>
											{showName && (
												<div className="truncate text-muted-foreground text-xs">
													{message.author.name}
												</div>
											)}
											<div className="relative">
												<div className="wrap-break-words whitespace-pre-wrap text-sm after:inline-block after:h-0 after:w-8 after:content-['']">
													{message.text}
												</div>
												<div className="absolute right-0 bottom-0 text-[11px] text-muted-foreground">
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

				<div className="shrink-0 bg-background/80 px-3 py-2 shadow-lg">
					<div className="flex flex-row items-end gap-2">
						<Textarea
							className="min-h-9 resize-none overflow-hidden bg-background"
							disabled={isSpeechActive}
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
							{canSend ? (
								<Button onClick={onSendMessage} size="icon">
									<Send className="size-4" />
								</Button>
							) : (
								<Tooltip open={speechTooltipMessage ? undefined : false}>
									<TooltipTrigger asChild>
										<Button
											aria-label={
												isSpeechActive
													? "Spracherkennung stoppen"
													: "Spracherkennung starten"
											}
											className={`${speechStatus === "listening" ? "animate-pulse" : ""} ${
												!isSpeechSupported
													? "cursor-not-allowed opacity-50"
													: ""
											}`}
											onClick={onSpeechButtonClick}
											size="icon"
											type="button"
											variant={
												speechStatus === "listening" ? "destructive" : "outline"
											}
										>
											{speechStatus === "processing" ? (
												<Loader2 className="size-4 animate-spin" />
											) : speechStatus === "listening" ? (
												<Square className="size-4" />
											) : permissionDenied || !isSpeechSupported ? (
												<MicOff className="size-4" />
											) : (
												<Mic className="size-4" />
											)}
										</Button>
									</TooltipTrigger>
									{speechTooltipMessage && (
										<TooltipContent>{speechTooltipMessage}</TooltipContent>
									)}
								</Tooltip>
							)}
						</div>
					</div>
					{chatLocalError && (
						<p className="mt-1 text-destructive text-xs">{chatLocalError}</p>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
