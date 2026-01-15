"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, startTransition, useActionState } from "react";
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
import { resetPasswordSchema } from "@/lib/validations/auth";
import { type ActionState, resetPasswordAction } from "@/server/actions/auth";

type FormValues = z.infer<typeof resetPasswordSchema>;

const initialState: ActionState = { success: false };

function ResetPasswordContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [state, formAction, isPending] = useActionState(
		resetPasswordAction,
		initialState,
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			password: "",
			token: token ?? "",
		},
	});

	function onSubmit(values: FormValues) {
		const formData = new FormData();
		formData.append("password", values.password);
		formData.append("token", values.token);
		startTransition(() => {
			formAction(formData);
		});
	}

	if (!token) {
		return (
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<CardTitle className="font-serif text-2xl uppercase">
						Ungültiger Link
					</CardTitle>
					<CardDescription>
						Der Link zum Zurücksetzen des Passworts ist ungültig.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild className="w-full">
						<Link href="/login">Zur Anmeldung</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (state.success) {
		return (
			<Card className="w-full max-w-sm">
				<CardHeader className="text-center">
					<CardTitle className="font-serif text-2xl uppercase">
						Passwort geändert
					</CardTitle>
					<CardDescription>
						Ihr Passwort wurde erfolgreich geändert.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="rounded-md border border-green-500/20 bg-green-500/10 p-4">
							<p className="text-green-600 text-sm dark:text-green-400">
								Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
							</p>
						</div>
						<Button asChild className="w-full">
							<Link href="/login">Zur Anmeldung</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<CardTitle className="font-serif text-2xl uppercase">
					Neues Passwort
				</CardTitle>
				<CardDescription>Geben Sie Ihr neues Passwort ein.</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Neues Passwort</FormLabel>
									<FormControl>
										<Input placeholder="********" type="password" {...field} />
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
							{isPending ? "Wird gespeichert..." : "Passwort ändern"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<Card className="w-full max-w-sm">
					<CardHeader className="text-center">
						<CardTitle className="font-serif text-2xl uppercase">
							Laden...
						</CardTitle>
					</CardHeader>
				</Card>
			}
		>
			<ResetPasswordContent />
		</Suspense>
	);
}
