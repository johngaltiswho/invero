import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  const inputClasses = `
    w-full px-4 py-3 rounded-lg border bg-neutral-dark text-primary placeholder-text-secondary
    focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent
    transition-all duration-200
    ${error ? 'border-warning' : 'border-neutral-medium hover:border-neutral-dark'}
    ${className}
  `;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-primary mb-2">
          {label}
        </label>
      )}
      <input
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-warning">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-secondary">
          {helperText}
        </p>
      )}
    </div>
  );
};