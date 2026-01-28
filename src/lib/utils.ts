import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatBalance(cents: number): string {
	const euros = (cents / 100).toFixed(2).replace(".", ",");
	return `${euros} $`;
}

export function calculateRating(gamesPlayed: number, gamesWon: number): number {
	if (gamesPlayed === 0) return 0;
	const winRate = gamesWon / gamesPlayed;
	const raw = winRate * 3 + (Math.min(gamesPlayed, 100) / 100) * 2;
	return Math.min(5, Math.round(raw * 2) / 2);
}
