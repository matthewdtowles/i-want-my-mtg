/** @type {import('tailwindcss').Config} */
module.exports = {
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
                aqua: {
                    600: '#268894',
                    500: '#2aa7b0',
                    400: '#46c4ca',
                    300: '#83dde0',
                    200: '#b4eced',
                    100: '#d7f6f6',
                    50: '#effcfc',
                },
                blue: {
                    900: '#392682',
                    800: '#4627ac',
                    700: '#562dd5',
                    600: '#633af1',
                    500: '#7158fc',
                    400: '#8278ff',
                    300: '#9e9fff',
                    200: '#c3c5ff',
                    100: '#dee0ff',
                    50: '#edeeff',
                },
                purple: {
                    900: '#532b64',
                    800: '#612f79',
                    700: '#7a3a9a',
                    600: '#8c46b3',
                    500: '#a866cf',
                    400: '#c291e1',
                    300: '#d9baed',
                    200: '#e9d9f5',
                    100: '#f4ecfb',
                    50: '#faf6fd',
                },
                teal: {
                    900: '#1a4747',
                    800: '#1a5455',
                    700: '#1a6b6a',
                    600: '#1c8584',
                    500: '#28ada8',
                    400: '#40c1ba',
                    300: '#6edad1',
                    200: '#a3ece3',
                    100: '#d1f6f1',
                    50: '#f1fcfa',
                },
                white: '#ffffff',
            },
        },
        variants: {
            extend: {
                borderRadius: ['responsive'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
        require('@tailwindcss/aspect-ratio'),
    ],
}