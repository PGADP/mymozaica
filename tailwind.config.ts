import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs de fond
        'bg-main': '#FDF6E3',
        'bg-card': '#FFFFFF',

        // Couleurs de texte
        'text-main': '#2C3E50',
        'text-muted': '#47627D',

        // Bordures
        'border-ui': '#E5E7EB',

        // Couleurs d'accent - My Mozaica
        primary: {
          DEFAULT: '#E76F51',
          hover: '#D65D40',
          light: '#F4A28C',
        },
        secondary: {
          DEFAULT: '#2A9D8F',
          hover: '#1F7A6F',
          light: '#4DB6A9',
        },
        accent: {
          DEFAULT: '#E9C46A',
          light: '#F0D48F',
        },

        // Anciennes couleurs (rétrocompatibilité)
        cream: {
          DEFAULT: '#FDF6E3',
          50: '#FFFEF9',
          100: '#FDF6E3',
          200: '#F5EBCF',
        },
        slate: {
          DEFAULT: '#2C3E50',
          light: '#47627D',
          dark: '#1A252F',
        },
        terracotta: {
          DEFAULT: '#E76F51',
          hover: '#D65D40',
          light: '#F4A28C',
        },
        emerald: {
          DEFAULT: '#2A9D8F',
          light: '#4DB6A9',
          dark: '#1F7A6F',
        },
        ochre: {
          DEFAULT: '#E9C46A',
          light: '#F0D48F',
        }
      },
      fontFamily: {
        // Les variables CSS sont générées par next/font dans layout.tsx
        heading: ['var(--font-heading)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        ui: ['var(--font-body)', 'sans-serif'],
        // Anciennes définitions (rétrocompatibilité)
        sans: ['var(--font-body)', 'sans-serif'],
        serif: ['var(--font-heading)', 'serif'],
      },
      borderRadius: {
        'card': '1rem',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'glow': '0 4px 20px rgba(231, 111, 81, 0.3)',
      }
    },
  },
  plugins: [],
};
export default config;
