import { useForm } from '@tanstack/react-form'
import { createUserSchema, updateUserSchema } from '@gamexamxi/shared'
import type { CreateUserFormData, UpdateUserFormData } from '@gamexamxi/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoaderCircleIcon } from 'lucide-react'

interface CreateModeProps {
  mode: 'create'
  defaultValues?: Partial<CreateUserFormData>
  onSubmit: (data: CreateUserFormData) => Promise<void>
  isLoading?: boolean
}

interface EditModeProps {
  mode: 'edit'
  defaultValues?: Partial<UpdateUserFormData>
  onSubmit: (data: UpdateUserFormData) => Promise<void>
  isLoading?: boolean
}

type UserFormProps = CreateModeProps | EditModeProps

export function UserForm({ mode, defaultValues, onSubmit, isLoading }: UserFormProps) {
  const isCreate = mode === 'create'

  const form = useForm({
    defaultValues: isCreate
      ? ({
          email: (defaultValues as Partial<CreateUserFormData>)?.email ?? '',
          name: (defaultValues as Partial<CreateUserFormData>)?.name ?? '',
          password: '',
          accountRole: (defaultValues as Partial<CreateUserFormData>)?.accountRole ?? 'user',
          role: (defaultValues as Partial<CreateUserFormData>)?.role ?? 'user',
        } as CreateUserFormData)
      : ({
          name: (defaultValues as Partial<UpdateUserFormData>)?.name ?? '',
          email: (defaultValues as Partial<UpdateUserFormData>)?.email ?? '',
          accountRole: (defaultValues as Partial<UpdateUserFormData>)?.accountRole ?? 'user',
          role: (defaultValues as Partial<UpdateUserFormData>)?.role ?? 'user',
          status: (defaultValues as Partial<UpdateUserFormData>)?.status ?? 'active',
          avatar: (defaultValues as Partial<UpdateUserFormData>)?.avatar ?? '',
          phone: (defaultValues as Partial<UpdateUserFormData>)?.phone ?? '',
          address: (defaultValues as Partial<UpdateUserFormData>)?.address ?? '',
          birthdate: (defaultValues as Partial<UpdateUserFormData>)?.birthdate ?? '',
          banReason: (defaultValues as Partial<UpdateUserFormData>)?.banReason ?? '',
          blockReason: (defaultValues as Partial<UpdateUserFormData>)?.blockReason ?? '',
          blockExpiresAt: (defaultValues as Partial<UpdateUserFormData>)?.blockExpiresAt ?? '',
        } as UpdateUserFormData),
    onSubmit: async ({ value }) => {
      if (isCreate) {
        await (onSubmit as CreateModeProps['onSubmit'])(value as CreateUserFormData)
      } else {
        const payload = Object.fromEntries(
          Object.entries(value).filter(([, v]) => v !== '' && v !== undefined),
        ) as UpdateUserFormData
        await (onSubmit as EditModeProps['onSubmit'])(payload)
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="flex flex-col gap-5"
    >
      {/* Email */}
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            const result = isCreate
              ? createUserSchema.shape.email.safeParse(value)
              : updateUserSchema.shape.email.safeParse(value)
            if (!result.success) return result.error.issues[0]?.message
            return undefined
          },
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>
              Email {isCreate && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="email"
              placeholder="email@example.com"
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      {/* Name */}
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            const result = isCreate
              ? createUserSchema.shape.name.safeParse(value)
              : updateUserSchema.shape.name.safeParse(value)
            if (!result.success) return result.error.issues[0]?.message
            return undefined
          },
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>
              Tên hiển thị {isCreate && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="text"
              placeholder="Nguyễn Văn A"
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      {/* Password (create mode only) */}
      {isCreate && (
        <form.Field
          name="password"
          validators={{
            onBlur: ({ value }) => {
              const result = createUserSchema.shape.password.safeParse(value)
              if (!result.success) return result.error.issues[0]?.message
              return undefined
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>
                Mật khẩu <span className="text-destructive">*</span>
              </Label>
              <Input
                id={field.name}
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        </form.Field>
      )}

      {/* Account Role */}
      <form.Field name="accountRole">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Quyền tài khoản</Label>
            <Select
              value={(field.state.value as string) ?? 'user'}
              onValueChange={(val) => field.handleChange(val as 'admin' | 'user')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn quyền tài khoản" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Người dùng</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      {/* Community Role */}
      <form.Field name="role">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label>Vai trò cộng đồng</Label>
            <Select
              value={(field.state.value as string) ?? 'user'}
              onValueChange={(val) => field.handleChange(val as 'root' | 'staff' | 'kol' | 'mod' | 'user')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Người dùng</SelectItem>
                <SelectItem value="mod">Mod</SelectItem>
                <SelectItem value="kol">KOL</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="root">Root</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      {/* Status (edit mode only) */}
      {!isCreate && (
        <form.Field name="status">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label>Trạng thái</Label>
              <Select
                value={(field.state.value as string) ?? 'active'}
                onValueChange={(val) => field.handleChange(val as 'active' | 'banned' | 'block')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="banned">Bị cấm</SelectItem>
                  <SelectItem value="block">Bị khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      )}

      {/* Avatar URL (edit mode only) */}
      {!isCreate && (
        <form.Field
          name="avatar"
          validators={{
            onBlur: ({ value }) => {
              if (!value) return undefined
              const result = updateUserSchema.shape.avatar.safeParse(value)
              if (!result.success) return result.error.issues[0]?.message
              return undefined
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>URL Avatar</Label>
              <Input
                id={field.name}
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        </form.Field>
      )}

      {/* Phone (edit mode only) */}
      {!isCreate && (
        <form.Field name="phone">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Số điện thoại</Label>
              <Input
                id={field.name}
                type="tel"
                placeholder="0901234567"
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      )}

      {/* Address (edit mode only) */}
      {!isCreate && (
        <form.Field name="address">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Địa chỉ</Label>
              <Input
                id={field.name}
                type="text"
                placeholder="123 Đường ABC, TP.HCM"
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      )}

      {/* Birthdate (edit mode only) */}
      {!isCreate && (
        <form.Field name="birthdate">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Ngày sinh</Label>
              <Input
                id={field.name}
                type="date"
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      )}

      {/* Ban Reason (edit mode, banned status) */}
      {!isCreate && (
        <form.Field name="banReason">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Lý do cấm tài khoản</Label>
              <Textarea
                id={field.name}
                placeholder="Nhập lý do cấm..."
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={3}
              />
            </div>
          )}
        </form.Field>
      )}

      {/* Block Reason (edit mode) */}
      {!isCreate && (
        <form.Field name="blockReason">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Lý do khóa tài khoản</Label>
              <Textarea
                id={field.name}
                placeholder="Nhập lý do khóa..."
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={3}
              />
            </div>
          )}
        </form.Field>
      )}

      {/* Block Expires At (edit mode) */}
      {!isCreate && (
        <form.Field name="blockExpiresAt">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Khóa đến ngày</Label>
              <Input
                id={field.name}
                type="datetime-local"
                value={field.state.value as string}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) && (
                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
              )}
              {isCreate ? 'Tạo người dùng' : 'Lưu thay đổi'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
