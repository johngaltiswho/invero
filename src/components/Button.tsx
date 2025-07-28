import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary uppercase tracking-wide text-sm';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-accent-amber to-accent-amber/80 text-white hover:from-accent-amber/90 hover:to-accent-amber/70 hover:shadow-lg hover:shadow-accent-amber/30 hover:-translate-y-0.5 focus:ring-accent-amber',
    secondary: 'bg-gradient-to-r from-accent-blue to-accent-blue/80 text-white hover:from-accent-blue/90 hover:to-accent-blue/70 hover:shadow-lg hover:shadow-accent-blue/30 hover:-translate-y-0.5 focus:ring-accent-blue',
    outline: 'border-2 border-neutral-medium text-secondary hover:border-accent-amber hover:text-accent-amber hover:bg-accent-amber/5 focus:ring-neutral-medium'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2.5',
    md: 'px-6 py-3',
    lg: 'px-8 py-4'
  };
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};