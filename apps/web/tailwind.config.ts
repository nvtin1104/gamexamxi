import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF3B00',
        secondary: '#FFE500',
        accent: '#00FF88',
        bg: '#F5F0E8',
        surface: '#FFFFFF',
        dark: '#0A0A0A',
        muted: '#8A8A8A',
        // Group themes
        friends: '#FF3B00',
        couple: '#FF6B9D',
        family: '#4A90D9',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
        body: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      fontSize: {
        'display-xl': ['5rem', { lineHeight: '1', letterSpacing: '0.02em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.05', letterSpacing: '0.02em' }],
        'display-md': ['2.5rem', { lineHeight: '1.1', letterSpacing: '0.02em' }],
      },
      borderWidth: {
        brutal: '3px',
        'brutal-lg': '4px',
      },
      boxShadow: {
        brutal: '4px 4px 0px #0A0A0A',
        'brutal-lg': '8px 8px 0px #0A0A0A',
        'brutal-hover': '6px 6px 0px #0A0A0A',
        'brutal-active': '0px 0px 0px #0A0A0A',
        'brutal-primary': '4px 4px 0px #FF3B00',
        'brutal-secondary': '4px 4px 0px #FFE500',
        'brutal-accent': '4px 4px 0px #00FF88',
      },
      borderRadius: {
        none: '0px',
      },
      animation: {
        'pulse-brutal': 'pulse-brutal 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slide-in 0.3s ease-out',
        'marquee': 'marquee 20s linear infinite',
      },
      keyframes: {
        'pulse-brutal': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-in': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
