/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './src/**/*.{html,ts,js,hbs}',
        './views/**/*.{hbs,html}',
        './node_modules/@tailwindcss/**/*.js',
    ],
    theme: {
        extend: {
            borderRadius: {
                'card-lg': '2.0rem',
                'card-md': '1.5rem',
                'card-sm': '0.66rem',
            },
            colors: {
                midnight: {
                    950: '#0d0b1a',
                    900: '#131025',
                    800: '#1a1533',
                    700: '#241e45',
                    600: '#2e2758',
                },
                teal: {
                    900: '#0f4f4f',
                    800: '#146060',
                    700: '#1a7a78',
                    600: '#20998f',
                    500: '#2cc8ca',
                    400: '#45ddd6',
                    300: '#72ece5',
                    200: '#a8f4ef',
                    100: '#d4faf7',
                    50: '#f0fdfb',
                },
                purple: {
                    950: '#2d1540',
                    900: '#4a2068',
                    800: '#5c2883',
                    700: '#7233a4',
                    600: '#8b42c6',
                    500: '#a95de0',
                    400: '#c48aed',
                    300: '#dbb5f5',
                    200: '#ead4f9',
                    100: '#f5ecfd',
                    50: '#faf6fe',
                },
                hotpink: {
                    700: '#c4175c',
                    600: '#e0206a',
                    500: '#f43f82',
                    400: '#f76ea3',
                    300: '#fa9ec4',
                    200: '#fcc8de',
                    100: '#fee4ef',
                    50: '#fff1f7',
                },
                white: '#ffffff',
            },
            boxShadow: {
                'glow-teal': '0 0 15px 2px rgba(44, 200, 202, 0.4)',
                'glow-purple': '0 0 15px 2px rgba(169, 93, 224, 0.4)',
                'glow-pink': '0 0 15px 2px rgba(244, 63, 130, 0.4)',
            },
            fontFamily: {
                display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                body: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
        require('@tailwindcss/aspect-ratio'),
    ],
}
