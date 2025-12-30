"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateUserName } from "@/app/profile/me/actions";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const usernameFormSchema = z.object({
	name: z
		.string()
		.min(2, "Der Name muss mindestens 2 Zeichen lang sein.")
		.max(50, "Der Name darf maximal 50 Zeichen lang sein."),
});

type UsernameFormValues = z.infer<typeof usernameFormSchema>;

interface UsernameFormProps {
	currentName: string;
	userId: string;
}

export function UsernameForm({ currentName, userId }: UsernameFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	const form = useForm<UsernameFormValues>({
		resolver: zodResolver(usernameFormSchema),
		defaultValues: {
			name: currentName,
		},
	});

	async function onSubmit(values: UsernameFormValues) {
		setIsSubmitting(true);
		setSubmitMessage(null);

		try {
			const result = await updateUserName(userId, values.name);

			if (result.success) {
				setSubmitMessage({
					type: "success",
					text: "Username erfolgreich aktualisiert!",
				});
				// Optional: Seite neu laden, um aktualisierte Daten anzuzeigen
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			} else {
				setSubmitMessage({
					type: "error",
					text: result.error ?? "Fehler beim Aktualisieren des Usernamens",
				});
			}
		} catch (_error) {
			setSubmitMessage({
				type: "error",
				text: "Ein unerwarteter Fehler ist aufgetreten.",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Username bearbeiten</CardTitle>
				<CardDescription>
					Ändere deinen Anzeigenamen. Dieser wird in deinem Profil angezeigt.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input placeholder="Dein Name" {...field} />
									</FormControl>
									<FormDescription>
										Der Name muss zwischen 2 und 50 Zeichen lang sein.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{submitMessage && (
							<div
								className={`rounded-md p-3 text-sm ${
									submitMessage.type === "success"
										? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
										: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
								}`}
							>
								{submitMessage.text}
							</div>
						)}

						<Button disabled={isSubmitting} type="submit">
							{isSubmitting ? "Wird gespeichert..." : "Speichern"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
