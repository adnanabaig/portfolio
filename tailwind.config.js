/** @type {import('tailwindcss').Config} */

// Colors are the Station AB-01 tokens from styles/globals.css (:root), so the
// amber and mono themes swap every utility too. The default palette is
// replaced on purpose: slate/cyan/white-alpha classes no longer exist.
const token = (name) => `var(--${name})`;

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
        colors: {
            transparent: "transparent",
            current: "currentColor",
            ink: token("ink"),
            panel: token("panel"),
            "panel-hi": token("panel-hi"),
            grid: token("grid"),
            steel: token("steel"),
            mist: token("mist"),
            paper: token("paper"),
            teal: token("teal"),
            "teal-ink": token("teal-ink"),
            "teal-deep": token("teal-deep"),
            amber: token("amber"),
            coral: token("coral"),
            leaf: token("leaf"),
            violet: token("violet"),
            sky: token("sky"),
        },
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)"],
                mono: ["var(--font-mono)"],
                pixel: ["var(--font-pixel)"],
                label: ["var(--font-label)"],
            },
        },
    },
    plugins: [],
};
