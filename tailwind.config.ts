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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Ta palette Céramique My Mozaïca
        cream: {
          DEFAULT: '#FDF6E3', // Fond principal
          50: '#FFFEF9',
          100: '#FDF6E3', 
          200: '#F5EBCF',
        },
        slate: {
          DEFAULT: '#2C3E50', // Texte principal
          light: '#47627D',
          dark: '#1A252F',
        },
        terracotta: {
          DEFAULT: '#E76F51', // Action / Boutons
          hover: '#D65D40',
          light: '#F4A28C',
        },
        emerald: {
          DEFAULT: '#2A9D8F', // Secondaire
          light: '#4DB6A9',
          dark: '#1F7A6F',
        },
        ochre: {
          DEFAULT: '#E9C46A', // Lumière / Souvenirs
          light: '#F0D48F',
        }
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Arial', 'sans-serif'],
        serif: ['var(--font-geist-mono)', 'Georgia', 'serif'], 
      },
    },
  },
  plugins: [],
};
export default config;