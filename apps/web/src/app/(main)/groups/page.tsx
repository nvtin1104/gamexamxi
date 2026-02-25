'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { groupsApi } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getGroupTheme } from '@/lib/utils'
import Link from 'next/link'
import type { Group } from '@gamexamxi/shared'

export default function GroupsPage() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [showJoin, setShowJoin] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joinError, setJoinError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.list(token!),
    enabled: !!token,
  })

  const joinMutation = useMutation({
    mutationFn: () => groupsApi.join(inviteCode, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      setShowJoin(false)
      setInviteCode('')
      setJoinError('')
    },
    onError: (err: Error) => {
      setJoinError(err.message)
    },
  })

  const groups = (data?.data ?? []) as Group[]
  const styleColors: Record<string, string> = {
    FRIENDS: 'bg-friends',
    COUPLE: 'bg-couple',
    FAMILY: 'bg-family',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-lg text-dark">GROUPS</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowJoin(!showJoin)}>
            JOIN
          </Button>
          <Link href="/groups/create">
            <Button variant="primary">+ CREATE</Button>
          </Link>
        </div>
      </div>

      {/* Join by invite code */}
      {showJoin && (
        <div className="card-brutal bg-secondary p-5">
          <h3 className="font-mono font-bold text-sm mb-3 uppercase">Enter Invite Code</h3>
          <div className="flex gap-2">
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              maxLength={8}
              className="flex-1 uppercase font-bold tracking-widest"
              error={joinError}
            />
            <Button
              variant="primary"
              onClick={() => joinMutation.mutate()}
              loading={joinMutation.isPending}
            >
              JOIN
            </Button>
          </div>
        </div>
      )}

      {/* Groups List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-brutal bg-surface p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card-brutal bg-surface p-12 text-center">
          <p className="font-display text-display-md text-muted">NO GROUPS YET</p>
          <p className="font-mono text-sm text-muted mt-2">Create one or join with an invite code</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card hoverable className="bg-surface overflow-hidden">
                {/* Group color strip */}
                <div className={`h-2 -mx-5 -mt-5 mb-4 ${styleColors[group.style] ?? 'bg-muted'}`} />
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="dark" className="text-xs mb-2">{group.style}</Badge>
                    <h3 className="font-mono font-bold text-dark">{group.name}</h3>
                    {group.description && (
                      <p className="font-mono text-xs text-muted mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-dark/10 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted uppercase tracking-wider">
                    Code: <span className="font-bold text-dark">{group.inviteCode}</span>
                  </span>
                  {group.isPrivate && (
                    <Badge variant="dark" className="text-[10px]">PRIVATE</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
