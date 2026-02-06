"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useState } from "react";
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

	// Check if we're awaiting contract declaration
	const awaitingDeclaration =
		biddingPhase.awaitingContractDeclaration === currentPlayerId;

	const handleConfirm = () => {
		if (selectedBid === "vorbehalt") {
			// When selecting Vorbehalt, automatically declare Hochzeit if possible
			if (canDeclareHochzeit) {
				onBid("vorbehalt");
				// The server will handle the contract declaration phase
			} else {
				// No Hochzeit possible, Solo not yet implemented
				// For now, fall back to Gesund
				onBid("gesund");
			}
		} else {
			onBid("gesund");
		}
	};

	const handleHochzeitConfirm = () => {
		onDeclareContract("hochzeit");
	};

	const handleBackToGesund = () => {
		onDeclareContract("normal");
	};

	return (
		<div className="fixed inset-x-0 top-1/2 z-50 mx-auto flex max-w-md -translate-y-1/2 flex-col items-center gap-4 rounded-xl bg-black/60 p-4 backdrop-blur-md">
			<h3 className="font-semibold text-white">Vorbehaltsabfrage</h3>

			{/* Awaiting contract declaration (after Vorbehalt) */}
			{awaitingDeclaration && (
				<div className="flex w-full flex-col gap-3">
					<p className="text-center text-sm text-white/70">
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

			{/* My turn to bid */}
			{isMyTurn && !myBid && !awaitingDeclaration && (
				<div className="flex w-full items-center gap-3">
					<Select
						defaultValue={defaultValue}
						onValueChange={(value) => setSelectedBid(value as ReservationType)}
					>
						<SelectTrigger className="flex-1 bg-white/10 text-white border-white/20">
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
			)}

			{/* Waiting for others */}
			{!isMyTurn && !awaitingDeclaration && (
				<p className="text-sm text-white/70">
					Warte auf {currentBidder?.name}...
				</p>
			)}

			{/* Player status row */}
			<div className="flex w-full items-center justify-center gap-4">
				{players.map((player, index) => {
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
										? "font-medium text-white"
										: "text-white/70",
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
		</div>
	);
}
