/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        turmeric: {
          50: "#FFF8E7",
          100: "#FFEDBF",
          300: "#F6C445",
          500: "#E8A317",
          700: "#B87A0C",
        },
        vermillion: {
          400: "#D9482B",
          500: "#B8341E",
          600: "#8F2617",
          700: "#6E1D12",
        },
        marigold: {
          500: "#F2921D",
        },
        tamarind: {
          900: "#241505",
          800: "#3A210A",
        },
        cream: "#FBF3E3",
      },
      fontFamily: {
        display: ["'Rozha One'", "serif"],
        body: ["'Mukta'", "sans-serif"],
        mantra: ["'Tiro Devanagari Marathi'", "serif"],
      },
      backgroundImage: {
        "diya-glow":
          "radial-gradient(circle at 50% 0%, rgba(242,146,29,0.25), transparent 60%)",
      },
    },
  },
  plugins: [],
};
