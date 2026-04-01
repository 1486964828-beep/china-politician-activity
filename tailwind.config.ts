import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#11253a",
        mist: "#f4f6ef",
        line: "#d3ddd0",
        pine: "#194533",
        ochre: "#bf7f2f",
        clay: "#f5ede0"
      },
      boxShadow: {
        soft: "0 12px 28px rgba(17, 37, 58, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
