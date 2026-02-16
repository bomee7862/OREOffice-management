/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        coral: {
          50: '#fef5f4',
          100: '#fee8e5',
          200: '#fdd5cf',
          300: '#fbb8ad',
          400: '#f89283',
          500: '#f07060',
          600: '#dc5448',
          700: '#b9443a',
        },
        occupied: '#22c55e',    // 입주 - 초록색
        vacant: '#94a3b8',      // 공실 - 회색
        reserved: '#f59e0b',    // 예약 - 주황색
        maintenance: '#ef4444', // 정비중 - 빨간색
      },
      fontSize: {
        'xs':   ['0.575rem', { lineHeight: '0.765rem' }],
        'sm':   ['0.68rem',  { lineHeight: '0.955rem' }],
        'base': ['0.765rem', { lineHeight: '1.15rem' }],
        'lg':   ['0.8rem',   { lineHeight: '1.2rem' }],
        'xl':   ['0.875rem', { lineHeight: '1.25rem' }],
        '2xl':  ['1.05rem',  { lineHeight: '1.4rem' }],
        '3xl':  ['1.3rem',   { lineHeight: '1.6rem' }],
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}










