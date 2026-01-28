import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatBalance(cents: number): string {
	const euros = (cents / 100).toFixed(2).replace(".", ",");
	return `${euros} $`;
}
