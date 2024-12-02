/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{html,ts,js,hbs}',
        './views/**/*.{hbs,html}',
        './node_modules/@tailwindcss/**/*.js',
    ],
    theme: {
        extend: {
            colors: {
                teal: {
                    500: '#009d9a',
                    300: '#8de1e0',
                },
                purple: {
                    600: '#9a009d',
                    300: '#e08de1',
                },
                white: '#ffffff',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
        require('@tailwindcss/aspect-ratio'),
    ],
}