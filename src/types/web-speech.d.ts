export {};

declare global {
	interface WebSpeechRecognitionAlternative {
		transcript: string;
		confidence: number;
	}

	interface WebSpeechRecognitionResult {
		isFinal: boolean;
		length: number;
		[index: number]: WebSpeechRecognitionAlternative;
	}

	interface WebSpeechRecognitionResultList {
		length: number;
		[index: number]: WebSpeechRecognitionResult;
	}

	interface WebSpeechRecognitionEvent extends Event {
		resultIndex: number;
		results: WebSpeechRecognitionResultList;
	}

	interface WebSpeechRecognitionErrorEvent extends Event {
		error: string;
		message?: string;
	}

	interface WebSpeechRecognitionInstance extends EventTarget {
		continuous: boolean;
		interimResults: boolean;
		lang: string;
		maxAlternatives: number;
		onstart: ((event: Event) => void) | null;
		onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
		onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
		onend: ((event: Event) => void) | null;
		start: () => void;
		stop: () => void;
		abort: () => void;
	}

	interface WebSpeechRecognitionConstructor {
		new (): WebSpeechRecognitionInstance;
	}

	interface Window {
		SpeechRecognition?: WebSpeechRecognitionConstructor;
		webkitSpeechRecognition?: WebSpeechRecognitionConstructor;
	}
}
