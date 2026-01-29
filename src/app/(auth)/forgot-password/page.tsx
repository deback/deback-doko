"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InfoBox } from "@/components/ui/info-box";
import { emailSchema } from "@/lib/validations/auth";
import {
	type ActionState,
	requestPasswordResetAction,
} from "@/server/actions/auth";

type FormValues = z.infer<typeof emailSchema>;

const initialState: ActionState = { success: false };

export default function ForgotPasswordPage() {
	const [state, formAction, isPending] = useActionState(
		requestPasswordResetAction,
		initialState,
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(emailSchema),
		defaultValues: {
			email: "",
		},
	});

	function onSubmit(values: FormValues) {
		const formData = new FormData();
		formData.append("email", values.email);
		startTransition(() => {
			formAction(formData);
		});
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<CardTitle className="font-serif text-2xl uppercase">
					Passwort vergessen
				</CardTitle>
				<CardDescription>Setze dein Passwort zurück.</CardDescription>
			</CardHeader>
			<CardContent>
				{state.success ? (
					<div className="space-y-4">
						<InfoBox>
							Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir
							einen Link zum Zurücksetzen deines Passworts gesendet.
						</InfoBox>
						<Button asChild className="w-full" variant="outline">
							<Link href="/login">Zur Anmeldung</Link>
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<p className="text-muted-foreground text-sm">
							Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum
							Zurücksetzen deines Passworts.
						</p>

						<Form {...form}>
							<form
								className="space-y-4"
								onSubmit={form.handleSubmit(onSubmit)}
							>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>E-Mail-Adresse</FormLabel>
											<FormControl>
												<Input
													placeholder="deine@email.de"
													type="email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{state.error && (
									<div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
										<p className="text-red-500 text-sm">{state.error}</p>
									</div>
								)}

								<Button className="w-full" disabled={isPending} type="submit">
									{isPending ? "Wird gesendet..." : "Link senden"}
								</Button>
							</form>
						</Form>

						<div className="text-center text-sm">
							<Link
								className="text-muted-foreground transition-colors hover:text-foreground"
								href="/login"
							>
								Zurück zur Anmeldung
							</Link>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
