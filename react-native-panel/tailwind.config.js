/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neolia brand colors
        neolia: {
          blue: '#2196F3',
          'dark-blue': '#1565C0',
          'light-blue': '#64B5F6',
          green: '#4CAF50',
          orange: '#FF9800',
          red: '#E53935',
        },
        // Dark theme
        background: '#121212',
        surface: '#1E1E1E',
        'surface-variant': '#2D2D2D',
        primary: '#2196F3',
        'on-primary': '#FFFFFF',
        'on-background': '#FFFFFF',
        'on-surface': '#FFFFFF',
        'muted-foreground': '#9CA3AF',
      },
    },
  },
  plugins: [],
};
