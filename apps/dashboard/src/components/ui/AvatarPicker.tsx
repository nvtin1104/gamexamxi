'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Upload, ImageIcon, Trash2, Loader2, Check,
  ChevronLeft, ChevronRight, AlertCircle,
} from 'lucide-react'
import { uploadApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { toast } from 'sonner'

interface AvatarPickerProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  token: string
  entityId?: string
  username?: string    // used for fallback initials
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LIBRARY_LIMIT = 12
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export function AvatarPicker({
  value,
  onChange,
  token,
  entityId,
  username,
  size = 'md',
  className,
}: AvatarPickerProps) {
  const [tab, setTab] = useState<'upload' | 'library'>('upload')
  const [imgError, setImgError] = useState(false)
  const [libOffset, setLibOffset] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset imgError when value changes externally
  const handleExternalChange = (url: string | null) => {
    setImgError(false)
    onChange(url)
  }

  // ─── Library query ──────────────────────────────────────────

  const { data: libData, isLoading: libLoading } = useQuery({
    queryKey: ['avatar-library', libOffset],
    queryFn: () =>
      uploadApi.all(token, { category: 'avatar', limit: LIBRARY_LIMIT, offset: libOffset }),
    enabled: tab === 'library',
    staleTime: 30_000,
  })

  const libImages = libData?.data?.items ?? []
  const libHasMore = libData?.data?.hasMore ?? false

  // ─── Upload mutation ────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadApi.upload(file, 'avatar', token, entityId),
    onSuccess: (res) => {
      if (res.data?.url) {
        handleExternalChange(res.data.url)
        toast.success('Avatar đã được upload thành công')
      }
    },
    onError: (err: any) =>
      toast.error(err.message || 'Upload thất bại, kiểm tra lại kết nối'),
  })

  // ─── File validation & trigger ──────────────────────────────

  const handleFile = useCallback(
    (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Định dạng "${file.type}" không được hỗ trợ — chỉ JPG, PNG, WebP, GIF`)
        return
      }
      if (file.size > MAX_BYTES) {
        toast.error('Kích thước vượt giới hạn 2 MB')
        return
      }
      uploadMutation.mutate(file)
    },
    [uploadMutation],
  )

  // ─── Derived sizes ───────────────────────────────────────────

  const avatarCls = size === 'sm' ? 'h-14 w-14' : size === 'lg' ? 'h-24 w-24' : 'h-20 w-20'
  const textCls = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-3xl' : 'text-2xl'

  return (
    <div className={cn('space-y-3', className)}>
      {/* ── Preview row ─────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Avatar circle */}
        <div
          className={cn(
            'relative rounded-full overflow-hidden border-2 bg-muted flex items-center justify-center shrink-0',
            avatarCls,
            imgError || !value ? 'border-muted' : 'border-primary/20',
          )}
        >
          {value && !imgError ? (
            <img
              src={value}
              alt="Avatar"
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className={cn('font-black text-muted-foreground select-none', textCls)}>
              {username?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}

          {/* Upload overlay spinner */}
          {uploadMutation.isPending && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}

          {/* Error badge */}
          {imgError && value && (
            <div className="absolute bottom-0 left-0 right-0 bg-destructive/80 flex items-center justify-center py-0.5">
              <AlertCircle className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={tab === 'upload' ? 'default' : 'outline'}
              onClick={() => setTab('upload')}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === 'library' ? 'default' : 'outline'}
              onClick={() => setTab('library')}
            >
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Thư viện
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleExternalChange(null)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa ảnh
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            JPG, PNG, WebP, GIF · Tối đa 2 MB
          </p>
        </div>
      </div>

      {/* ── Upload tab ──────────────────────────────────────── */}
      {tab === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center gap-2 py-7 border-2 border-dashed rounded-xl cursor-pointer transition-all select-none',
            dragOver
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30',
            uploadMutation.isPending && 'pointer-events-none opacity-60',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_TYPES.join(',')}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Đang upload...</p>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Kéo thả file vào đây hoặc{' '}
                <span className="text-primary font-semibold">chọn từ máy tính</span>
              </p>
              <p className="text-xs text-muted-foreground/60">PNG, JPG, WEBP, GIF — max 2MB</p>
            </>
          )}
        </div>
      )}

      {/* ── Library tab ─────────────────────────────────────── */}
      {tab === 'library' && (
        <div className="space-y-3">
          {libLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : libImages.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 border-2 border-dashed rounded-xl text-muted-foreground">
              <ImageIcon className="h-8 w-8 opacity-30" />
              <p className="text-xs font-medium">Chưa có ảnh avatar trong thư viện</p>
              <p className="text-xs opacity-60">Hãy upload ảnh mới ở tab Upload</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {libImages.map((img) => (
                <LibraryImage
                  key={img.id}
                  url={img.url}
                  filename={img.filename}
                  selected={value === img.url}
                  onSelect={() => {
                    handleExternalChange(img.url)
                    setTab('upload')
                    toast.success('Đã chọn ảnh từ thư viện')
                  }}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {(libOffset > 0 || libHasMore) && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                disabled={libOffset === 0}
                onClick={() => setLibOffset(Math.max(0, libOffset - LIBRARY_LIMIT))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {Math.floor(libOffset / LIBRARY_LIMIT) + 1}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                disabled={!libHasMore}
                onClick={() => setLibOffset(libOffset + LIBRARY_LIMIT)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Library Image Item ──────────────────────────────────────

function LibraryImage({
  url,
  filename,
  selected,
  onSelect,
}: {
  url: string
  filename: string
  selected: boolean
  onSelect: () => void
}) {
  const [err, setErr] = useState(false)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-primary',
        selected
          ? 'border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/20'
          : 'border-transparent hover:border-primary/40 hover:shadow-md',
      )}
      title={filename}
    >
      {err ? (
        <div className="h-full w-full flex items-center justify-center bg-muted">
          <AlertCircle className="h-4 w-4 text-muted-foreground opacity-50" />
        </div>
      ) : (
        <img
          src={url}
          alt={filename}
          className="h-full w-full object-cover"
          onError={() => setErr(true)}
        />
      )}
      {selected && (
        <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      )}
    </button>
  )
}
