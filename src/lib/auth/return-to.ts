export function sanitizeReturnToPath(value: unknown): string | null {
	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	if (!trimmed) return null;
	if (!trimmed.startsWith("/")) return null;
	if (trimmed.startsWith("//")) return null;
	if (
		trimmed.includes("\\") ||
		trimmed.includes("\n") ||
		trimmed.includes("\r")
	) {
		return null;
	}

	return trimmed;
}

export function parseReturnTo(value: unknown): string | null {
	if (typeof value !== "string") return null;

	const raw = value.trim();
	if (!raw) return null;

	const candidates = [raw];
	try {
		const decoded = decodeURIComponent(raw);
		if (decoded !== raw) {
			candidates.push(decoded);
		}
	} catch {
		// Ignore invalid percent-encoding and continue with the raw value.
	}

	for (const candidate of candidates) {
		const safe = sanitizeReturnToPath(candidate);
		if (safe) return safe;
	}

	return null;
}

export function appendReturnTo(
	path: string,
	returnTo: string | null | undefined,
): string {
	const safeReturnTo = parseReturnTo(returnTo);
	if (!safeReturnTo) return path;

	const separator = path.includes("?") ? "&" : "?";
	return `${path}${separator}returnTo=${encodeURIComponent(safeReturnTo)}`;
}
