"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_LANGUAGE = "de-DE";
const DEFAULT_SILENCE_TIMEOUT_MS = 1_500;

export type SpeechToTextStatus =
	| "unsupported"
	| "idle"
	| "listening"
	| "processing"
	| "error";

interface UseSpeechToTextOptions {
	lang?: string;
	silenceTimeoutMs?: number;
}

interface UseSpeechToTextReturn {
	status: SpeechToTextStatus;
	isSupported: boolean;
	isListening: boolean;
	permissionDenied: boolean;
	finalText: string;
	interimText: string;
	errorMessage: string | null;
	start: () => void;
	stop: () => void;
	cancel: () => void;
}

function normalizeTranscript(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

function appendTranscript(base: string, addition: string): string {
	const normalizedBase = normalizeTranscript(base);
	const normalizedAddition = normalizeTranscript(addition);
	if (!normalizedAddition) return normalizedBase;
	if (!normalizedBase) return normalizedAddition;
	return `${normalizedBase} ${normalizedAddition}`;
}

function mapSpeechError(error: string): string {
	switch (error) {
		case "not-allowed":
		case "service-not-allowed":
			return "Mikrofonzugriff wurde nicht erlaubt.";
		case "audio-capture":
			return "Kein Mikrofon verfügbar.";
		case "network":
			return "Spracherkennung fehlgeschlagen (Netzwerk).";
		case "no-speech":
			return "Keine Sprache erkannt.";
		default:
			return "Spracherkennung fehlgeschlagen.";
	}
}

export function useSpeechToText(
	options: UseSpeechToTextOptions = {},
): UseSpeechToTextReturn {
	const {
		lang = DEFAULT_LANGUAGE,
		silenceTimeoutMs = DEFAULT_SILENCE_TIMEOUT_MS,
	} = options;

	const [status, setStatus] = useState<SpeechToTextStatus>("unsupported");
	const [isSupported, setIsSupported] = useState(false);
	const [permissionDenied, setPermissionDenied] = useState(false);
	const [finalText, setFinalText] = useState("");
	const [interimText, setInterimText] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const statusRef = useRef<SpeechToTextStatus>("unsupported");
	const recognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);
	const recognitionCtorRef = useRef<WebSpeechRecognitionConstructor | null>(
		null,
	);
	const finalTextRef = useRef("");
	const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const setStatusSafe = useCallback((nextStatus: SpeechToTextStatus) => {
		statusRef.current = nextStatus;
		setStatus(nextStatus);
	}, []);

	const clearSilenceTimeout = useCallback(() => {
		if (silenceTimeoutRef.current === null) return;
		clearTimeout(silenceTimeoutRef.current);
		silenceTimeoutRef.current = null;
	}, []);

	const stop = useCallback(() => {
		const recognition = recognitionRef.current;
		if (!recognition) return;

		clearSilenceTimeout();

		if (statusRef.current === "listening") {
			setStatusSafe("processing");
		}

		try {
			recognition.stop();
		} catch {
			if (statusRef.current === "processing") {
				setStatusSafe("idle");
			}
		}
	}, [clearSilenceTimeout, setStatusSafe]);

	const resetSilenceTimeout = useCallback(() => {
		clearSilenceTimeout();
		if (statusRef.current !== "listening") return;

		silenceTimeoutRef.current = setTimeout(() => {
			stop();
		}, silenceTimeoutMs);
	}, [clearSilenceTimeout, silenceTimeoutMs, stop]);

	const ensureRecognition = useCallback(() => {
		if (recognitionRef.current) return recognitionRef.current;
		const RecognitionCtor = recognitionCtorRef.current;
		if (!RecognitionCtor) return null;

		const recognition = new RecognitionCtor();
		recognition.lang = lang;
		recognition.interimResults = true;
		recognition.continuous = true;
		recognition.maxAlternatives = 1;

		recognition.onstart = () => {
			setErrorMessage(null);
			setPermissionDenied(false);
			setStatusSafe("listening");
			resetSilenceTimeout();
		};

		recognition.onresult = (event) => {
			let nextFinal = finalTextRef.current;
			let nextInterim = "";

			for (
				let index = event.resultIndex;
				index < event.results.length;
				index++
			) {
				const result = event.results[index];
				if (!result) continue;
				const transcript = result?.[0]?.transcript ?? "";
				if (!transcript) continue;
				if (result.isFinal) {
					nextFinal = appendTranscript(nextFinal, transcript);
				} else {
					nextInterim = appendTranscript(nextInterim, transcript);
				}
			}

			finalTextRef.current = nextFinal;
			setFinalText(nextFinal);
			setInterimText(nextInterim);
			resetSilenceTimeout();
		};

		recognition.onerror = (event) => {
			clearSilenceTimeout();
			if (event.error === "aborted") {
				setStatusSafe("idle");
				return;
			}
			if (
				event.error === "not-allowed" ||
				event.error === "service-not-allowed"
			) {
				setPermissionDenied(true);
			} else {
				setPermissionDenied(false);
			}
			setStatusSafe("error");
			setErrorMessage(mapSpeechError(event.error));
		};

		recognition.onend = () => {
			clearSilenceTimeout();
			setInterimText("");
			if (
				statusRef.current === "processing" ||
				statusRef.current === "listening"
			) {
				setStatusSafe("idle");
			}
		};

		recognitionRef.current = recognition;
		return recognition;
	}, [clearSilenceTimeout, lang, resetSilenceTimeout, setStatusSafe]);

	const start = useCallback(() => {
		if (!isSupported) {
			setStatusSafe("unsupported");
			setErrorMessage(
				"Spracherkennung wird in diesem Browser nicht unterstützt.",
			);
			return;
		}

		const recognition = ensureRecognition();
		if (!recognition) {
			setStatusSafe("unsupported");
			setErrorMessage(
				"Spracherkennung wird in diesem Browser nicht unterstützt.",
			);
			return;
		}

		finalTextRef.current = "";
		setFinalText("");
		setInterimText("");
		setErrorMessage(null);
		setPermissionDenied(false);

		try {
			recognition.start();
		} catch (error) {
			const message = error instanceof Error ? error.message.toLowerCase() : "";
			if (message.includes("already")) {
				return;
			}
			setStatusSafe("error");
			setErrorMessage("Spracherkennung konnte nicht gestartet werden.");
		}
	}, [ensureRecognition, isSupported, setStatusSafe]);

	const cancel = useCallback(() => {
		clearSilenceTimeout();
		const recognition = recognitionRef.current;
		if (recognition) {
			try {
				recognition.abort();
			} catch {
				// noop
			}
		}
		finalTextRef.current = "";
		setFinalText("");
		setInterimText("");
		setErrorMessage(null);
		setPermissionDenied(false);
		setStatusSafe(isSupported ? "idle" : "unsupported");
	}, [clearSilenceTimeout, isSupported, setStatusSafe]);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const RecognitionCtor =
			window.SpeechRecognition ?? window.webkitSpeechRecognition;
		recognitionCtorRef.current = RecognitionCtor ?? null;

		if (!RecognitionCtor) {
			setIsSupported(false);
			setStatusSafe("unsupported");
			return;
		}

		setIsSupported(true);
		setStatusSafe("idle");
	}, [setStatusSafe]);

	useEffect(() => {
		const recognition = recognitionRef.current;
		if (!recognition) return;
		recognition.lang = lang;
	}, [lang]);

	useEffect(() => {
		return () => {
			clearSilenceTimeout();
			const recognition = recognitionRef.current;
			if (recognition) {
				try {
					recognition.abort();
				} catch {
					// noop
				}
			}
			recognitionRef.current = null;
		};
	}, [clearSilenceTimeout]);

	return useMemo(
		() => ({
			status,
			isSupported,
			isListening: status === "listening",
			permissionDenied,
			finalText,
			interimText,
			errorMessage,
			start,
			stop,
			cancel,
		}),
		[
			cancel,
			errorMessage,
			finalText,
			interimText,
			isSupported,
			permissionDenied,
			start,
			status,
			stop,
		],
	);
}
