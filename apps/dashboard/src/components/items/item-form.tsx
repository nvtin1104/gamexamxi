import { useState, useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { createItemSchema, updateItemSchema } from '@gamexamxi/shared'
import type { CreateItemFormData, UpdateItemFormData, LinkSocialInput, ItemEvent } from '@gamexamxi/shared'
import { getFieldValidator, getFormValidator } from '@/lib/utils/form-validator'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { LoaderCircleIcon, PlusIcon, XIcon, LinkIcon } from 'lucide-react'
import { listItems } from '@/lib/api/items'

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

const SOCIAL_TYPES = [
  { value: 'twitter', label: 'Twitter' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Khác' },
] as const

function LinkSocialModal({
  open,
  onOpenChange,
  links,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  links: LinkSocialInput[]
  onSave: (links: LinkSocialInput[]) => void
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [currentLink, setCurrentLink] = useState<LinkSocialInput>(() => ({
    type: 'twitter',
    url: '',
    handle: '',
    isPublic: true,
  }))

  const resetForm = () => {
    setEditingIndex(null)
    setCurrentLink({ type: 'twitter', url: '', handle: '', isPublic: true })
  }

  const handleAddOrUpdate = () => {
    if (editingIndex !== null) {
      const newLinks = [...links]
      newLinks[editingIndex] = currentLink
      onSave(newLinks)
      setEditingIndex(null)
    } else {
      onSave([...links, currentLink])
    }
    setCurrentLink({ type: 'twitter', url: '', handle: '', isPublic: true })
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setCurrentLink(links[index])
  }

  const handleDelete = (index: number) => {
    onSave(links.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
      setCurrentLink({ type: 'twitter', url: '', handle: '', isPublic: true })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) resetForm()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quản lý liên kết mạng xã hội</DialogTitle>
          <DialogDescription>
            Thêm các liên kết mạng xã hội của player/team/tournament
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {links.length > 0 && (
            <div className="space-y-2">
              <Label>Danh sách liên kết</Label>
              <div className="flex flex-wrap gap-2">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm"
                  >
                    <LinkIcon className="size-3" />
                    <span>{link.type}</span>
                    <button
                      type="button"
                      onClick={() => handleEdit(index)}
                      className="hover:text-primary"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-md border p-4">
            <div className="flex flex-col gap-1.5">
              <Label>Mạng xã hội</Label>
              <Select
                value={currentLink.type}
                onValueChange={(val) => setCurrentLink({ ...currentLink, type: val as LinkSocialInput['type'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mạng" />
                </SelectTrigger>
                <SelectContent>
                  {SOCIAL_TYPES.map((social) => (
                    <SelectItem key={social.value} value={social.value}>
                      {social.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>URL</Label>
              <Input
                type="url"
                placeholder="https://twitter.com/..."
                value={currentLink.url ?? ''}
                onChange={(e) => setCurrentLink({ ...currentLink, url: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Handle</Label>
              <Input
                type="text"
                placeholder="@handle"
                value={currentLink.handle ?? ''}
                onChange={(e) => setCurrentLink({ ...currentLink, handle: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="linkIsPublic"
                checked={currentLink.isPublic ?? false}
                onChange={(e) => setCurrentLink({ ...currentLink, isPublic: e.target.checked })}
                className="size-4"
              />
              <Label htmlFor="linkIsPublic" className="font-normal">
                Hiển thị công khai
              </Label>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOrUpdate}
              className="w-full"
            >
              {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ItemForm({ mode, defaultValues, onSubmit, isLoading }: ItemFormProps) {
  const isCreate = mode === 'create'
  const [linkSocialModalOpen, setLinkSocialModalOpen] = useState(false)
  const [parentOptions, setParentOptions] = useState<ItemEvent[]>([])

  useEffect(() => {
    if (isCreate) {
      listItems({ pageSize: 100, level: 0 }).then((res) => {
        setParentOptions(res.data)
      }).catch(console.error)
    }
  }, [isCreate])

  const schema = isCreate ? createItemSchema : updateItemSchema

  const form = useForm({
    defaultValues: isCreate
      ? {
          name: defaultValues?.name ?? '',
          logo: defaultValues?.logo ?? '',
          description: defaultValues?.description ?? '',
          linkSocial: defaultValues?.linkSocial ?? [],
          level: defaultValues?.level ?? 0,
          parentId: defaultValues?.parentId ?? null,
          type: defaultValues?.type ?? 'player',
        }
      : {
          name: defaultValues?.name ?? '',
          logo: defaultValues?.logo ?? '',
          description: defaultValues?.description ?? '',
          linkSocial: defaultValues?.linkSocial ?? [],
          level: defaultValues?.level ?? 0,
          parentId: defaultValues?.parentId ?? null,
        },
    validators: {
      onSubmit: getFormValidator(schema),
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value as CreateItemFormData)
    },
  })

  const [level, setLevel] = useState(0)

  const showParentId = isCreate && level === 1

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
          onBlur: getFieldValidator(schema.shape.name),
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
            onBlur: getFieldValidator(createItemSchema.shape.type),
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
                <SelectTrigger className="w-full">
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
          onBlur: getFieldValidator(schema.shape.logo),
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Logo URL</Label>
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
          onBlur: getFieldValidator(schema.shape.description),
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Mô tả</Label>
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
            <Select
              value={String(field.state.value)}
              onValueChange={(val) => {
                const newLevel = parseInt(val)
                setLevel(newLevel)
                field.handleChange(newLevel)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Level 0</SelectItem>
                <SelectItem value="1">Level 1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      {showParentId && (
        <form.Field name="parentId">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Parent (Level 0)</Label>
              <Select
                value={field.state.value ?? ''}
                onValueChange={(val) => field.handleChange(val || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn parent" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      )}

      <div className="rounded-md border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium">Liên kết mạng xã hội</h3>
          <Dialog open={linkSocialModalOpen} onOpenChange={setLinkSocialModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" type="button">
                <PlusIcon className="mr-1 size-4" />
                Thêm liên kết
              </Button>
            </DialogTrigger>
            <LinkSocialModal
              open={linkSocialModalOpen}
              onOpenChange={setLinkSocialModalOpen}
              links={form.getFieldValue('linkSocial')}
              onSave={(links) => form.setFieldValue('linkSocial', links)}
            />
          </Dialog>
        </div>

        <form.Field name="linkSocial">
          {(field) => {
            const links = field.state.value as LinkSocialInput[]
            if (links.length === 0) {
              return <p className="text-sm text-muted-foreground">Chưa có liên kết nào</p>
            }
            return (
              <div className="flex flex-wrap gap-2">
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm"
                  >
                    <LinkIcon className="size-3" />
                    <span className="capitalize">{link.type}</span>
                    {link.handle && <span className="text-muted-foreground">@{link.handle}</span>}
                  </div>
                ))}
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
