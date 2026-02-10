const PROFILE_SYNC_CHANNEL = "profile-sync";

export interface ProfileUpdate {
	playerId: string;
	name: string;
	image?: string | null;
}

/**
 * Broadcast a profile update to all listeners (same tab + other tabs).
 * Uses both a custom DOM event (same tab) and BroadcastChannel (other tabs).
 */
export function broadcastProfileUpdate(update: ProfileUpdate) {
	// Same-tab delivery via custom event
	window.dispatchEvent(
		new CustomEvent(PROFILE_SYNC_CHANNEL, { detail: update }),
	);

	// Cross-tab delivery via BroadcastChannel
	const channel = new BroadcastChannel(PROFILE_SYNC_CHANNEL);
	channel.postMessage(update);
	channel.close();
}

/**
 * Subscribe to profile updates from same tab and other tabs.
 * Returns a cleanup function.
 */
export function onProfileUpdate(
	callback: (update: ProfileUpdate) => void,
): () => void {
	// Same-tab listener
	const handleEvent = (e: Event) => {
		callback((e as CustomEvent<ProfileUpdate>).detail);
	};
	window.addEventListener(PROFILE_SYNC_CHANNEL, handleEvent);

	// Cross-tab listener
	const channel = new BroadcastChannel(PROFILE_SYNC_CHANNEL);
	channel.onmessage = (event: MessageEvent<ProfileUpdate>) => {
		callback(event.data);
	};

	return () => {
		window.removeEventListener(PROFILE_SYNC_CHANNEL, handleEvent);
		channel.close();
	};
}
