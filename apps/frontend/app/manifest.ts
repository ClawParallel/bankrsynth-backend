import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SynthVirtual — AI Intelligence Terminal for Base',
    short_name: 'SynthVirtual',
    description:
      'SynthVirtual is an AI-native intelligence terminal for Base. AI synthesis, ' +
      'real-trading Arena, market intelligence, and autonomous agents. ' +
      'Powered by $SYNTH on Virtuals Protocol.',
    start_url: '/',
    display: 'standalone',
    background_color: '#010502',
    theme_color: '#00ff41',
    icons: [
      { src: '/icon', sizes: '64x64', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
