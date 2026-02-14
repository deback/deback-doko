"use client";

import { useAnnouncementAudioSettings } from "@/lib/hooks/use-announcement-audio-settings";
import {
	type CardDesign,
	type DarkModeCardStyle,
	useCardDesign,
} from "@/lib/hooks/use-card-design";
import { cn } from "@/lib/utils";

const cardDesignOptions: ReadonlyArray<{ value: CardDesign; label: string }> = [
	{ value: "doko", label: "Doppelkopf" },
	{ value: "poker", label: "Poker" },
];

const darkModeStyleOptions: ReadonlyArray<{
	value: DarkModeCardStyle;
	label: string;
}> = [
	{ value: "normal", label: "Normal" },
	{ value: "dimmed", label: "Abgedunkelt" },
	{ value: "inverted", label: "Invertiert" },
	{ value: "sepia", label: "Sepia" },
];

function optionButtonClass(isActive: boolean) {
	return cn(
		"rounded-md border px-3 py-2 text-sm transition-colors",
		isActive
			? "border-primary bg-primary/10 text-primary"
			: "border-border hover:border-primary/50",
	);
}

export function GameCardAppearanceSettings() {
	const { cardDesign, setCardDesign, darkModeStyle, setDarkModeStyle } =
		useCardDesign();
	const {
		enabled: announcementAudioEnabled,
		setEnabled: setAnnouncementAudio,
	} = useAnnouncementAudioSettings();

	return (
		<div className="flex flex-col gap-4 border-t pt-4">
			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground text-sm">Karten</p>
				<div className="grid grid-cols-2 gap-2">
					{cardDesignOptions.map((option) => (
						<button
							className={optionButtonClass(cardDesign === option.value)}
							key={option.value}
							onClick={() => setCardDesign(option.value)}
							type="button"
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground text-sm">Karten im Dark Mode</p>
				<div className="grid grid-cols-2 gap-2">
					{darkModeStyleOptions.map((option) => (
						<button
							className={optionButtonClass(darkModeStyle === option.value)}
							key={option.value}
							onClick={() => setDarkModeStyle(option.value)}
							type="button"
						>
							{option.label}
						</button>
					))}
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground text-sm">Ansage-Audio</p>
				<div className="grid grid-cols-2 gap-2">
					<button
						className={optionButtonClass(announcementAudioEnabled)}
						onClick={() => setAnnouncementAudio(true)}
						type="button"
					>
						Ein
					</button>
					<button
						className={optionButtonClass(!announcementAudioEnabled)}
						onClick={() => setAnnouncementAudio(false)}
						type="button"
					>
						Aus
					</button>
				</div>
			</div>
		</div>
	);
}
