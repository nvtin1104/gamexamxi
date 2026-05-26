/**
 * useWebSocket Hook
 * Manages WebSocket connection with auto-reconnect, offline queue, and event handling
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type WebSocketMessage = {
  type: string
  data: any
  timestamp: string
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  url: string
  onMessage?: (message: WebSocketMessage) => void
  onStatusChange?: (status: WebSocketStatus) => void
  autoReconnect?: boolean
  maxRetries?: number
  initialBackoff?: number // milliseconds
  maxBackoff?: number // milliseconds
  queryKeys?: string[] // TanStack Query keys to invalidate on reconnect
}

interface OfflineMessage {
  id: string
  type: string
  data: any
  timestamp: number
}

export function useWebSocket({
  url,
  onMessage,
  onStatusChange,
  autoReconnect = true,
  maxRetries = 10,
  initialBackoff = 1000,
  maxBackoff = 30000,
  queryKeys = [],
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  const retryCount = useRef(0)
  const backoffDelay = useRef(initialBackoff)

  const [status, setStatus] = useState<WebSocketStatus>('disconnected')
  const [messageQueue, setMessageQueue] = useState<OfflineMessage[]>([])
  const queryClient = useQueryClient()

  // Update status and call callback
  const updateStatus = useCallback(
    (newStatus: WebSocketStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
      console.log(`[WebSocket] Status: ${newStatus}`)
    },
    [onStatusChange]
  )

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected')
      return
    }

    updateStatus('connecting')

    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected')
        updateStatus('connected')
        retryCount.current = 0
        backoffDelay.current = initialBackoff

        // Send queued messages
        flushQueue()

        // Invalidate cached queries to refresh data
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] })
        })
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log(`[WebSocket] Received: ${message.type}`)
          onMessage?.(message)

          // Optionally invalidate queries based on message type
          if (message.type.includes('update') || message.type.includes('changed')) {
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: [key] })
            })
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
        }
      }

      ws.current.onerror = (event) => {
        console.error('[WebSocket] Error:', event)
        updateStatus('error')
      }

      ws.current.onclose = () => {
        console.log('[WebSocket] Disconnected')
        updateStatus('disconnected')

        // Attempt reconnect
        if (autoReconnect && retryCount.current < maxRetries) {
          retryCount.current++
          const delay = Math.min(
            backoffDelay.current * Math.pow(1.5, retryCount.current - 1),
            maxBackoff
          )

          console.log(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${retryCount.current}/${maxRetries})`
          )

          reconnectTimer.current = setTimeout(() => {
            connect()
          }, delay)
        } else if (retryCount.current >= maxRetries) {
          console.error('[WebSocket] Max retries reached')
          updateStatus('error')
        }
      }
    } catch (error) {
      console.error('[WebSocket] Connection error:', error)
      updateStatus('error')
    }
  }, [url, onMessage, updateStatus, autoReconnect, maxRetries, initialBackoff, maxBackoff, queryKeys, queryClient])

  // Send message or queue if offline
  const send = useCallback(
    (type: string, data: any) => {
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
      }

      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(message))
        console.log(`[WebSocket] Sent: ${type}`)
      } else {
        // Queue message for offline
        const offlineMsg: OfflineMessage = {
          id: `${Date.now()}-${Math.random()}`,
          type,
          data,
          timestamp: Date.now(),
        }

        setMessageQueue((prev) => [...prev, offlineMsg])
        console.log(`[WebSocket] Queued (offline): ${type}`)
      }
    },
    []
  )

  // Flush queued messages
  const flushQueue = useCallback(() => {
    if (messageQueue.length === 0) return

    messageQueue.forEach(({ type, data }) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }))
        console.log(`[WebSocket] Flushed queued: ${type}`)
      }
    })

    setMessageQueue([])
  }, [messageQueue])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }

    if (ws.current) {
      ws.current.close()
      ws.current = null
    }

    updateStatus('disconnected')
    console.log('[WebSocket] Disconnected by user')
  }, [updateStatus])

  // Auto-connect on mount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    status,
    send,
    disconnect,
    messageQueue,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    hasError: status === 'error',
  }
}
