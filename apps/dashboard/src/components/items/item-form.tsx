import { useForm } from '@tanstack/react-form'
import { createItemSchema } from '@gamexamxi/shared'
import type { CreateItemFormData, UpdateItemFormData, LinkSocialInput } from '@gamexamxi/shared'
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
  defaultValues?: Partial<CreateItemFormData>
  onSubmit: (data: CreateItemFormData) => Promise<void>
  isLoading?: boolean
}

interface EditModeProps {
  mode: 'edit'
  defaultValues?: Partial<UpdateItemFormData>
  onSubmit: (data: UpdateItemFormData) => Promise<void>
  isLoading?: boolean
}

type ItemFormProps = CreateModeProps | EditModeProps

const defaultLinkSocial: LinkSocialInput = {
  type: 'twitter',
  url: '',
  handle: '',
  isPublic: true,
}

export function ItemForm({ mode, defaultValues, onSubmit, isLoading }: ItemFormProps) {
  const isCreate = mode === 'create'

  const form = useForm({
    defaultValues: isCreate
      ? {
          name: defaultValues?.name ?? '',
          logo: defaultValues?.logo ?? '',
          description: defaultValues?.description ?? '',
          linkSocial: defaultValues?.linkSocial ?? defaultLinkSocial,
          level: defaultValues?.level ?? 0,
          parentId: defaultValues?.parentId ?? null,
          type: defaultValues?.type ?? 'player',
        }
      : {
          name: defaultValues?.name ?? '',
          logo: defaultValues?.logo ?? '',
          description: defaultValues?.description ?? '',
          linkSocial: defaultValues?.linkSocial ?? defaultLinkSocial,
          level: defaultValues?.level ?? 0,
          parentId: defaultValues?.parentId ?? null,
        },
    onSubmit: async ({ value }) => {
      await onSubmit(value as CreateItemFormData)
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
      <form.Field
        name="name"
        validators={{
          onBlur: ({ value }) => {
            if (isCreate) {
              const result = createItemSchema.shape.name.safeParse(value)
              if (!result.success) return result.error.issues[0]?.message
            }
            return undefined
          },
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>
              Tên {isCreate && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="text"
              placeholder="Faker, T1, Worlds 2024..."
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

      {isCreate && (
        <form.Field
          name="type"
          validators={{
            onBlur: ({ value }) => {
              const result = createItemSchema.shape.type.safeParse(value)
              if (!result.success) return result.error.issues[0]?.message
              return undefined
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>
                Loại <span className="text-destructive">*</span>
              </Label>
              <Select
                value={field.state.value as string}
                onValueChange={(val) => field.handleChange(val as 'player' | 'team' | 'tournament')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="tournament">Tournament</SelectItem>
                </SelectContent>
              </Select>
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        </form.Field>
      )}

      <form.Field
        name="logo"
        validators={{
          onBlur: ({ value }) => {
            if (isCreate) {
              const result = createItemSchema.shape.logo.safeParse(value)
              if (!result.success) return result.error.issues[0]?.message
            }
            return undefined
          },
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>
              Logo URL {isCreate && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="url"
              placeholder="https://example.com/logo.jpg"
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

      <form.Field
        name="description"
        validators={{
          onBlur: ({ value }) => {
            if (isCreate) {
              const result = createItemSchema.shape.description.safeParse(value)
              if (!result.success) return result.error.issues[0]?.message
            }
            return undefined
          },
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>
              Mô tả {isCreate && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder="Mô tả về player/team/tournament..."
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={4}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="level">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Level</Label>
            <Input
              id={field.name}
              type="number"
              min={0}
              max={100}
              value={field.state.value as number}
              onChange={(e) => field.handleChange(parseInt(e.target.value) || 0)}
            />
          </div>
        )}
      </form.Field>

      <div className="rounded-md border p-4">
        <h3 className="mb-4 text-sm font-medium">Liên kết mạng xã hội</h3>

        <form.Field
          name="linkSocial"
          validators={{
            onBlur: ({ value }) => {
              if (isCreate && value) {
                const result = createItemSchema.shape.linkSocial.safeParse(value)
                if (!result.success) return result.error.issues[0]?.message
              }
              return undefined
            },
          }}
        >
          {(field) => {
            const social = field.state.value as LinkSocialInput
            return (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Mạng xã hội</Label>
                  <Select
                    value={social?.type ?? 'twitter'}
                    onValueChange={(val) =>
                      field.handleChange({ ...social, type: val as LinkSocialInput['type'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn mạng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>URL</Label>
                  <Input
                    type="url"
                    placeholder="https://twitter.com/..."
                    value={social?.url ?? ''}
                    onChange={(e) =>
                      field.handleChange({ ...social, url: e.target.value })
                    }
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Handle</Label>
                  <Input
                    type="text"
                    placeholder="@handle"
                    value={social?.handle ?? ''}
                    onChange={(e) =>
                      field.handleChange({ ...social, handle: e.target.value })
                    }
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={social?.isPublic ?? false}
                    onChange={(e) =>
                      field.handleChange({ ...social, isPublic: e.target.checked })
                    }
                    className="size-4"
                  />
                  <Label htmlFor="isPublic" className="font-normal">
                    Hiển thị công khai
                  </Label>
                </div>
              </div>
            )
          }}
        </form.Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {(isSubmitting || isLoading) && (
                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
              )}
              {isCreate ? 'Tạo mới' : 'Lưu thay đổi'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
