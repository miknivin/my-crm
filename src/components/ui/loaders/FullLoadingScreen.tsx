'use client';

import React from 'react';

const FullLoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 dark:bg-gray-950/50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400"></div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    </div>
  );
};

export default FullLoadingScreen;