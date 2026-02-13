"use client";

import { useEffect, useState } from "react";

export type ConnectionLoadingState = "connecting" | "waiting" | "unreachable";

interface UseConnectionLoadingStateOptions {
	isConnected: boolean;
	hasGameState: boolean;
	timeoutMs?: number;
}

export function useConnectionLoadingState({
	isConnected,
	hasGameState,
	timeoutMs = 8_000,
}: UseConnectionLoadingStateOptions): ConnectionLoadingState {
	const [isServerUnreachable, setIsServerUnreachable] = useState(false);

	useEffect(() => {
		if (isConnected || hasGameState) {
			setIsServerUnreachable(false);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setIsServerUnreachable(true);
		}, timeoutMs);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [isConnected, hasGameState, timeoutMs]);

	if (isConnected) {
		return "waiting";
	}
	return isServerUnreachable ? "unreachable" : "connecting";
}
