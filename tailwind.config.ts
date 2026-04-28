import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        plum: {
          50: "#f7f3ff",
          100: "#eee3ff",
          500: "#7c3aed",
          600: "#6d28d9",
          900: "#2e1065"
        }
      },
      boxShadow: {
        glow: "0 24px 80px rgba(124, 58, 237, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
