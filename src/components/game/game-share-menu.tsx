"use client";

import { Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { FloatingButtonWrapper } from "./floating-button-wrapper";

interface GameShareMenuProps {
	gameId: string;
	tableId: string;
}

export function GameShareMenu({ gameId, tableId }: GameShareMenuProps) {
	const getInviteUrl = () => {
		if (typeof window === "undefined") return null;
		const { hostname, host, protocol } = window.location;
		const isLocalHost =
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "::1";
		const scheme = isLocalHost ? "http:" : protocol;
		const origin = `${scheme}//${host}`;
		return `${origin}/game/${gameId}?invite=1&tableId=${encodeURIComponent(tableId)}`;
	};

	const copyInviteLink = async () => {
		const inviteUrl = getInviteUrl();
		if (!inviteUrl || !navigator.clipboard) {
			toast.error("Link konnte nicht kopiert werden.");
			return;
		}

		try {
			await navigator.clipboard.writeText(inviteUrl);
			toast.success("Einladungslink kopiert");
		} catch (error) {
			console.error("Could not copy invite link:", error);
			toast.error("Link konnte nicht kopiert werden.");
		}
	};

	const shareInviteLink = async () => {
		const inviteUrl = getInviteUrl();
		if (!inviteUrl) return;

		if (typeof navigator.share === "function") {
			try {
				await navigator.share({
					title: "Doppelkopf Einladung",
					text: "Komm an meinen Tisch und spiel eine Runde Doppelkopf mit.",
					url: inviteUrl,
				});
				return;
			} catch (error) {
				if (error instanceof Error && error.name === "AbortError") {
					return;
				}
				console.error("Native share failed:", error);
			}
		}

		await copyInviteLink();
	};

	const shareViaWhatsApp = async () => {
		const inviteUrl = getInviteUrl();
		if (!inviteUrl) {
			await copyInviteLink();
			return;
		}

		const message = `Komm an meinen Tisch und spiel eine Runde Doppelkopf mit.\n${inviteUrl}`;
		const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

		try {
			const openedWindow = window.open(
				whatsAppUrl,
				"_blank",
				"noopener,noreferrer",
			);
			if (!openedWindow) {
				toast.error(
					"WhatsApp konnte nicht geöffnet werden. Link wird kopiert.",
				);
				await copyInviteLink();
			}
		} catch (error) {
			console.error("WhatsApp share failed:", error);
			toast.error("WhatsApp konnte nicht geöffnet werden. Link wird kopiert.");
			await copyInviteLink();
		}
	};

	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger asChild>
					<DropdownMenuTrigger asChild>
						<FloatingButtonWrapper>
							<Button
								aria-label="Einladung teilen"
								size="icon"
								variant="outline"
							>
								<Share2 />
							</Button>
						</FloatingButtonWrapper>
					</DropdownMenuTrigger>
				</TooltipTrigger>
				<TooltipContent side="left">Einladung teilen</TooltipContent>
			</Tooltip>
			<DropdownMenuContent
				align="end"
				className="w-44"
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<DropdownMenuItem onClick={shareInviteLink}>
					<Share2 className="mr-2 h-4 w-4" />
					Teilen
				</DropdownMenuItem>
				<DropdownMenuItem onClick={shareViaWhatsApp}>
					<MessageCircle className="mr-2 h-4 w-4" />
					Per WhatsApp teilen
				</DropdownMenuItem>
				<DropdownMenuItem onClick={copyInviteLink}>
					<Link2 className="mr-2 h-4 w-4" />
					Link kopieren
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
