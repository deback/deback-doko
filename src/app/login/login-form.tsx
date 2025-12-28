"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { authClient } from "@/server/better-auth/client";

const formSchema = z.object({
	email: z
		.string()
		.min(1, {
			message: "E-Mail-Adresse ist erforderlich.",
		})
		.email({
			message: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
		}),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function LoginForm() {
	const [isLoading, setIsLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	// 1. Define your form.
	const form = useForm<LoginFormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	// 2. Define a submit handler.
	async function onSubmit(values: LoginFormValues) {
		setIsLoading(true);
		setSuccess(false);

		try {
			const result = await authClient.signIn.magicLink({
				email: values.email,
				callbackURL: "/",
			});

			if (result.error) {
				form.setError("email", {
					message: result.error.message || "Fehler beim Senden des Magic Links",
				});
			} else {
				setSuccess(true);
			}
		} catch (error) {
			form.setError("email", {
				message: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
			});
		} finally {
			setIsLoading(false);
		}
	}

	if (success) {
		return (
			<div className="space-y-4">
				<div className="rounded-md border border-green-500/20 bg-green-500/10 p-4">
					<p className="text-green-400 text-sm">
						Magic Link wurde erfolgreich gesendet! Bitte überprüfen Sie Ihr
						E-Mail-Postfach und klicken Sie auf den Link, um sich anzumelden.
					</p>
				</div>
				<Button
					className="w-full"
					onClick={() => {
						setSuccess(false);
						form.reset();
					}}
					variant="outline"
				>
					Neuen Link anfordern
				</Button>
			</div>
		);
	}

	return (
		<Form {...form}>
			<form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>E-Mail-Adresse</FormLabel>
							<FormControl>
								<Input
									disabled={isLoading}
									placeholder="ihre@email.de"
									type="email"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<Button className="w-full" disabled={isLoading} type="submit">
					{isLoading ? "Wird gesendet..." : "Magic Link senden"}
				</Button>
			</form>
		</Form>
	);
}
