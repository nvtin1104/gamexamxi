'use client'

import * as React from 'react'
import type { UserProfile, PermissionGroup } from '@gamexamxi/shared'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

// ── Validation schema ─────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['admin', 'mod', 'user']),
  status: z.enum(['active', 'banned', 'block']),
  phone: z.string().optional(),
  avatar: z.string().url('Phải là URL hợp lệ').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

// ── Section header ────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserEditFormProps {
  profile: UserProfile
  groups: PermissionGroup[]
  onSaved?: (updated: UserProfile) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserEditForm({ profile, groups, onSaved }: UserEditFormProps) {
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  // Group assignment
  const initialGroupIds = new Set(profile.groups.map((g) => g.id))
  const [groupSelection, setGroupSelection] = React.useState<Set<string>>(initialGroupIds)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      phone: profile.phone ?? '',
      avatar: profile.avatar ?? '',
    },
  })

  const role = watch('role')
  const status = watch('status')

  function toggleGroup(id: string) {
    setGroupSelection((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function onSubmit(values: FormValues) {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      // Update user core fields (throws on API error)
      const res = await api.users.update(profile.id, {
        name: values.name,
        email: values.email,
        role: values.role,
        status: values.status,
        phone: values.phone || undefined,
        avatar: values.avatar || undefined,
      })

      // Delta group assignment — call once per changed group
      const prev = initialGroupIds
      const next = groupSelection
      const toAdd = [...next].filter((id) => !prev.has(id))
      const toRemove = [...prev].filter((id) => !next.has(id))

      await Promise.all([
        ...toAdd.map((groupId) => api.permissions.assignUser(groupId, profile.id)),
        ...toRemove.map((groupId) => api.permissions.removeUser(groupId, profile.id)),
      ])

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      if (onSaved) {
        onSaved({ ...profile, ...res.data })
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* ── Basic info ─────────────────────────────────────────── */}
      <FormSection title="Thông tin cơ bản">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên hiển thị" error={errors.name?.message}>
            <Input id="name" {...register('name')} />
          </Field>
          <Field label="Địa chỉ Email" error={errors.email?.message}>
            <Input id="email" type="email" {...register('email')} />
          </Field>
          <Field label="Điện thoại" error={errors.phone?.message}>
            <Input id="phone" placeholder="Tuỳ chọn" {...register('phone')} />
          </Field>
          <Field label="URL ảnh đại diện" error={errors.avatar?.message}>
            <Input id="avatar" placeholder="https://…" {...register('avatar')} />
          </Field>
        </div>
      </FormSection>

      <Separator />

      {/* ── Account settings ───────────────────────────────────── */}
      <FormSection title="Cài đặt tài khoản">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vai trò">
            <Select
              value={role}
              onValueChange={(v) => setValue('role', v as FormValues['role'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Quản trị viên</SelectItem>
                <SelectItem value="mod">Kiểm duyệt viên</SelectItem>
                <SelectItem value="user">Người dùng</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Trạng thái">
            <Select
              value={status}
              onValueChange={(v) => setValue('status', v as FormValues['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="banned">Bị cấm</SelectItem>
                <SelectItem value="block">Bị khóa</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </FormSection>

      {/* ── Permission groups ──────────────────────────────────── */}
      {groups.length > 0 && (
        <>
          <Separator />
          <FormSection title="Nhóm quyền hạn">
            <div className="grid gap-2 sm:grid-cols-2">
              {groups.map((g) => {
                const checked = groupSelection.has(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors ${
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors ${
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
                      <p className="text-sm font-medium leading-tight">{g.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {g.permissions.slice(0, 3).map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="font-mono text-[10px] px-1.5 py-0 h-4"
                          >
                            {p}
                          </Badge>
                        ))}
                        {g.permissions.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{g.permissions.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </FormSection>
        </>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        {saveError && (
          <p className="text-sm text-destructive">{saveError}</p>
        )}
        {saveSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">Đã lưu thay đổi thành công.</p>
        )}
        {!saveError && !saveSuccess && <span />}

        <Button type="submit" disabled={saving} className="ml-auto">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  )
}
