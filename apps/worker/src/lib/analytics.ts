import type { AnalyticsEngineDataset } from '@cloudflare/workers-types'

export function trackEvent(
  ae: AnalyticsEngineDataset,
  event: {
    type: string
    userId?: string
    groupId?: string
    eventId?: string
    value?: number
    metadata?: Record<string, string>
  }
) {
  try {
    ae.writeDataPoint({
      blobs: [
        event.type,
        event.userId ?? '',
        event.groupId ?? '',
        event.eventId ?? '',
        ...Object.values(event.metadata ?? {}),
      ],
      doubles: [event.value ?? 1],
      indexes: [event.type],
    })
  } catch {
    // Analytics failures should not break the request
  }
}
