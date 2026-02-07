"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signInEmailSchema } from "@/lib/validations/auth";
import { type ActionState, signInEmailAction } from "@/server/actions/auth";

type FormValues = z.infer<typeof signInEmailSchema>;

const initialState: ActionState = { success: false };

export function PasswordLoginForm() {
	const [state, formAction, isPending] = useActionState(
		signInEmailAction,
		initialState,
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(signInEmailSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	function onSubmit(values: FormValues) {
		const formData = new FormData();
		formData.append("email", values.email);
		formData.append("password", values.password);
		startTransition(() => {
			formAction(formData);
		});
	}

	return (
		<div className="space-y-4">
			<Form {...form}>
				<form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>E-Mail-Adresse</FormLabel>
								<FormControl>
									<Input
										autoComplete="email"
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
										autoComplete="current-password"
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
						{isPending ? "Wird angemeldet..." : "Anmelden"}
					</Button>
				</form>
			</Form>

			<div className="flex flex-col gap-2 text-center text-sm">
				<Link
					className="text-muted-foreground transition-colors hover:text-foreground"
					href="/forgot-password"
				>
					Passwort vergessen?
				</Link>
				<Link
					className="text-muted-foreground transition-colors hover:text-foreground"
					href="/register"
				>
					Noch kein Konto? Jetzt registrieren
				</Link>
			</div>
		</div>
	);
}
