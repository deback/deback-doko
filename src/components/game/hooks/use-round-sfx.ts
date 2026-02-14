"use client";

import { useEffect, useRef } from "react";
import { getRoundSfxEvent } from "@/lib/game/round-sfx-events";
import { useAnnouncementAudioSettings } from "@/lib/hooks/use-announcement-audio-settings";
import { useGameState } from "@/stores/game-selectors";
import type { GameState } from "@/types/game";

const SHUFFLE_SOUND_PATH = "/sounds/shuffle.mp3";
const DEAL_SOUND_PATH = "/sounds/deal.mp3";
const DEAL_DELAY_MS = 350;
const EFFECT_VOLUME = 0.22;

function createEffectAudio(path: string): HTMLAudioElement | null {
	if (typeof window === "undefined") return null;

	try {
		const audio = new Audio(path);
		audio.volume = EFFECT_VOLUME;
		return audio;
	} catch {
		return null;
	}
}

function playAudioSilently(audio: HTMLAudioElement | null) {
	if (!audio) return;
	void audio.play().catch(() => {
		// Browser autoplay policies can block playback; fail silently.
	});
}

function stopAudio(audio: HTMLAudioElement) {
	try {
		audio.pause();
		audio.currentTime = 0;
	} catch {
		// Ignore cleanup errors for disposed audio instances.
	}
}

export function useRoundSfx(): void {
	const gameState = useGameState();
	const { enabled } = useAnnouncementAudioSettings();
	const previousStateRef = useRef<GameState | null>(null);
	const initializedRef = useRef(false);
	const playedRoundIdsRef = useRef<Set<string>>(new Set());
	const dealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const activeAudiosRef = useRef<HTMLAudioElement[]>([]);

	useEffect(() => {
		const clearPlayback = () => {
			if (dealTimeoutRef.current !== null) {
				clearTimeout(dealTimeoutRef.current);
				dealTimeoutRef.current = null;
			}
			for (const audio of activeAudiosRef.current) {
				stopAudio(audio);
			}
			activeAudiosRef.current = [];
		};

		if (!enabled) {
			clearPlayback();
			return;
		}

		if (!gameState) {
			previousStateRef.current = null;
			initializedRef.current = false;
			return;
		}

		if (!initializedRef.current) {
			previousStateRef.current = gameState;
			initializedRef.current = true;
			return;
		}

		const previousState = previousStateRef.current;
		previousStateRef.current = gameState;
		if (!previousState) return;

		const event = getRoundSfxEvent(previousState, gameState);
		if (!event || playedRoundIdsRef.current.has(event.roundId)) return;

		playedRoundIdsRef.current.add(event.roundId);
		clearPlayback();

		const shuffleAudio = createEffectAudio(SHUFFLE_SOUND_PATH);
		if (shuffleAudio) {
			activeAudiosRef.current.push(shuffleAudio);
		}
		playAudioSilently(shuffleAudio);

		dealTimeoutRef.current = setTimeout(() => {
			const dealAudio = createEffectAudio(DEAL_SOUND_PATH);
			if (dealAudio) {
				activeAudiosRef.current.push(dealAudio);
			}
			playAudioSilently(dealAudio);
			dealTimeoutRef.current = null;
		}, DEAL_DELAY_MS);

		return clearPlayback;
	}, [enabled, gameState]);

	useEffect(() => {
		return () => {
			if (dealTimeoutRef.current !== null) {
				clearTimeout(dealTimeoutRef.current);
				dealTimeoutRef.current = null;
			}
			for (const audio of activeAudiosRef.current) {
				stopAudio(audio);
			}
			activeAudiosRef.current = [];
		};
	}, []);
}
