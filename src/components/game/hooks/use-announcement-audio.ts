"use client";

import { useCallback, useEffect, useRef } from "react";
import { getAnnouncementAudioEvents } from "@/lib/game/announcement-audio-events";
import { useAnnouncementAudioSettings } from "@/lib/hooks/use-announcement-audio-settings";
import { useGameState } from "@/stores/game-selectors";
import type { GameState } from "@/types/game";

const SPEECH_LANGUAGE = "de-DE";

let activeSpeakerToken: symbol | null = null;

function isSpeechSynthesisSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		"speechSynthesis" in window &&
		typeof SpeechSynthesisUtterance !== "undefined"
	);
}

export function useAnnouncementAudio(): void {
	const speakerTokenRef = useRef(Symbol("announcement-audio"));
	const gameState = useGameState();
	const { enabled } = useAnnouncementAudioSettings();
	const previousStateRef = useRef<GameState | null>(null);
	const initializedRef = useRef(false);
	const queueRef = useRef<string[]>([]);
	const isSpeakingRef = useRef(false);

	const isActiveSpeaker = useCallback(() => {
		return activeSpeakerToken === speakerTokenRef.current;
	}, []);

	const speakNext = useCallback(() => {
		if (!isActiveSpeaker()) return;

		if (!isSpeechSynthesisSupported()) {
			queueRef.current = [];
			isSpeakingRef.current = false;
			return;
		}

		const nextText = queueRef.current.shift();
		if (!nextText) {
			isSpeakingRef.current = false;
			return;
		}

		const utterance = new SpeechSynthesisUtterance(nextText);
		utterance.lang = SPEECH_LANGUAGE;
		utterance.onend = () => {
			isSpeakingRef.current = false;
			speakNext();
		};
		utterance.onerror = () => {
			isSpeakingRef.current = false;
			speakNext();
		};

		isSpeakingRef.current = true;
		window.speechSynthesis.speak(utterance);
	}, [isActiveSpeaker]);

	const enqueueTexts = useCallback(
		(texts: string[]) => {
			if (!isActiveSpeaker()) return;
			if (!texts.length) return;
			queueRef.current.push(...texts);
			if (!isSpeakingRef.current) {
				speakNext();
			}
		},
		[isActiveSpeaker, speakNext],
	);

	useEffect(() => {
		if (!isActiveSpeaker()) return;
		if (enabled) return;

		queueRef.current = [];
		isSpeakingRef.current = false;

		if (isSpeechSynthesisSupported()) {
			window.speechSynthesis.cancel();
		}
	}, [enabled, isActiveSpeaker]);

	useEffect(() => {
		if (!isActiveSpeaker()) return;
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

		const events = getAnnouncementAudioEvents(previousState, gameState);
		if (!enabled || events.length === 0) return;

		enqueueTexts(events.map((event) => event.text));
	}, [enabled, enqueueTexts, gameState, isActiveSpeaker]);

	useEffect(() => {
		activeSpeakerToken = speakerTokenRef.current;
		if (isSpeechSynthesisSupported()) {
			window.speechSynthesis.cancel();
		}

		return () => {
			if (activeSpeakerToken === speakerTokenRef.current) {
				activeSpeakerToken = null;
			}
		};
	}, []);

	useEffect(() => {
		return () => {
			queueRef.current = [];
			isSpeakingRef.current = false;
			if (isSpeechSynthesisSupported()) {
				window.speechSynthesis.cancel();
			}
		};
	}, []);
}
