"use client";

export type ClientImageOptimisationResult = {
  file: File;
  changed: boolean;
  originalBytes: number;
  optimisedBytes: number;
  message?: string;
};

const MAX_DIMENSION = 1920;
const JPEG_WEBP_QUALITY = 0.82;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image for optimisation."));
    };
    img.src = url;
  });
}

export async function optimiseClientImageFile(file: File): Promise<ClientImageOptimisationResult> {
  const originalBytes = file.size;
  const type = file.type.split(";")[0]?.toLowerCase() ?? "";
  if (type !== "image/jpeg" && type !== "image/jpg" && type !== "image/webp") {
    return { file, changed: false, originalBytes, optimisedBytes: originalBytes };
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  if (scale >= 1 && originalBytes < 1.5 * 1024 * 1024) {
    return { file, changed: false, originalBytes, optimisedBytes: originalBytes };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { file, changed: false, originalBytes, optimisedBytes: originalBytes };
  ctx.drawImage(img, 0, 0, width, height);

  const outputType = type === "image/webp" ? "image/webp" : "image/jpeg";
  const blob = await canvasBlob(canvas, outputType, JPEG_WEBP_QUALITY);
  if (!blob || blob.size >= originalBytes) {
    return { file, changed: false, originalBytes, optimisedBytes: originalBytes };
  }

  const ext = outputType === "image/webp" ? ".webp" : ".jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const optimised = new File([blob], `${baseName}-optimised${ext}`, {
    type: outputType,
    lastModified: Date.now(),
  });
  return {
    file: optimised,
    changed: true,
    originalBytes,
    optimisedBytes: optimised.size,
    message: `Optimised from ${formatBytes(originalBytes)} to ${formatBytes(optimised.size)}.`,
  };
}
