'use client'

import * as React from 'react'
import type { User, PermissionGroup } from '@gamexamxi/shared'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'mod', 'user']),
  status: z.enum(['active', 'banned', 'block']),
  phone: z.string().optional(),
  avatar: z.string().url('Must be a URL').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserEditSheetProps {
  user: User | null
  open: boolean
  groups: PermissionGroup[]
  assignedGroupIds: string[]
  onClose: () => void
  onSave: (id: string, updates: Partial<User>) => Promise<void>
  onAssignGroups: (userId: string, add: string[], remove: string[]) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserEditSheet({
  user,
  open,
  groups,
  assignedGroupIds,
  onClose,
  onSave,
  onAssignGroups,
}: UserEditSheetProps) {
  const [saving, setSaving] = React.useState(false)
  const [groupSelection, setGroupSelection] = React.useState<Set<string>>(
    new Set(assignedGroupIds)
  )

  // Sync group selection when user or assignedGroupIds change
  React.useEffect(() => {
    setGroupSelection(new Set(assignedGroupIds))
  }, [assignedGroupIds, user?.id])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        phone: user.phone ?? '',
        avatar: user.avatar ?? '',
      })
    }
  }, [user, reset])

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSaving(true)
    try {
      await onSave(user.id, values)

      // Delta group assignment
      const prev = new Set(assignedGroupIds)
      const next = groupSelection
      const add = [...next].filter((id) => !prev.has(id))
      const remove = [...prev].filter((id) => !next.has(id))
      if (add.length || remove.length) {
        await onAssignGroups(user.id, add, remove)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function toggleGroup(id: string) {
    setGroupSelection((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const role = watch('role')
  const status = watch('status')

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription className="text-xs">
            {user?.email}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setValue('role', v as FormValues['role'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="mod">Mod</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setValue('status', v as FormValues['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="block">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" placeholder="Optional" {...register('phone')} />
          </div>

          {/* Avatar */}
          <div className="space-y-1.5">
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input id="avatar" placeholder="https://…" {...register('avatar')} />
            {errors.avatar && (
              <p className="text-xs text-destructive">{errors.avatar.message}</p>
            )}
          </div>

          {/* Permission Groups */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <Label>Permission Groups</Label>
              <div className="grid gap-2">
                {groups.map((g) => {
                  const checked = groupSelection.has(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGroup(g.id)}
                      className={`flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors ${
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                          checked ? 'bg-primary border-primary' : 'border-input'
                        } flex items-center justify-center`}
                      >
                        {checked && (
                          <svg viewBox="0 0 12 12" className="h-3 w-3 fill-primary-foreground">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{g.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {g.permissions.slice(0, 4).map((p) => (
                            <Badge key={p} variant="secondary" className="font-mono text-[10px] px-1 py-0">
                              {p}
                            </Badge>
                          ))}
                          {g.permissions.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{g.permissions.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
