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
import { signUpSchema } from "@/lib/validations/auth";
import { type ActionState, signUpAction } from "@/server/actions/auth";

type FormValues = z.infer<typeof signUpSchema>;

const initialState: ActionState = { success: false };

export default function RegisterPage() {
	const [state, formAction, isPending] = useActionState(
		signUpAction,
		initialState,
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(signUpSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
	});

	function onSubmit(values: FormValues) {
		const formData = new FormData();
		formData.append("name", values.name);
		formData.append("email", values.email);
		formData.append("password", values.password);
		startTransition(() => {
			formAction(formData);
		});
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<CardTitle className="font-serif text-2xl uppercase">
					Registrieren
				</CardTitle>
				<CardDescription>
					Erstelle ein neues Konto mit E-Mail und Passwort.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{state.success ? (
					<div className="space-y-4">
						<div className="rounded-md border border-green-500/20 bg-green-500/10 p-4">
							<p className="text-green-600 text-sm dark:text-green-400">
								Registrierung erfolgreich! Bitte überprüfe dein E-Mail-Postfach
								und klicke auf den Bestätigungslink, um dein Konto zu aktivieren.
							</p>
						</div>
						<Button asChild className="w-full" variant="outline">
							<Link href="/login">Zur Anmeldung</Link>
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<Form {...form}>
							<form
								className="space-y-4"
								onSubmit={form.handleSubmit(onSubmit)}
							>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input
													placeholder="Max Mustermann"
													type="text"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

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

								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Passwort</FormLabel>
											<FormControl>
												<Input
													placeholder="********"
													type="password"
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
									{isPending ? "Wird registriert..." : "Registrieren"}
								</Button>
							</form>
						</Form>

						<div className="text-center text-sm">
							<Link
								className="text-muted-foreground transition-colors hover:text-foreground"
								href="/login"
							>
								Bereits ein Konto? Zur Anmeldung
							</Link>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
