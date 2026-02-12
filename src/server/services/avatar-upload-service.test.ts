import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	handleUpload: vi.fn(),
}));

vi.mock("@vercel/blob/client", () => ({
	handleUpload: mocks.handleUpload,
}));

import { processAvatarUpload } from "./avatar-upload-service";

describe("avatar-upload-service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls handleUpload with expected avatar constraints", async () => {
		mocks.handleUpload.mockResolvedValue({ ok: true });

		const request = new Request("https://example.com/api/avatar/upload", {
			method: "POST",
		});
		const body = {} as Parameters<typeof processAvatarUpload>[0]["body"];

		const result = await processAvatarUpload({ request, body });

		expect(result).toEqual({ ok: true });
		expect(mocks.handleUpload).toHaveBeenCalledTimes(1);

		const callArgs = mocks.handleUpload.mock.calls[0]?.[0];
		expect(callArgs?.request).toBe(request);
		expect(callArgs?.body).toBe(body);
		expect(callArgs?.onBeforeGenerateToken).toBeTypeOf("function");
		expect(callArgs?.onUploadCompleted).toBeTypeOf("function");

		const tokenConfig = await callArgs?.onBeforeGenerateToken("avatars/test");
		expect(tokenConfig).toEqual({
			allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
			maximumSizeInBytes: 5 * 1024 * 1024,
			addRandomSuffix: true,
		});
	});

	it("propagates errors from handleUpload", async () => {
		mocks.handleUpload.mockRejectedValue(new Error("upload failed"));

		const request = new Request("https://example.com/api/avatar/upload", {
			method: "POST",
		});
		const body = {} as Parameters<typeof processAvatarUpload>[0]["body"];

		await expect(processAvatarUpload({ request, body })).rejects.toThrow(
			"upload failed",
		);
	});
});
