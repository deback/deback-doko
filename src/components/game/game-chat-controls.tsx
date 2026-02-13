"use client";

import { MessageSquare, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameChatControlsProps {
	chatPanelOpen: boolean;
	unreadCount: number;
	onToggleChat: () => void;
}

export function GameChatControls({
	chatPanelOpen,
	unreadCount,
	onToggleChat,
}: GameChatControlsProps) {
	return (
		<Button
			aria-expanded={chatPanelOpen}
			aria-label={chatPanelOpen ? "Chat schließen" : "Chat öffnen"}
			className="relative"
			onClick={onToggleChat}
			size="icon"
			variant="outline"
		>
			{unreadCount > 0 && !chatPanelOpen && (
				<span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground leading-none">
					{unreadCount}
				</span>
			)}
			{chatPanelOpen ? <PanelRightClose /> : <MessageSquare />}
		</Button>
	);
}
