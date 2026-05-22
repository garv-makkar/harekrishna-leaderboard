import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: "#fff8e6",
          100: "#ffedbd",
          200: "#ffde85",
          300: "#ffc947",
          400: "#f5ad18",
          500: "#d98f08",
          600: "#b96c05",
          700: "#944f09",
          800: "#793f0d",
          900: "#67340f"
        },
        peacock: {
          50: "#eafaf8",
          100: "#ccefeb",
          200: "#9dded8",
          300: "#66c7c1",
          400: "#39aaa8",
          500: "#208e8e",
          600: "#187174",
          700: "#175a5e",
          800: "#17494d",
          900: "#163e42"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgba(67, 48, 22, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
