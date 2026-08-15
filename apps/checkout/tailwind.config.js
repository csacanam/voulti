/** @type {import('tailwindcss').Config} */

// Voulti green. Step 500 is the logo exactly (#288E5B); the ladder around it
// borrows Tailwind's violet lightness steps, so the palette this replaced maps
// across one-for-one and nothing changed weight.
//
// Use 600 for anything interactive — it clears 4.5:1 on white, the logo green
// does not (4.11:1). See assets/brand/README.md.
const brand = {
  50: '#E4EEE7',
  100: '#D4E9DB',
  200: '#B7DEC5',
  300: '#8DC8A3',
  400: '#5AAC7D',
  500: '#288E5B',
  600: '#017B49',
  700: '#026A3E',
  800: '#015732',
  900: '#004728',
  950: '#002B16',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { brand },
    },
  },
  plugins: [],
};
