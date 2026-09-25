/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Palette institutionnelle Lomé Business School ---
        navy: {
          50: '#EEF2F6',
          100: '#D6E0E9',
          400: '#3E6086',
          500: '#2C4A6E',   // bleu primaire (actions, accents principaux)
          600: '#223A57',
          700: '#1A2C42',
        },
        maroon: {
          50: '#FBEBEC',
          100: '#F1C7CA',
          500: '#7A1620',   // bordeaux (accent secondaire, alertes fortes)
          600: '#601119',
        },
        ink: {
          DEFAULT: '#0B1220', // noir-bleuté, texte à fort contraste
          700: '#141C2E',
        },
        cream: {
          DEFAULT: '#F3EFE7', // fond général de l'app
          100: '#FBF8F2',
          200: '#EFE9DD',
        },
        // Alias 'primary' conservé pour compatibilité avec les composants existants
        primary: {
          50: '#EEF2F6',
          100: '#D6E0E9',
          500: '#2C4A6E',
          600: '#223A57',
          700: '#1A2C42',
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}