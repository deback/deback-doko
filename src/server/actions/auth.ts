"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	emailSchema,
	resetPasswordSchema,
	signInEmailSchema,
	signUpSchema,
} from "@/lib/validations/auth";
import { auth } from "@/server/better-auth/config";

export type ActionState = {
	success: boolean;
	error?: string;
};

export async function signUpAction(
	_prevState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const rawData = {
		name: formData.get("name"),
		email: formData.get("email"),
		password: formData.get("password"),
	};

	const parsed = signUpSchema.safeParse(rawData);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
	}

	try {
		const result = await auth.api.signUpEmail({
			body: {
				name: parsed.data.name,
				email: parsed.data.email,
				password: parsed.data.password,
				callbackURL: "/welcome",
			},
			headers: await headers(),
		});

		if (!result) {
			return { success: false, error: "Registrierung fehlgeschlagen." };
		}

		return { success: true };
	} catch (error) {
		if (error instanceof Error && error.message.includes("already exists")) {
			return {
				success: false,
				error: "Ein Konto mit dieser E-Mail-Adresse existiert bereits.",
			};
		}
		return {
			success: false,
			error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
		};
	}
}

export async function signInEmailAction(
	_prevState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const rawData = {
		email: formData.get("email"),
		password: formData.get("password"),
	};

	const parsed = signInEmailSchema.safeParse(rawData);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
	}

	let success = false;

	try {
		const result = await auth.api.signInEmail({
			body: {
				email: parsed.data.email,
				password: parsed.data.password,
			},
			headers: await headers(),
		});

		if (!result) {
			return { success: false, error: "E-Mail oder Passwort ist falsch." };
		}

		success = true;
	} catch (error) {
		if (error instanceof Error) {
			if (error.message.includes("not verified")) {
				return {
					success: false,
					error:
						"Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte überprüfen Sie Ihr Postfach.",
				};
			}
			if (
				error.message.includes("Invalid") ||
				error.message.includes("password")
			) {
				return { success: false, error: "E-Mail oder Passwort ist falsch." };
			}
		}
		return {
			success: false,
			error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
		};
	}

	if (success) {
		redirect("/");
	}

	return { success: false };
}

export async function signInMagicLinkAction(
	_prevState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const rawData = {
		email: formData.get("email"),
	};

	const parsed = emailSchema.safeParse(rawData);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
	}

	try {
		await auth.api.signInMagicLink({
			body: {
				email: parsed.data.email,
			},
			headers: await headers(),
		});

		return { success: true };
	} catch (_error) {
		return {
			success: false,
			error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
		};
	}
}

export async function requestPasswordResetAction(
	_prevState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const rawData = {
		email: formData.get("email"),
	};

	const parsed = emailSchema.safeParse(rawData);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
	}

	try {
		await auth.api.requestPasswordReset({
			body: {
				email: parsed.data.email,
				redirectTo: "/reset-password",
			},
			headers: await headers(),
		});

		return { success: true };
	} catch (error) {
		console.error("Password reset error:", error);
		return {
			success: false,
			error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
		};
	}
}

export async function resetPasswordAction(
	_prevState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	const rawData = {
		password: formData.get("password"),
		token: formData.get("token"),
	};

	const parsed = resetPasswordSchema.safeParse(rawData);
	if (!parsed.success) {
		return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
	}

	try {
		await auth.api.resetPassword({
			body: {
				newPassword: parsed.data.password,
				token: parsed.data.token,
			},
			headers: await headers(),
		});

		return { success: true };
	} catch (error) {
		if (error instanceof Error && error.message.includes("Invalid")) {
			return {
				success: false,
				error:
					"Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.",
			};
		}
		return {
			success: false,
			error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
		};
	}
}
