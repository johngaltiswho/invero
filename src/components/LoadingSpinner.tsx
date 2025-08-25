'use client';

import React from 'react';

interface LoadingSpinnerProps {
  title?: string;
  description?: string;
  icon?: string;
  steps?: string[];
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({ 
  title = "Loading", 
  description = "Please wait while we fetch your data", 
  icon = "📊",
  steps = [],
  fullScreen = false,
  className = ""
}: LoadingSpinnerProps) {
  const containerClass = fullScreen 
    ? "min-h-screen flex items-center justify-center" 
    : "text-center py-12";

  return (
    <div className={`${containerClass} ${className}`}>
      <div className="text-center">
        {/* Animated Loading Spinner */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-neutral-medium rounded-full"></div>
            <div className="absolute inset-0 border-4 border-accent-amber border-t-transparent rounded-full animate-spin"></div>
            <div 
              className="absolute inset-2 border-2 border-neutral-light border-r-transparent rounded-full animate-spin" 
              style={{ 
                animationDirection: 'reverse', 
                animationDuration: '1s' 
              }}
            ></div>
          </div>
          <div className="text-4xl mb-4">{icon}</div>
        </div>
        
        {/* Loading Text with Animation */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-primary mb-2">
            {title}
            <span className="inline-block animate-pulse ml-1">...</span>
          </h2>
          <p className="text-secondary text-lg max-w-md mx-auto">
            {description}
          </p>
          
          {/* Loading Steps */}
          {steps.length > 0 && (
            <div className="mt-8 space-y-3 text-sm">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center justify-center space-x-3">
                  <div 
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      index === 0 ? 'bg-accent-amber' : 
                      index === 1 ? 'bg-accent-blue' : 'bg-success'
                    }`}
                    style={{ animationDelay: `${index * 0.2}s` }}
                  ></div>
                  <span className="text-secondary">{step}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Progress Indicator */}
          <div className="mt-8 max-w-xs mx-auto">
            <div className="w-full bg-neutral-medium rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-accent-amber to-accent-blue h-1 rounded-full animate-pulse" 
                style={{ width: '60%' }}
              ></div>
            </div>
            <p className="text-xs text-secondary mt-2">Establishing secure connection...</p>
          </div>
        </div>
      </div>
    </div>
  );
}