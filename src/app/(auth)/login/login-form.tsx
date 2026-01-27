"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck } from "lucide-react";
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
import { emailSchema } from "@/lib/validations/auth";
import { type ActionState, signInMagicLinkAction } from "@/server/actions/auth";

type FormValues = z.infer<typeof emailSchema>;

const initialState: ActionState = { success: false };

export function LoginForm() {
	const [state, formAction, isPending] = useActionState(
		signInMagicLinkAction,
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

	if (state.success) {
		return (
			<div className="space-y-4">
				<div className="flex items-start gap-3 rounded-md border border-green-500/20 bg-green-500/10 p-4">
					<CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
					<p className="text-sm">
						Magic Link wurde erfolgreich gesendet! Bitte überprüfe dein
						E-Mail-Postfach und klicke auf den Link, um dich anzumelden.
					</p>
				</div>
				<Button
					className="w-full"
					onClick={() => window.location.reload()}
					variant="outline"
				>
					Neuen Link anfordern
				</Button>
			</div>
		);
	}

	return (
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

				{state.error && (
					<div className="rounded-md border border-red-500/20 bg-red-500/10 p-3">
						<p className="text-red-500 text-sm">{state.error}</p>
					</div>
				)}

				<Button className="w-full" disabled={isPending} type="submit">
					{isPending ? "Wird gesendet..." : "Magic Link senden"}
				</Button>
			</form>
		</Form>
	);
}
