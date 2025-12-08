'use client';

import { useState } from 'react';

interface OwnerAvatarProps {
  ownerName: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

// Supported image extensions in order of preference
const IMAGE_EXTENSIONS = ['jpeg', 'jpg', 'png'];

function getOwnerImagePath(ownerName: string, extensionIndex: number): string | null {
  if (extensionIndex >= IMAGE_EXTENSIONS.length) return null;
  return `/team-images/${ownerName}.${IMAGE_EXTENSIONS[extensionIndex]}`;
}

function getOwnerInitials(ownerName: string): string {
  if (!ownerName) return '?';
  return ownerName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Size configurations with pixel values for high-DPI displays
const sizeConfig = {
  sm: { className: 'text-xs', size: 24 },
  md: { className: 'text-sm', size: 36 },
  lg: { className: 'text-base', size: 56 },
};

export default function OwnerAvatar({ ownerName, size = 'md' }: OwnerAvatarProps) {
  const [extensionIndex, setExtensionIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const config = sizeConfig[size];

  if (!ownerName) {
    return (
      <div
        className={`${config.className} rounded-full bg-gray-300 flex items-center justify-center font-semibold text-gray-600 border-2 border-white shadow-md`}
        style={{ width: config.size, height: config.size }}
      >
        ?
      </div>
    );
  }

  const initials = getOwnerInitials(ownerName);
  const imagePath = getOwnerImagePath(ownerName, extensionIndex);

  // All extensions tried, show initials fallback
  if (imageError || !imagePath) {
    return (
      <div
        className={`${config.className} rounded-full bg-[#EE0B4F] flex items-center justify-center font-semibold text-white border-2 border-white shadow-md`}
        style={{ width: config.size, height: config.size }}
        title={ownerName}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imagePath}
      alt={ownerName}
      title={ownerName}
      className="rounded-full object-cover border-2 border-white shadow-md"
      style={{
        width: config.size,
        height: config.size,
        minWidth: config.size,
        minHeight: config.size,
      }}
      onError={() => {
        // Try next extension
        const nextIndex = extensionIndex + 1;
        if (nextIndex < IMAGE_EXTENSIONS.length) {
          setExtensionIndex(nextIndex);
        } else {
          setImageError(true);
        }
      }}
    />
  );
}
