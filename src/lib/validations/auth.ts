import { z } from "zod";

export const signUpSchema = z.object({
	name: z
		.string()
		.min(1, { message: "Name ist erforderlich." })
		.min(2, { message: "Name muss mindestens 2 Zeichen lang sein." })
		.max(50, { message: "Name darf maximal 50 Zeichen lang sein." }),
	email: z
		.string()
		.min(1, { message: "E-Mail-Adresse ist erforderlich." })
		.email({ message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }),
	password: z
		.string()
		.min(1, { message: "Passwort ist erforderlich." })
		.min(8, { message: "Passwort muss mindestens 8 Zeichen lang sein." }),
});

export const signInEmailSchema = z.object({
	email: z
		.string()
		.min(1, { message: "E-Mail-Adresse ist erforderlich." })
		.email({ message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }),
	password: z
		.string()
		.min(1, { message: "Passwort ist erforderlich." })
		.min(8, { message: "Passwort muss mindestens 8 Zeichen lang sein." }),
});

export const emailSchema = z.object({
	email: z
		.string()
		.min(1, { message: "E-Mail-Adresse ist erforderlich." })
		.email({ message: "Bitte geben Sie eine gültige E-Mail-Adresse ein." }),
});

export const resetPasswordSchema = z.object({
	password: z
		.string()
		.min(1, { message: "Passwort ist erforderlich." })
		.min(8, { message: "Passwort muss mindestens 8 Zeichen lang sein." }),
	token: z.string().min(1, { message: "Token ist erforderlich." }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInEmailInput = z.infer<typeof signInEmailSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
