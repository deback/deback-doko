import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	return {
		select: vi.fn(),
		update: vi.fn(),
		del: vi.fn(),
		notifyPlayerInfoUpdate: vi.fn(),
		eq: vi.fn((a, b) => ({ a, b })),
	};
});

vi.mock("drizzle-orm", () => ({ eq: mocks.eq }));

vi.mock("../db", () => ({
	db: {
		select: mocks.select,
		update: mocks.update,
	},
}));

vi.mock("../db/schema", () => ({
	user: {
		id: "id",
		name: "name",
		image: "image",
		updatedAt: "updatedAt",
	},
}));

vi.mock("@vercel/blob", () => ({ del: mocks.del }));

vi.mock("../../lib/notify-partykit", () => ({
	notifyPlayerInfoUpdate: mocks.notifyPlayerInfoUpdate,
}));

import {
	updateProfileService,
	updateUserImageService,
	updateUserNameService,
} from "./profile-service";

const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

function mockSelectResult(value: unknown) {
	const limit = vi.fn().mockResolvedValue(value);
	const where = vi.fn().mockReturnValue({ limit });
	const from = vi.fn().mockReturnValue({ where });
	mocks.select.mockReturnValue({ from });
}

function mockUpdateSuccess() {
	const where = vi.fn().mockResolvedValue(undefined);
	const set = vi.fn().mockReturnValue({ where });
	mocks.update.mockReturnValue({ set });
	return { set, where };
}

describe("profile-service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		consoleErrorSpy.mockRestore();
	});

	it("updates profile, deletes previous blob avatar and notifies PartyKit", async () => {
		const oldImageUrl =
			"https://blob.vercel-storage.com/avatars/old-avatar.webp";
		const newImageUrl =
			"https://blob.vercel-storage.com/avatars/new-avatar.webp";

		mockSelectResult([{ image: oldImageUrl }]);
		const { set } = mockUpdateSuccess();

		const result = await updateProfileService({
			userId: "user-1",
			name: "Alice",
			image: newImageUrl,
		});

		expect(result).toEqual({ success: true });
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Alice",
				image: newImageUrl,
				updatedAt: expect.any(Date),
			}),
		);
		expect(mocks.del).toHaveBeenCalledWith(oldImageUrl);
		expect(mocks.notifyPlayerInfoUpdate).toHaveBeenCalledWith(
			"user-1",
			"Alice",
			newImageUrl,
		);
	});

	it("does not delete avatar when old and new image are identical", async () => {
		const sameImageUrl =
			"https://blob.vercel-storage.com/avatars/same-avatar.webp";

		mockSelectResult([{ image: sameImageUrl }]);
		mockUpdateSuccess();

		const result = await updateProfileService({
			userId: "user-1",
			name: "Alice",
			image: sameImageUrl,
		});

		expect(result).toEqual({ success: true });
		expect(mocks.del).not.toHaveBeenCalled();
	});

	it("does not delete avatar when old image is not a Vercel blob URL", async () => {
		mockSelectResult([{ image: "https://example.com/avatar.jpg" }]);
		mockUpdateSuccess();

		const result = await updateProfileService({
			userId: "user-1",
			name: "Alice",
			image: "https://blob.vercel-storage.com/avatars/new-avatar.webp",
		});

		expect(result).toEqual({ success: true });
		expect(mocks.del).not.toHaveBeenCalled();
	});

	it("returns an error result when profile update fails", async () => {
		mockSelectResult([{ image: null }]);
		const where = vi.fn().mockRejectedValue(new Error("db down"));
		const set = vi.fn().mockReturnValue({ where });
		mocks.update.mockReturnValue({ set });

		const result = await updateProfileService({
			userId: "user-1",
			name: "Alice",
			image: null,
		});

		expect(result).toEqual({
			success: false,
			error: "Fehler beim Aktualisieren des Profils",
		});
		expect(mocks.notifyPlayerInfoUpdate).not.toHaveBeenCalled();
	});

	it("returns not found for updateUserNameService when user does not exist", async () => {
		mockSelectResult([]);

		const result = await updateUserNameService({
			userId: "missing-user",
			name: "Alice",
		});

		expect(result).toEqual({ success: false, error: "User nicht gefunden" });
		expect(mocks.notifyPlayerInfoUpdate).not.toHaveBeenCalled();
	});

	it("updates image without PartyKit notify in updateUserImageService", async () => {
		mockSelectResult([{ image: null }]);
		mockUpdateSuccess();

		const result = await updateUserImageService({
			userId: "user-1",
			image: null,
		});

		expect(result).toEqual({ success: true });
		expect(mocks.notifyPlayerInfoUpdate).not.toHaveBeenCalled();
	});
});
