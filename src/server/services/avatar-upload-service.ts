import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";

export async function processAvatarUpload(params: {
	request: Request;
	body: HandleUploadBody;
}) {
	return await handleUpload({
		body: params.body,
		request: params.request,
		onBeforeGenerateToken: async (_pathname) => {
			return {
				allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
				maximumSizeInBytes: 5 * 1024 * 1024,
				addRandomSuffix: true,
			};
		},
		onUploadCompleted: async ({ blob }) => {
			console.log("Avatar upload completed:", blob.url);
		},
	});
}
