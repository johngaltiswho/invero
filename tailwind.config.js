/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Finverno institutional color scheme
        primary: {
          background: 'var(--color-primary-background)',
          DEFAULT: 'var(--color-primary-background)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
        },
        accent: {
          amber: 'var(--color-accent-amber)',
          blue: 'var(--color-accent-blue)',
          // Legacy orange support
          orange: 'var(--color-accent-amber)',
        },
        neutral: {
          darker: 'var(--color-neutral-darker)',
          dark: 'var(--color-neutral-dark)',
          medium: 'var(--color-neutral-medium)',
          light: 'var(--color-neutral-light)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        // Legacy compatibility
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
    },
  },
  plugins: [],
};