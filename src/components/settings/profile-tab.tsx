"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
	onClose?: () => void;
}

async function getCroppedImg(
	imageSrc: string,
	pixelCrop: Area,
): Promise<Blob | null> {
	const image = new Image();
	image.src = imageSrc;

	await new Promise((resolve) => {
		image.onload = resolve;
	});

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return null;
	}

	const outputSize = 256;
	canvas.width = outputSize;
	canvas.height = outputSize;

	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
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
}

export function ProfileTab({ user, onClose }: ProfileTabProps) {
	const [name, setName] = useState(user.name);
	const [currentImage, setCurrentImage] = useState<string | null>(user.image);
	const [isUploading, setIsUploading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// Cropping state
	const [imageSrc, setImageSrc] = useState<string>("");
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

	const handleImageSelected = useCallback((file: File) => {
		const reader = new FileReader();
		reader.onload = () => {
			setImageSrc(reader.result as string);
			setCrop({ x: 0, y: 0 });
			setZoom(1);
		};
		reader.readAsDataURL(file);
	}, []);

	const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
		setCroppedAreaPixels(croppedAreaPixels);
	}, []);

	const handleCropAndUpload = useCallback(async () => {
		if (!croppedAreaPixels || !imageSrc) return;

		setIsUploading(true);

		try {
			const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
			if (!croppedBlob) {
				throw new Error("Failed to crop image");
			}

			const file = new File([croppedBlob], "avatar.webp", {
				type: "image/webp",
			});

			const blob = await upload(`avatars/${Date.now()}-avatar.webp`, file, {
				access: "public",
				handleUploadUrl: "/api/avatar/upload",
			});

			setCurrentImage(blob.url);
			setImageSrc(""); // Clear cropping view
			toast.success("Bild erfolgreich hochgeladen!");
		} catch (error) {
			console.error("Upload error:", error);
			toast.error("Fehler beim Hochladen des Bildes");
		} finally {
			setIsUploading(false);
		}
	}, [croppedAreaPixels, imageSrc]);

	const handleCropCancel = useCallback(() => {
		setImageSrc("");
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setCroppedAreaPixels(null);
	}, []);

	const handleImageDelete = useCallback(() => {
		setCurrentImage(null);
	}, []);

	const hasChanges = name !== user.name || currentImage !== user.image;

	const handleSave = useCallback(async () => {
		if (!hasChanges) {
			onClose?.();
			return;
		}

		setIsSaving(true);

		try {
			const result = await updateProfile({
				name,
				image: currentImage,
			});

			if (result.success) {
				toast.success("Profil erfolgreich aktualisiert!");
				onClose?.();
			} else {
				toast.error(result.error ?? "Fehler beim Speichern");
			}
		} catch {
			toast.error("Ein unerwarteter Fehler ist aufgetreten.");
		} finally {
			setIsSaving(false);
		}
	}, [name, currentImage, hasChanges, onClose]);

	const isCropping = !!imageSrc;

	// Show cropping view
	if (isCropping) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-sm font-medium">Bild zuschneiden</p>

				<div className="relative h-[300px] w-full">
					<Cropper
						aspect={1}
						crop={crop}
						cropShape="round"
						image={imageSrc}
						onCropChange={setCrop}
						onCropComplete={onCropComplete}
						onZoomChange={setZoom}
						zoom={zoom}
					/>
				</div>

				<div className="flex items-center gap-2">
					<Label className="text-xs text-muted-foreground" htmlFor="zoom">
						Zoom
					</Label>
					<input
						className="h-1 flex-1 cursor-pointer appearance-none rounded-lg bg-border accent-primary"
						id="zoom"
						max={3}
						min={1}
						onChange={(e) => setZoom(Number(e.target.value))}
						step={0.1}
						type="range"
						value={zoom}
					/>
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
						disabled={!croppedAreaPixels || isUploading}
						onClick={handleCropAndUpload}
					>
						{isUploading ? "Wird übernommen..." : "Übernehmen"}
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

			{/* Save Button */}
			<Button
				className="w-full"
				disabled={isSaving || isUploading || name.length < 2}
				onClick={handleSave}
			>
				{isSaving ? "Wird gespeichert..." : "Speichern"}
			</Button>
		</div>
	);
}
