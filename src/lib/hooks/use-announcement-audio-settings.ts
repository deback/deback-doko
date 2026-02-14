"use client";

import { useCallback, useSyncExternalStore } from "react";

const ANNOUNCEMENT_AUDIO_STORAGE_KEY = "deback-doko-announcement-audio-enabled";
const DEFAULT_ANNOUNCEMENT_AUDIO_ENABLED = true;

const listeners = new Set<() => void>();

function readAnnouncementAudioEnabled(): boolean {
	if (typeof window === "undefined") {
		return DEFAULT_ANNOUNCEMENT_AUDIO_ENABLED;
	}

	const stored = window.localStorage.getItem(ANNOUNCEMENT_AUDIO_STORAGE_KEY);
	if (stored === null) return DEFAULT_ANNOUNCEMENT_AUDIO_ENABLED;
	return stored === "true";
}

function notifyListeners() {
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);

	if (typeof window === "undefined") {
		return () => {
			listeners.delete(listener);
		};
	}

	const handleStorage = (event: StorageEvent) => {
		if (event.key === ANNOUNCEMENT_AUDIO_STORAGE_KEY) {
			listener();
		}
	};

	window.addEventListener("storage", handleStorage);

	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", handleStorage);
	};
}

function setAnnouncementAudioEnabled(nextEnabled: boolean) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(
		ANNOUNCEMENT_AUDIO_STORAGE_KEY,
		String(nextEnabled),
	);
	notifyListeners();
}

export function useAnnouncementAudioSettings() {
	const enabled = useSyncExternalStore(
		subscribe,
		readAnnouncementAudioEnabled,
		() => DEFAULT_ANNOUNCEMENT_AUDIO_ENABLED,
	);

	const setEnabled = useCallback((nextEnabled: boolean) => {
		setAnnouncementAudioEnabled(nextEnabled);
	}, []);

	return {
		enabled,
		setEnabled,
	};
}
