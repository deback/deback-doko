"use client";

import { MessageSquare, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingButtonWrapper } from "./floating-button-wrapper";

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
		<FloatingButtonWrapper>
			<Button
				aria-expanded={chatPanelOpen}
				aria-label={chatPanelOpen ? "Chat schließen" : "Chat öffnen"}
				className="relative"
				onClick={onToggleChat}
				size="icon"
				variant="outline"
			>
				{unreadCount > 0 && !chatPanelOpen && (
					<span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary font-semibold text-[9px] text-primary-foreground leading-none">
						{unreadCount}
					</span>
				)}
				{chatPanelOpen ? <PanelRightClose /> : <MessageSquare />}
			</Button>
		</FloatingButtonWrapper>
	);
}
