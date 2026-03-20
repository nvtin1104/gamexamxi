/**
 * WebSocket Status Indicator Component
 * Shows connection status in UI with icon and label
 */

import React from 'react'
import { Circle, AlertCircle, Loader2 } from 'lucide-react'
import { useWebSocketContext } from '../hooks/WebSocketProvider'

interface WebSocketStatusProps {
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function WebSocketStatus({ showLabel = true, size = 'sm' }: WebSocketStatusProps) {
  const { status, isConnected, isConnecting, hasError } = useWebSocketContext()

  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24

  return (
    <div className="flex items-center gap-2">
      {isConnecting && (
        <>
          <Loader2 size={iconSize} className="animate-spin text-yellow-500" />
          {showLabel && <span className="text-xs text-yellow-600">Connecting...</span>}
        </>
      )}

      {isConnected && (
        <>
          <Circle size={iconSize} className="fill-green-500 text-green-500" />
          {showLabel && <span className="text-xs text-green-600">Live</span>}
        </>
      )}

      {hasError && (
        <>
          <AlertCircle size={iconSize} className="text-red-500" />
          {showLabel && <span className="text-xs text-red-600">Connection Error</span>}
        </>
      )}

      {!isConnected && !isConnecting && !hasError && (
        <>
          <Circle size={iconSize} className="text-gray-400" />
          {showLabel && <span className="text-xs text-gray-500">Offline</span>}
        </>
      )}
    </div>
  )
}

/** Tooltip version */
export function WebSocketStatusTip() {
  const { status } = useWebSocketContext()

  const statusText = {
    connected: '✓ Live updates active',
    connecting: '↻ Reconnecting...',
    disconnected: '✕ Offline mode',
    error: '⚠ Connection error',
  }

  return (
    <span title={statusText[status]} className="cursor-help">
      <WebSocketStatus showLabel={false} size="sm" />
    </span>
  )
}
