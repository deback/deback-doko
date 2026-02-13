"use client";

import { Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "../ui/button";
import { AppearanceTab } from "./appearance-tab";
import { ProfileTab } from "./profile-tab";

type SettingsTab = "profile" | "appearance";

interface SettingsDialogProps {
	user?: {
		id: string;
		name: string;
		image: string | null;
	} | null;
	trigger?: ReactNode;
	appearanceExtension?: ReactNode;
	initialTab?: SettingsTab;
}

export function SettingsDialog({
	user,
	trigger,
	appearanceExtension,
	initialTab = "profile",
}: SettingsDialogProps) {
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (nextOpen) {
			setActiveTab(initialTab);
		}
	}

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button
						aria-label="Einstellungen"
						className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
						type="button"
					>
						<Settings className="size-6" />
						<span className="text-xs">Optionen</span>
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="content-start">
				<DialogHeader>
					<DialogTitle>Einstellungen</DialogTitle>
				</DialogHeader>

				{user ? (
					<Tabs
						className="w-full"
						onValueChange={(value) => setActiveTab(value as SettingsTab)}
						value={activeTab}
					>
						<TabsList className="w-full">
							<TabsTrigger className="flex-1" value="profile">
								Profil
							</TabsTrigger>
							<TabsTrigger className="flex-1" value="appearance">
								Erscheinungsbild
							</TabsTrigger>
						</TabsList>
						<div className="relative mt-4">
							<TabsContent
								className="data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0"
								forceMount
								value="profile"
							>
								<ProfileTab onClose={() => setOpen(false)} user={user} />
							</TabsContent>
							<TabsContent
								className="absolute inset-0 data-[state=inactive]:pointer-events-none data-[state=inactive]:opacity-0"
								forceMount
								value="appearance"
							>
								<AppearanceTab extension={appearanceExtension} />
							</TabsContent>
						</div>
					</Tabs>
				) : (
					<AppearanceTab extension={appearanceExtension} />
				)}
			</DialogContent>
		</Dialog>
	);
}
