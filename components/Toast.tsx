import React from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type }) => {

  const baseClasses = "fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-lg shadow-xl text-white font-semibold flex items-center gap-3 overflow-hidden";
  const successClasses = "bg-green-500";
  const errorClasses = "bg-red-500";
  const infoClasses = "bg-red-500"; // Red color for cancelling, as requested
  
  const icon = type === 'success' ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) : type === 'error' ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ) : (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
  );

  const typeClasses = type === 'success' ? successClasses : type === 'error' ? errorClasses : infoClasses;

  return (
    <div className={`${baseClasses} ${typeClasses} animate-slide-in-from-right`}>
      {icon}
      <span>{message}</span>
       {type === 'info' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 overflow-hidden">
          <div className="w-1/2 h-full bg-white/50 animate-indeterminate-bar"></div>
        </div>
      )}
    </div>
  );
};