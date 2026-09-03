import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark fintech palette
        background: {
          primary: "#15191f",
          secondary: "#1c2229",
          tertiary: "#20262e",
          card: "#202832",
          hover: "#1c2229",
        },
        border: {
          default: "#2d333b",
          light: "#39434f",
        },
        text: {
          primary: "#ffffff",
          secondary: "#dbe4ee",
          tertiary: "#9ba7b5",
        },
        accent: {
          blue: "#4da3ff",
          approve: "#36d17c",
          verify: "#e8b84b",
          block: "#ff6262",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Arial", "sans-serif"],
        mono: ['"Fira Code"', "monospace"],
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["13px", "18px"],
        base: ["14px", "20px"],
        lg: ["15px", "22px"],
        xl: ["16px", "24px"],
        "2xl": ["19px", "28px"],
        "3xl": ["23px", "32px"],
        "4xl": ["28px", "36px"],
      },
      spacing: {
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "40px",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.3)",
        elevated: "0 8px 24px rgba(0, 0, 0, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
