"use client";

import { Laptop, Moon, MoreHorizontal, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	type CardDesign,
	type DarkModeCardStyle,
	useCardDesign,
} from "@/lib/hooks/use-card-design";

export function GameSettingsMenu() {
	const { theme, setTheme } = useTheme();
	const { cardDesign, setCardDesign, darkModeStyle, setDarkModeStyle } =
		useCardDesign();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="icon" variant="outline">
					<MoreHorizontal />
					<span className="sr-only">Menü öffnen</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-48"
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Palette className="mr-2 h-4 w-4" />
						Erscheinungsbild
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className="w-48">
						<DropdownMenuLabel>Karten</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							onValueChange={(value) => setCardDesign(value as CardDesign)}
							value={cardDesign}
						>
							<DropdownMenuRadioItem value="doko">
								Doppelkopf
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="poker">Poker</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>

						<DropdownMenuSeparator />

						<DropdownMenuLabel>Theme</DropdownMenuLabel>
						<DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
							<DropdownMenuRadioItem value="light">
								<Sun className="mr-2 h-4 w-4" />
								Hell
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="dark">
								<Moon className="mr-2 h-4 w-4" />
								Dunkel
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="system">
								<Laptop className="mr-2 h-4 w-4" />
								System
							</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>

						<DropdownMenuSeparator />

						<DropdownMenuLabel>Karten im Dark Mode</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							onValueChange={(value) =>
								setDarkModeStyle(value as DarkModeCardStyle)
							}
							value={darkModeStyle}
						>
							<DropdownMenuRadioItem value="normal">
								Normal
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="dimmed">
								Abgedunkelt
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="inverted">
								Invertiert
							</DropdownMenuRadioItem>
							<DropdownMenuRadioItem value="sepia">Sepia</DropdownMenuRadioItem>
						</DropdownMenuRadioGroup>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
