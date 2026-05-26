import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    environment: 'workers',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/__tests__/**',
        'src/types/**',
      ],
    },
  },
  poolOptions: {
    workers: {
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        kvNamespaces: ['CACHE', 'SESSIONS'],
        d1Databases: ['DB'],
        r2Buckets: ['STORAGE'],
        durableObjects: {
          GAME_ROOM: 'GameRoom',
          GROUP_ROOM: 'GroupRoom',
          POINTS_LEDGER: 'PointsLedger',
        },
        queues: ['points-queue', 'achievements-queue', 'notifications-queue'],
      },
    },
  },
})
