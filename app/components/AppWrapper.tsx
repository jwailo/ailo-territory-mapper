'use client';

import { useState, useEffect, ReactNode } from 'react';
import FullPageLoading from './FullPageLoading';

interface AppWrapperProps {
  children: ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    // Check if this is the first visit in this session
    if (typeof window !== 'undefined') {
      const hasLoaded = sessionStorage.getItem('aset-initial-load-complete');
      if (hasLoaded) {
        // Skip loading screen on subsequent page navigations
        setShowLoading(false);
        setIsInitialLoad(false);
      }
    }
  }, []);

  const handleLoadingComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('aset-initial-load-complete', 'true');
    }
    setShowLoading(false);
    setIsInitialLoad(false);
  };

  return (
    <>
      {showLoading && isInitialLoad && (
        <FullPageLoading onLoadingComplete={handleLoadingComplete} minDisplayTime={2500} />
      )}
      {children}
    </>
  );
}
