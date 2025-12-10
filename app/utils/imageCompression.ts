/**
 * Image compression utilities for profile photos and hero images
 */

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
  width: number;
  height: number;
}

/**
 * Compress and resize an image file
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels
 * @param maxSizeKB - Maximum file size in KB
 * @param quality - Initial JPEG quality (0-1)
 */
export async function compressImage(
  file: File,
  maxWidth: number,
  maxSizeKB: number,
  quality: number = 0.8
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Try to compress to target size
        const maxSizeBytes = maxSizeKB * 1024;
        let currentQuality = quality;
        let blob: Blob | null = null;

        const attemptCompression = () => {
          canvas.toBlob(
            (result) => {
              if (!result) {
                reject(new Error('Failed to create blob'));
                return;
              }

              blob = result;

              // If still too large and quality can be reduced, try again
              if (blob.size > maxSizeBytes && currentQuality > 0.1) {
                currentQuality -= 0.1;
                attemptCompression();
                return;
              }

              resolve({
                blob,
                originalSize: file.size,
                compressedSize: blob.size,
                wasCompressed: blob.size < file.size || width < img.width,
                width,
                height,
              });
            },
            'image/jpeg',
            currentQuality
          );
        };

        attemptCompression();
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress a profile photo (200x200 max, 100KB max)
 */
export async function compressProfilePhoto(file: File): Promise<CompressionResult> {
  return compressImage(file, 200, 100, 0.85);
}

/**
 * Compress a hero image (800px width max, 500KB max)
 */
export async function compressHeroImage(file: File): Promise<CompressionResult> {
  return compressImage(file, 800, 500, 0.85);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Validate image file type
 */
export function validateImageType(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported formats: JPEG, PNG, WebP, GIF`,
    };
  }

  return { valid: true };
}

/**
 * Create a data URL preview from a file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to create preview'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = () => reject(new Error('Failed to convert to base64'));
    reader.readAsDataURL(blob);
  });
}
