"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useRef, useState } from "react";
import ReactCrop, {
	type Crop,
	centerCrop,
	makeAspectCrop,
	type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { InfoBox } from "@/components/ui/info-box";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/server/actions/profile";
import { ImageUpload } from "./image-upload";

interface ProfileTabProps {
	user: {
		id: string;
		name: string;
		image: string | null;
	};
}

function centerAspectCrop(
	mediaWidth: number,
	mediaHeight: number,
	aspect: number,
): Crop {
	return centerCrop(
		makeAspectCrop(
			{
				unit: "%",
				width: 90,
			},
			aspect,
			mediaWidth,
			mediaHeight,
		),
		mediaWidth,
		mediaHeight,
	);
}

export function ProfileTab({ user }: ProfileTabProps) {
	const [name, setName] = useState(user.name);
	const [currentImage, setCurrentImage] = useState<string | null>(user.image);
	const [isUploading, setIsUploading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	// Cropping state
	const [imageSrc, setImageSrc] = useState<string>("");
	const [crop, setCrop] = useState<Crop>();
	const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
	const imgRef = useRef<HTMLImageElement>(null);

	const handleImageSelected = useCallback((file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			setImageSrc(reader.result as string);
		};
		reader.readAsDataURL(file);
	}, []);

	const onImageLoad = useCallback(
		(e: React.SyntheticEvent<HTMLImageElement>) => {
			const { width, height } = e.currentTarget;
			setCrop(centerAspectCrop(width, height, 1));
		},
		[],
	);

	const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
		const image = imgRef.current;
		if (!image || !completedCrop) {
			return null;
		}

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return null;
		}

		const scaleX = image.naturalWidth / image.width;
		const scaleY = image.naturalHeight / image.height;

		const outputSize = 256;
		canvas.width = outputSize;
		canvas.height = outputSize;

		ctx.drawImage(
			image,
			completedCrop.x * scaleX,
			completedCrop.y * scaleY,
			completedCrop.width * scaleX,
			completedCrop.height * scaleY,
			0,
			0,
			outputSize,
			outputSize,
		);

		return new Promise((resolve) => {
			canvas.toBlob(
				(blob) => {
					resolve(blob);
				},
				"image/webp",
				0.9,
			);
		});
	}, [completedCrop]);

	const handleCropAndUpload = useCallback(async () => {
		const croppedBlob = await getCroppedImg();
		if (!croppedBlob) return;

		setIsUploading(true);
		setMessage(null);

		try {
			const file = new File([croppedBlob], "avatar.webp", {
				type: "image/webp",
			});

			const blob = await upload(`avatars/${Date.now()}-avatar.webp`, file, {
				access: "public",
				handleUploadUrl: "/api/avatar/upload",
			});

			setCurrentImage(blob.url);
			setImageSrc(""); // Clear cropping view
			setMessage({
				type: "success",
				text: "Bild erfolgreich hochgeladen!",
			});
		} catch (error) {
			console.error("Upload error:", error);
			setMessage({
				type: "error",
				text: "Fehler beim Hochladen des Bildes",
			});
		} finally {
			setIsUploading(false);
		}
	}, [getCroppedImg]);

	const handleCropCancel = useCallback(() => {
		setImageSrc("");
		setCrop(undefined);
		setCompletedCrop(undefined);
	}, []);

	const handleImageDelete = useCallback(() => {
		setCurrentImage(null);
	}, []);

	const handleSave = useCallback(async () => {
		setIsSaving(true);
		setMessage(null);

		try {
			const result = await updateProfile({
				name,
				image: currentImage,
			});

			if (result.success) {
				setMessage({
					type: "success",
					text: "Profil erfolgreich aktualisiert!",
				});
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			} else {
				setMessage({
					type: "error",
					text: result.error ?? "Fehler beim Speichern",
				});
			}
		} catch {
			setMessage({
				type: "error",
				text: "Ein unerwarteter Fehler ist aufgetreten.",
			});
		} finally {
			setIsSaving(false);
		}
	}, [name, currentImage]);

	const hasChanges = name !== user.name || currentImage !== user.image;
	const isCropping = !!imageSrc;

	// Show cropping view
	if (isCropping) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-sm font-medium">Bild zuschneiden</p>

				<div className="flex justify-center">
					<ReactCrop
						aspect={1}
						circularCrop
						className="max-h-[300px]"
						crop={crop}
						onChange={(_, percentCrop) => setCrop(percentCrop)}
						onComplete={(c) => setCompletedCrop(c)}
					>
						{/* biome-ignore lint/a11y/useAltText: Cropper image */}
						{/* biome-ignore lint/performance/noImgElement: ReactCrop requires img element */}
						<img
							className="max-h-[300px] w-auto"
							onLoad={onImageLoad}
							ref={imgRef}
							src={imageSrc}
						/>
					</ReactCrop>
				</div>

				<div className="flex gap-2">
					<Button
						className="flex-1"
						onClick={handleCropCancel}
						variant="outline"
					>
						Abbrechen
					</Button>
					<Button
						className="flex-1"
						disabled={!completedCrop || isUploading}
						onClick={handleCropAndUpload}
					>
						{isUploading ? "Wird hochgeladen..." : "Zuschneiden & Hochladen"}
					</Button>
				</div>
			</div>
		);
	}

	// Show normal profile view
	return (
		<div className="flex flex-col gap-6">
			{/* Avatar Upload */}
			<ImageUpload
				currentImage={currentImage}
				isUploading={isUploading}
				onImageDelete={handleImageDelete}
				onImageSelected={handleImageSelected}
				userName={name}
			/>

			{/* Username Input */}
			<div className="flex flex-col gap-2">
				<Label htmlFor="username">Username</Label>
				<Input
					id="username"
					maxLength={50}
					minLength={2}
					onChange={(e) => setName(e.target.value)}
					placeholder="Dein Name"
					value={name}
				/>
				<p className="text-xs text-muted-foreground">
					Der Name muss zwischen 2 und 50 Zeichen lang sein.
				</p>
			</div>

			{/* Feedback Message */}
			{message && (
				<InfoBox variant={message.type === "success" ? "success" : "error"}>
					{message.text}
				</InfoBox>
			)}

			{/* Save Button */}
			<Button
				className="w-full"
				disabled={isSaving || isUploading || !hasChanges || name.length < 2}
				onClick={handleSave}
			>
				{isSaving ? "Wird gespeichert..." : "Speichern"}
			</Button>
		</div>
	);
}
