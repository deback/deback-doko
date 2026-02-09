"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { CONTRACT_LABELS } from "@/lib/game/labels";
import { cn } from "@/lib/utils";
import type { GameHistorySummary } from "@/types/game-history";

interface GameHistoryListProps {
	games: GameHistorySummary[];
}

function formatDate(date: Date) {
	return new Date(date).toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function GameHistoryList({ games }: GameHistoryListProps) {
	return (
		<div className="space-y-2">
			{games.map((game) => {
				const rePlayers = game.playerResults.filter((p) => p.team === "re");
				const kontraPlayers = game.playerResults.filter(
					(p) => p.team === "kontra",
				);
				const reScore = rePlayers.reduce((sum, p) => sum + p.score, 0);
				const kontraScore = kontraPlayers.reduce((sum, p) => sum + p.score, 0);
				const reWon = reScore >= kontraScore;

				return (
					<Link
						className="block rounded-lg bg-card px-4 py-3 hover:bg-muted transition-colors"
						href={`/history/${game.id}`}
						key={game.id}
					>
						<div className="mb-2 flex items-center justify-between">
							<span className="text-muted-foreground text-xs">
								{formatDate(game.createdAt)}
							</span>
							{game.contractType &&
								game.contractType !== "normal" &&
								CONTRACT_LABELS[game.contractType] && (
									<span
										className={cn(
											"rounded-full px-2 py-0.5 text-xs",
											game.contractType === "hochzeit"
												? "bg-pink-500/10 text-pink-600"
												: "bg-violet-500/10 text-violet-600",
										)}
									>
										{CONTRACT_LABELS[game.contractType]}
									</span>
								)}
						</div>

						<div className="flex items-center gap-4">
							{/* Re Team */}
							<div
								className={cn(
									"flex-1 rounded-md p-2",
									reWon ? "bg-emerald-500/10" : "bg-muted/50",
								)}
							>
								<div className="mb-1 flex items-center gap-1">
									<span
										className={cn(
											"font-semibold text-sm",
											reWon && "text-emerald-600",
										)}
									>
										Re
									</span>
									{reWon && <Trophy className="size-3 text-emerald-600" />}
									<span className="ml-auto font-bold text-sm">{reScore}</span>
								</div>
								<div className="flex -space-x-1">
									{rePlayers.map((p) => (
										<Avatar
											alt={p.userName}
											className="ring-1 ring-background"
											fallback={p.userName.charAt(0).toUpperCase()}
											key={p.userId}
											size="xs"
											src={p.userImage}
										/>
									))}
								</div>
							</div>

							<span className="text-muted-foreground text-xs">vs</span>

							{/* Kontra Team */}
							<div
								className={cn(
									"flex-1 rounded-md p-2",
									!reWon ? "bg-emerald-500/10" : "bg-muted/50",
								)}
							>
								<div className="mb-1 flex items-center gap-1">
									<span
										className={cn(
											"font-semibold text-sm",
											!reWon && "text-emerald-600",
										)}
									>
										Kontra
									</span>
									{!reWon && <Trophy className="size-3 text-emerald-600" />}
									<span className="ml-auto font-bold text-sm">
										{kontraScore}
									</span>
								</div>
								<div className="flex -space-x-1">
									{kontraPlayers.map((p) => (
										<Avatar
											alt={p.userName}
											className="ring-1 ring-background"
											fallback={p.userName.charAt(0).toUpperCase()}
											key={p.userId}
											size="xs"
											src={p.userImage}
										/>
									))}
								</div>
							</div>
						</div>
					</Link>
				);
			})}
		</div>
	);
}
