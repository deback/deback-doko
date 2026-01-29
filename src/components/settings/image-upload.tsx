"use client";

import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
	currentImage: string | null;
	userName: string;
	onImageSelected: (file: File) => void;
	onImageDelete?: () => void;
	isUploading?: boolean;
}

export function ImageUpload({
	currentImage,
	userName,
	onImageSelected,
	onImageDelete,
	isUploading = false,
}: ImageUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const files = e.dataTransfer.files;
			if (files.length > 0) {
				const file = files[0];
				if (file?.type.startsWith("image/")) {
					onImageSelected(file);
				}
			}
		},
		[onImageSelected],
	);

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (files && files.length > 0) {
				const file = files[0];
				if (file) {
					onImageSelected(file);
				}
			}
			// Reset input so same file can be selected again
			e.target.value = "";
		},
		[onImageSelected],
	);

	const handleChangeImage = useCallback(() => {
		if (!isUploading) {
			fileInputRef.current?.click();
		}
	}, [isUploading]);

	// If no image exists, show simple click/drop zone
	if (!currentImage) {
		return (
			<div className="flex flex-col items-center gap-3">
				<button
					aria-label="Bild hochladen"
					className={cn(
						"relative cursor-pointer rounded-full border-2 border-dashed p-2 transition-colors",
						isDragging
							? "border-primary bg-primary/10"
							: "border-border hover:border-primary/50",
						isUploading && "cursor-not-allowed opacity-50",
					)}
					disabled={isUploading}
					onClick={handleChangeImage}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					type="button"
				>
					<div className="flex size-24 items-center justify-center rounded-full bg-muted font-bold text-3xl">
						{userName.charAt(0).toUpperCase()}
					</div>

					{isUploading && (
						<div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
							<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						</div>
					)}
				</button>

				<p className="text-center text-xs text-muted-foreground">
					Klicken oder Bild hierher ziehen
					<br />
					JPG, PNG oder WebP (max. 5MB)
				</p>

				<input
					accept="image/jpeg,image/png,image/webp"
					className="hidden"
					disabled={isUploading}
					onChange={handleFileSelect}
					ref={fileInputRef}
					type="file"
				/>
			</div>
		);
	}

	// If image exists, show with dropdown menu
	return (
		<div className="flex flex-col items-center gap-3">
			<DropdownMenu>
				<DropdownMenuTrigger asChild disabled={isUploading}>
					{/* biome-ignore lint/a11y/useSemanticElements: Drop zone requires div for drag events */}
					<div
						aria-label="Bild bearbeiten"
						className={cn(
							"group relative cursor-pointer rounded-full border-2 border-dashed p-2 transition-colors",
							isDragging
								? "border-primary bg-primary/10"
								: "border-border hover:border-primary/50",
							isUploading && "cursor-not-allowed opacity-50",
						)}
						onDragLeave={handleDragLeave}
						onDragOver={handleDragOver}
						onDrop={handleDrop}
						role="button"
						tabIndex={0}
					>
						<Image
							alt={userName}
							className="size-24 rounded-full object-cover"
							height={96}
							src={currentImage}
							width={96}
						/>

						{/* Loading overlay */}
						{isUploading && (
							<div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
								<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							</div>
						)}

						{/* Edit icon badge */}
						{!isUploading && (
							<div className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-background text-secondary-foreground border transition-colors group-hover:bg-accent">
								<Pencil className="size-4" />
							</div>
						)}
					</div>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="center">
					<DropdownMenuItem onClick={handleChangeImage}>
						<ImagePlus className="size-4" />
						Bild ändern
					</DropdownMenuItem>
					{onImageDelete && (
						<DropdownMenuItem
							className="text-destructive focus:text-destructive"
							onClick={onImageDelete}
						>
							<Trash2 className="size-4" />
							Bild löschen
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<p className="text-center text-xs text-muted-foreground">
				Klicken oder Bild hierher ziehen
				<br />
				JPG, PNG oder WebP (max. 5MB)
			</p>

			<input
				accept="image/jpeg,image/png,image/webp"
				className="hidden"
				disabled={isUploading}
				onChange={handleFileSelect}
				ref={fileInputRef}
				type="file"
			/>
		</div>
	);
}
