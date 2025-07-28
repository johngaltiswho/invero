declare module 'next/link' {
  import { ComponentType } from 'react';
  
  interface LinkProps {
    href: string;
    children?: React.ReactNode;
    className?: string;
    [key: string]: any;
  }
  
  const Link: ComponentType<LinkProps>;
  export default Link;
}