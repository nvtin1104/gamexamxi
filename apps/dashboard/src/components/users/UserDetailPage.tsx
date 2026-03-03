'use client'

import * as React from 'react'
import type { UserProfile, PermissionGroup } from '@gamexamxi/shared'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { UserDetailCard } from './UserDetailCard'
import { UserEditForm } from './UserEditForm'
import { api } from '@/lib/api'

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* left column */}
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <Separator />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-3 pb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* right column */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Error state ───────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-muted-foreground text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserDetailPageProps {
  userId: string
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function UserDetailPage({ userId }: UserDetailPageProps) {
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const [groups, setGroups] = React.useState<PermissionGroup[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, groupsRes] = await Promise.all([
        api.users.getProfile(userId),
        api.permissions.listGroups(),
      ])
      // request() throws on non-ok responses; data is always present here
      setProfile(profileRes.data)
      setGroups(groupsRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [userId])

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb / back bar ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <a href="/users" className="flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Users
          </a>
        </Button>
        {profile && (
          <p className="text-sm text-muted-foreground hidden sm:block truncate max-w-xs">
            {profile.email}
          </p>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {loading ? (
        <DetailSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : profile ? (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left: read-only profile card */}
          <div>
            <UserDetailCard profile={profile} />
          </div>

          {/* Right: edit form */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <UserEditForm
                profile={profile}
                groups={groups}
                onSaved={(updated) => setProfile(updated)}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
