import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { uploadMedia } from '@/lib/api/media'
import type { Media } from '@gamexamxi/shared'

interface MediaUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (media: Media) => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function MediaUploadModal({ open, onOpenChange, onSuccess }: MediaUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: uploadMedia,
    onSuccess: (res) => {
      toast.success('Upload thành công')
      setFile(null)
      setPreview(null)
      setAlt('')
      onOpenChange(false)
      onSuccess?.(res)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Upload thất bại')
    },
  })

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      toast.error('Chỉ chấp nhận file hình ảnh: JPEG, PNG, GIF, WebP')
      return
    }

    if (selectedFile.size > MAX_SIZE) {
      toast.error('Kích thước file không được vượt quá 10MB')
      return
    }

    setFile(selectedFile)
    setAlt(selectedFile.name.replace(/\.[^/.]+$/, ''))

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files[0]
    handleFileSelect(droppedFile)
  }

  const handleSubmit = () => {
    if (!file) return
    uploadMutation.mutate({ file, alt })
  }

  const handleClose = () => {
    setFile(null)
    setPreview(null)
    setAlt('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload hình ảnh</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-muted p-3">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Kéo thả hình ảnh vào đây hoặc{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => inputRef.current?.click()}
                  >
                    chọn file
                  </button>
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, GIF, WebP • Tối đa 10MB
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              <img
                src={preview || ''}
                alt={alt}
                className="w-full h-48 object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                }}
                className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="alt">Mô tả (alt)</Label>
            <Input
              id="alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Mô tả ngắn cho hình ảnh..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang upload...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
