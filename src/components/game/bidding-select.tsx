"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { contractToTrumpMode } from "@/lib/game/rules";
import { cn } from "@/lib/utils";
import { useSetPreviewTrumpMode } from "@/stores/game-selectors";
import type {
	BiddingPhase,
	Card,
	ContractType,
	ReservationType,
} from "@/types/game";
import type { Player } from "@/types/tables";

interface BiddingSelectProps {
	biddingPhase: BiddingPhase;
	players: Player[];
	currentPlayerId?: string;
	playerHand?: Card[];
	startingPlayerIndex: number;
	onBid?: (bid: ReservationType) => void;
	onDeclareContract?: (contract: ContractType) => void;
	readOnly?: boolean;
}

// Check if player has both Queens of Clubs (for Hochzeit)
function hasBothQueensOfClubs(hand: Card[]): boolean {
	const queensOfClubs = hand.filter(
		(card) => card.suit === "clubs" && card.rank === "queen",
	);
	return queensOfClubs.length >= 2;
}

// Get bid status icon
function BidStatusIcon({ status }: { status: "done" | "current" | "pending" }) {
	switch (status) {
		case "done":
			return <CheckCircle2 className="size-4 text-emerald-500" />;
		case "current":
			return <Clock className="size-4 animate-pulse text-amber-500" />;
		case "pending":
			return <Circle className="size-4 text-muted-foreground/50" />;
	}
}

// Get bid label
function getBidLabel(bid: ReservationType | undefined): string {
	if (!bid) return "";
	return bid === "gesund" ? "Gesund" : "Vorbehalt";
}

export function BiddingSelect({
	biddingPhase,
	players,
	currentPlayerId = "",
	playerHand = [],
	startingPlayerIndex,
	onBid,
	onDeclareContract,
	readOnly = false,
}: BiddingSelectProps) {
	const currentBidder = players[biddingPhase.currentBidderIndex];
	const isMyTurn = currentBidder?.id === currentPlayerId;
	const myBid = biddingPhase.bids[currentPlayerId];
	const canDeclareHochzeit = hasBothQueensOfClubs(playerHand);

	// Default selection based on hand
	const defaultValue = canDeclareHochzeit ? "vorbehalt" : "gesund";
	const [selectedBid, setSelectedBid] = useState<ReservationType>(defaultValue);
	const [isReady, setIsReady] = useState(false); // Player has confirmed their choice
	const hasSentBid = useRef(false);
	const setPreviewTrumpMode = useSetPreviewTrumpMode();

	// Reset state when default value changes (e.g., after game reset with new hand)
	useEffect(() => {
		if (readOnly) return;
		setSelectedBid(defaultValue);
		setIsReady(false);
		hasSentBid.current = false;
		setPreviewTrumpMode(null);
	}, [defaultValue, setPreviewTrumpMode, readOnly]);

	// Check if we're awaiting contract declaration
	const awaitingDeclaration =
		biddingPhase.awaitingContractDeclaration?.includes(currentPlayerId) ??
		false;

	// Auto-send bid when it's my turn and I'm ready
	useEffect(() => {
		if (readOnly) return;
		if (isMyTurn && isReady && !myBid && !hasSentBid.current) {
			hasSentBid.current = true;
			onBid?.(selectedBid);
		}
	}, [isMyTurn, isReady, myBid, selectedBid, onBid, readOnly]);

	const handleConfirm = () => {
		if (isMyTurn) {
			// Send immediately if it's my turn
			onBid?.(selectedBid);
		} else {
			// Mark as ready, will auto-send when it's my turn
			setIsReady(true);
		}
	};

	// Contract declaration state (Select + OK)
	const contractDefault = canDeclareHochzeit ? "hochzeit" : "";
	const [selectedContract, setSelectedContract] = useState(contractDefault);

	// Update preview trump mode when contract selection changes
	const handleContractChange = useCallback(
		(value: string) => {
			const contract = value as ContractType;
			setSelectedContract(contract);
			setPreviewTrumpMode(contractToTrumpMode(contract));
		},
		[setPreviewTrumpMode],
	);

	// Set initial preview when entering declaration phase
	useEffect(() => {
		if (readOnly) return;
		if (awaitingDeclaration && contractDefault) {
			setPreviewTrumpMode(contractToTrumpMode(contractDefault));
		}
	}, [awaitingDeclaration, contractDefault, setPreviewTrumpMode, readOnly]);

	const handleDeclareConfirm = () => {
		if (!selectedContract) return;
		onDeclareContract?.(selectedContract as ContractType);
	};

	return (
		<div className="fixed top-1/2 left-1/2 z-50 mx-auto -mt-8 flex min-w-72 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-xl bg-background p-4 text-foreground shadow-lg lg:gap-4">
			<h3 className="hidden font-semibold font-serif text-lg lg:block">
				Vorbehaltsabfrage
			</h3>

			{/* Status message */}
			{readOnly ? (
				<p className="text-foreground/50 text-xs">
					{(() => {
						const allBidsIn =
							Object.keys(biddingPhase.bids).length >= players.length;
						if (!allBidsIn)
							return `Warte auf ${currentBidder?.name?.split(" ")[0]}...`;
						const declaringIds = biddingPhase.awaitingContractDeclaration ?? [];
						if (declaringIds.length > 0) {
							const names = declaringIds
								.map(
									(id) =>
										players.find((p) => p.id === id)?.name?.split(" ")[0] ??
										"...",
								)
								.join(", ");
							return `Warte auf ${names}...`;
						}
						return "Es geht los!";
					})()}
				</p>
			) : (
				<>
					{!myBid && !isReady && !awaitingDeclaration && (
						<p className="text-foreground/50 text-xs">
							Bitte wähle Gesund/Vorbehalt
						</p>
					)}
					{(myBid || isReady) && !awaitingDeclaration && (
						<p className="text-foreground/50 text-xs">
							{(() => {
								const allBidsIn =
									Object.keys(biddingPhase.bids).length >= players.length;
								if (!allBidsIn) return `Warte auf ${currentBidder?.name}...`;
								// All bids in — check if someone else is declaring
								const declaringIds =
									biddingPhase.awaitingContractDeclaration ?? [];
								if (declaringIds.length > 0) {
									const names = declaringIds
										.map(
											(id) =>
												players.find((p) => p.id === id)?.name?.split(" ")[0] ??
												"...",
										)
										.join(", ");
									return `Warte auf ${names}...`;
								}
								return "Es geht los!";
							})()}
						</p>
					)}
				</>
			)}

			{/* Player status row - rotated to start with the starting player */}
			<div className="flex w-full flex-col items-start justify-center gap-2">
				{players.map((_, i) => {
					const index = (startingPlayerIndex + i) % players.length;
					const player = players[index];
					if (!player) return null;
					const playerBid = biddingPhase.bids[player.id];
					const isCurrent = index === biddingPhase.currentBidderIndex;
					const hasBid = playerBid !== undefined;

					let status: "done" | "current" | "pending";
					if (hasBid) {
						status = "done";
					} else if (isCurrent) {
						status = "current";
					} else {
						status = "pending";
					}

					return (
						<div
							className={cn(
								"flex items-center gap-1.5 rounded-full px-2 py-1",
								isCurrent && "bg-amber-500/20",
								hasBid && "bg-emerald-500/10",
							)}
							key={player.id}
						>
							<BidStatusIcon status={status} />
							<span
								className={cn(
									"text-xs",
									player.id === currentPlayerId
										? "font-medium text-foreground"
										: "text-foreground/70",
								)}
							>
								{player.name.split(" ")[0]}
							</span>
							{hasBid && (
								<span className="text-emerald-400 text-xs">
									{getBidLabel(playerBid)}
								</span>
							)}
						</div>
					);
				})}
			</div>

			{/* Awaiting contract declaration (after all bids are in) */}
			{!readOnly && (
				<AnimatePresence>
					{awaitingDeclaration && (
						<motion.div
							animate={{ height: "auto", opacity: 1 }}
							className="-mx-1 -mb-1 w-[calc(100%+0.5rem)] overflow-hidden px-1 pb-1"
							exit={{ height: 0, opacity: 0 }}
							initial={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
						>
							<div className="flex w-full items-center gap-3 pt-1">
								<Select
									onValueChange={handleContractChange}
									value={selectedContract}
								>
									<SelectTrigger className="min-w-40">
										<SelectValue placeholder="Sonderspiel" />
									</SelectTrigger>
									<SelectContent>
										{canDeclareHochzeit && (
											<SelectItem value="hochzeit">Hochzeit</SelectItem>
										)}
										<SelectItem value="solo-clubs">♣ Kreuz-Solo</SelectItem>
										<SelectItem value="solo-spades">♠ Pik-Solo</SelectItem>
										<SelectItem value="solo-hearts">♥ Herz-Solo</SelectItem>
										<SelectItem value="solo-diamonds">♦ Karo-Solo</SelectItem>
										<SelectItem value="solo-queens">Damen-Solo</SelectItem>
										<SelectItem value="solo-jacks">Buben-Solo</SelectItem>
										<SelectItem value="solo-aces">Fleischloser</SelectItem>
									</SelectContent>
								</Select>
								<Button onClick={handleDeclareConfirm} size="default">
									OK
								</Button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			)}

			{/* Form with animated collapse */}
			{!readOnly && (
				<AnimatePresence>
					{!myBid && !isReady && !awaitingDeclaration && (
						<motion.div
							animate={{ height: "auto", opacity: 1 }}
							className="-mx-1 -mb-1 w-[calc(100%+0.5rem)] overflow-hidden px-1 pb-1"
							exit={{ height: 0, opacity: 0 }}
							initial={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
						>
							<div className="flex w-full items-center gap-3 pt-1">
								<Select
									onValueChange={(value) =>
										setSelectedBid(value as ReservationType)
									}
									value={selectedBid}
								>
									<SelectTrigger className="min-w-30">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="gesund">Gesund</SelectItem>
										<SelectItem value="vorbehalt">Vorbehalt</SelectItem>
									</SelectContent>
								</Select>
								<Button onClick={handleConfirm} size="default">
									OK
								</Button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			)}
		</div>
	);
}
