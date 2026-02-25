import type { Metadata } from 'next'
import { Bebas_Neue, Space_Mono, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas',
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-space-mono',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GameXamXi — Predict. Win. Flex.',
  description: 'The ultimate prediction minigame platform. Challenge friends, make predictions, earn points.',
  keywords: ['prediction', 'minigame', 'gaming', 'challenge', 'leaderboard'],
  openGraph: {
    title: 'GameXamXi — Predict. Win. Flex.',
    description: 'The ultimate prediction minigame platform.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${spaceMono.variable} ${ibmPlexMono.variable}`}>
      <body className="font-body bg-bg text-dark">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
