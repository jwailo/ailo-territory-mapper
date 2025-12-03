'use client';

import { useState } from 'react';

interface OwnerAvatarProps {
  ownerName: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

function getOwnerImagePath(ownerName: string): string {
  return `/team-images/${ownerName}.png`;
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
  const imagePath = getOwnerImagePath(ownerName);

  if (imageError) {
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
    <img
      src={imagePath}
      alt={ownerName}
      title={ownerName}
      className="rounded-full object-cover border-2 border-white shadow-md"
      style={{
        width: config.size,
        height: config.size,
        imageRendering: 'auto',
      }}
      onError={() => setImageError(true)}
    />
  );
}
