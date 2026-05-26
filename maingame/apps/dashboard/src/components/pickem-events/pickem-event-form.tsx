import { useForm } from '@tanstack/react-form'
import type { CreatePickemEventFormData, UpdatePickemEventFormData } from '@gamexamxi/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LoaderCircleIcon } from 'lucide-react'

interface CreateModeProps {
  mode: 'create'
  defaultValues?: CreatePickemEventFormData
  onSubmit: (data: CreatePickemEventFormData) => Promise<void>
  isLoading?: boolean
}

interface EditModeProps {
  mode: 'edit'
  defaultValues?: UpdatePickemEventFormData
  onSubmit: (data: UpdatePickemEventFormData) => Promise<void>
  isLoading?: boolean
}

type PickemEventFormProps = CreateModeProps | EditModeProps

const defaultValues: CreatePickemEventFormData = {
  title: '',
  thumbnail: '',
  description: '',
  winPoints: 0,
  pickPoints: 0,
  winExp: 0,
  pickExp: 0,
  eventDate: '',
  closePicksAt: '',
  maxPickItems: 1,
}

export function PickemEventForm(props: PickemEventFormProps) {
  const isCreate = props.mode === 'create'

  const form = useForm({
    defaultValues: props.defaultValues ? { ...defaultValues, ...props.defaultValues } : defaultValues,
    onSubmit: async ({ value }) => {
      await props.onSubmit(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-6"
    >
      <form.Field
        name="title"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Tên sự kiện *</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Nhập tên sự kiện"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      />

      <form.Field
        name="thumbnail"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>URL Thumbnail</Label>
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      />

      <form.Field
        name="description"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Mô tả</Label>
            <Textarea
              id={field.name}
              name={field.name}
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Nhập mô tả sự kiện"
              rows={4}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      />

      <form.Field
        name="eventDate"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Ngày sự kiện *</Label>
            <Input
              id={field.name}
              name={field.name}
              type="datetime-local"
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      />

      <form.Field
        name="closePicksAt"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Thời hạn chọn *</Label>
            <Input
              id={field.name}
              name={field.name}
              type="datetime-local"
              value={field.state.value as string}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      />

      <form.Field
        name="maxPickItems"
        children={(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name}>Số lượng chọn tối đa</Label>
            <Input
              id={field.name}
              name={field.name}
              type="number"
              min="1"
              max="10"
              value={field.state.value as number}
              onChange={(e) => field.handleChange(Number(e.target.value))}
            />
            {field.state.meta.errors.length > 0 && (
              <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
            )}
          </div>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <form.Field
          name="winPoints"
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Điểm thưởng (khi thắng)</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min="0"
                value={field.state.value as number}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        />

        <form.Field
          name="pickPoints"
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>Điểm cược</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min="0"
                value={field.state.value as number}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        />

        <form.Field
          name="winExp"
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>EXP thưởng (khi thắng)</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min="0"
                value={field.state.value as number}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        />

        <form.Field
          name="pickExp"
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name}>EXP cược</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min="0"
                value={field.state.value as number}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={props.isLoading}>
          {props.isLoading && <LoaderCircleIcon className="size-4 animate-spin mr-2" />}
          {isCreate ? 'Tạo sự kiện' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  )
}
