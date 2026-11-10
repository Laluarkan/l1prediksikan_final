'use client';

import React, { useState, useEffect } from 'react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
}

export default function SafeImage({
  src,
  alt = '',
  fallbackSrc = '/default-logo.svg',
  className = '',
  ...props
}: SafeImageProps) {
  const initialSrc = typeof src === 'string' && src.trim() ? src : fallbackSrc;
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);

  useEffect(() => {
    setImgSrc(typeof src === 'string' && src.trim() ? src : fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
      }}
      {...props}
    />
  );
}
