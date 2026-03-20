/**
 * WebSocketProvider Context
 * Allows multiple components to share a single WebSocket connection
 * Prevents duplicate connections and manages global state
 */

import React, { createContext, useContext, ReactNode } from 'react'
import { useWebSocket, type WebSocketStatus } from './useWebSocket'

interface WebSocketContextType {
  status: WebSocketStatus
  send: (type: string, data: any) => void
  disconnect: () => void
  isConnected: boolean
  isConnecting: boolean
  hasError: boolean
  messageQueue: Array<{ id: string; type: string; data: any; timestamp: number }>
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

interface WebSocketProviderProps {
  children: ReactNode
  url: string
  queryKeys?: string[]
}

export function WebSocketProvider({ children, url, queryKeys = [] }: WebSocketProviderProps) {
  const { status, send, disconnect, messageQueue, isConnected, isConnecting, hasError } =
    useWebSocket({
      url,
      autoReconnect: true,
      maxRetries: 10,
      initialBackoff: 1000,
      maxBackoff: 30000,
      queryKeys,
    })

  const value: WebSocketContextType = {
    status,
    send,
    disconnect,
    isConnected,
    isConnecting,
    hasError,
    messageQueue,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

/** Hook to use WebSocket context in components */
export function useWebSocketContext() {
  const context = useContext(WebSocketContext)

  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }

  return context
}
