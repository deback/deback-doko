"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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
	currentPlayerId: string;
	playerHand: Card[];
	startingPlayerIndex: number;
	onBid: (bid: ReservationType) => void;
	onDeclareContract: (contract: ContractType) => void;
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
			return <Clock className="size-4 text-amber-500 animate-pulse" />;
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
	currentPlayerId,
	playerHand,
	startingPlayerIndex,
	onBid,
	onDeclareContract,
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

	// Reset state when default value changes (e.g., after game reset with new hand)
	useEffect(() => {
		setSelectedBid(defaultValue);
		setIsReady(false);
		hasSentBid.current = false;
	}, [defaultValue]);

	// Check if we're awaiting contract declaration
	const awaitingDeclaration =
		biddingPhase.awaitingContractDeclaration === currentPlayerId;

	// Auto-send bid when it's my turn and I'm ready
	useEffect(() => {
		if (isMyTurn && isReady && !myBid && !hasSentBid.current) {
			hasSentBid.current = true;
			onBid(selectedBid);
		}
	}, [isMyTurn, isReady, myBid, selectedBid, onBid]);

	const handleConfirm = () => {
		if (isMyTurn) {
			// Send immediately if it's my turn
			onBid(selectedBid);
		} else {
			// Mark as ready, will auto-send when it's my turn
			setIsReady(true);
		}
	};

	const handleHochzeitConfirm = () => {
		onDeclareContract("hochzeit");
	};

	const handleBackToGesund = () => {
		onDeclareContract("normal");
	};

	return (
		<div className="fixed shadow-lg left-1/2 top-1/2 z-50 -mt-8 mx-auto flex max-w-md -translate-y-1/2 -translate-x-1/2 flex-col items-center gap-3 lg:gap-4 rounded-xl bg-background p-4 text-foreground">
			<h3 className="font-semibold font-serif text-lg hidden lg:block">
				Vorbehaltsabfrage
			</h3>

			{/* Awaiting contract declaration (after Vorbehalt) */}
			{awaitingDeclaration && (
				<div className="flex w-full flex-col gap-3">
					<p className="text-center text-sm">
						Du hast Vorbehalt angesagt. Wähle dein Sonderspiel.
					</p>
					{canDeclareHochzeit ? (
						<Button
							className="w-full"
							onClick={handleHochzeitConfirm}
							size="lg"
						>
							Hochzeit (beide ♣ Damen)
						</Button>
					) : (
						<p className="text-center text-sm text-amber-400">
							Solo-Varianten werden später hinzugefügt.
						</p>
					)}
					<Button
						className="w-full"
						onClick={handleBackToGesund}
						variant="outline"
					>
						Zurück zu Gesund
					</Button>
				</div>
			)}

			{/* Status message */}
			{!myBid && !isReady && !awaitingDeclaration && (
				<p className="text-xs text-foreground/50">
					Bitte wähle Gesund/Vorbehalt
				</p>
			)}
			{(myBid || isReady) && !awaitingDeclaration && (
				<p className="text-xs text-foreground/50">
					Warte auf {currentBidder?.name}...
				</p>
			)}

			{/* Player status row - rotated to start with the starting player */}
			<div className="flex flex-col w-full items-start justify-center gap-2">
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
								<span className="text-xs text-emerald-400">
									{getBidLabel(playerBid)}
								</span>
							)}
						</div>
					);
				})}
			</div>
			{/* Form with animated collapse */}
			<div
				className="grid w-full transition-[grid-template-rows] duration-300 ease-in-out"
				style={{
					gridTemplateRows:
						!myBid && !isReady && !awaitingDeclaration ? "1fr" : "0fr",
				}}
			>
				<div className="overflow-hidden">
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
				</div>
			</div>
		</div>
	);
}
