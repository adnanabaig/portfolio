const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        screens: {
            mob: "375px",
            tablet: "768px",
            laptop: "1024px",
            desktop: "1280px",
            laptopl: "1440px",
        },
        // Full width below tablet (no 375px cap on phones), then stepped widths.
        container: {
            center: true,
            padding: { DEFAULT: "1.25rem", laptop: "2rem" },
            screens: { tablet: "768px", laptop: "1024px", desktop: "1280px" },
        },
        extend: {
            fontFamily: {
                sans: ['"IBM Plex Sans"', ...defaultTheme.fontFamily.sans],
                mono: ['"IBM Plex Mono"', ...defaultTheme.fontFamily.mono],
            },
        },
    },
    plugins: [],
};
