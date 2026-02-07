import { Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { GameHistoryDetail } from "@/types/game-history";

interface GameSummaryProps {
	game: GameHistoryDetail;
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

export function GameSummary({ game }: GameSummaryProps) {
	const rePlayers = game.playerResults.filter((p) => p.team === "re");
	const kontraPlayers = game.playerResults.filter((p) => p.team === "kontra");
	const reScore = rePlayers.reduce((sum, p) => sum + p.score, 0);
	const kontraScore = kontraPlayers.reduce((sum, p) => sum + p.score, 0);
	const reWon = reScore >= kontraScore;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-bold text-xl">Ergebnis</h2>
				<span className="text-muted-foreground text-sm">
					{formatDate(game.createdAt)}
				</span>
			</div>

			{/* Contract type badges */}
			<div className="flex gap-2">
				{game.contractType === "hochzeit" && (
					<span className="rounded-full bg-pink-500/10 px-2 py-0.5 text-pink-600 text-xs">
						Hochzeit
					</span>
				)}
				{game.schweinereiPlayers.length > 0 && (
					<span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600 text-xs">
						Schweinerei
					</span>
				)}
				{game.announcements?.re.announced && (
					<span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-600 text-xs">
						Re
					</span>
				)}
				{game.announcements?.kontra.announced && (
					<span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-600 text-xs">
						Kontra
					</span>
				)}
			</div>

			{/* Team scores */}
			<div className="grid grid-cols-2 gap-3">
				{/* Re */}
				<div
					className={cn(
						"rounded-lg p-3",
						reWon ? "bg-emerald-500/15" : "bg-muted",
					)}
				>
					<div className="mb-2 flex items-center gap-1">
						<span
							className={cn("font-bold text-lg", reWon && "text-emerald-600")}
						>
							Re
						</span>
						{reWon && <Trophy className="size-4 text-emerald-600" />}
						<span className="ml-auto font-bold text-xl">{reScore}</span>
					</div>
					<div className="space-y-1">
						{rePlayers.map((p) => (
							<div className="flex items-center gap-2" key={p.userId}>
								<Avatar
									alt={p.userName}
									fallback={p.userName.charAt(0).toUpperCase()}
									size="xs"
									src={p.userImage}
								/>
								<span className="text-sm">{p.userName}</span>
								<span className="ml-auto text-muted-foreground text-xs">
									{p.score} Pkt.
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Kontra */}
				<div
					className={cn(
						"rounded-lg p-3",
						!reWon ? "bg-emerald-500/15" : "bg-muted",
					)}
				>
					<div className="mb-2 flex items-center gap-1">
						<span
							className={cn("font-bold text-lg", !reWon && "text-emerald-600")}
						>
							Kontra
						</span>
						{!reWon && <Trophy className="size-4 text-emerald-600" />}
						<span className="ml-auto font-bold text-xl">{kontraScore}</span>
					</div>
					<div className="space-y-1">
						{kontraPlayers.map((p) => (
							<div className="flex items-center gap-2" key={p.userId}>
								<Avatar
									alt={p.userName}
									fallback={p.userName.charAt(0).toUpperCase()}
									size="xs"
									src={p.userImage}
								/>
								<span className="text-sm">{p.userName}</span>
								<span className="ml-auto text-muted-foreground text-xs">
									{p.score} Pkt.
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
