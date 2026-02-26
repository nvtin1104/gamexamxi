'use client'
import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FileText,
  X,
  Copy,
  Check,
  Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { uploadApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { ALL_UPLOAD_CATEGORIES, UPLOAD_MAX_SIZE, UPLOAD_ALLOWED_TYPES, type UploadCategory } from '@gamexamxi/shared'
import { toast } from 'sonner'

const LIMIT = 20

const CATEGORY_LABELS: Record<string, string> = {
  avatar: 'Avatar',
  group_avatar: 'Group Avatar',
  group_cover: 'Group Cover',
  shop_asset: 'Shop Asset',
  achievement_icon: 'Achievement Icon',
  general: 'General',
}

const CATEGORY_COLORS: Record<string, string> = {
  avatar: 'bg-blue-100 text-blue-700 border-blue-200',
  group_avatar: 'bg-green-100 text-green-700 border-green-200',
  group_cover: 'bg-purple-100 text-purple-700 border-purple-200',
  shop_asset: 'bg-amber-100 text-amber-700 border-amber-200',
  achievement_icon: 'bg-pink-100 text-pink-700 border-pink-200',
  general: 'bg-gray-100 text-gray-700 border-gray-200',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

export default function UploadsPage() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [offset, setOffset] = useState(0)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<UploadCategory>('general')
  const [entityId, setEntityId] = useState('')
  const [dragOver, setDragOver] = useState(false)

  // ─── Queries ────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['admin-uploads', offset, filterCategory],
    queryFn: () =>
      uploadApi.all(token!, {
        limit: LIMIT,
        offset,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      }),
    enabled: !!token,
  })

  const uploads = data?.data?.items ?? []
  const hasMore = data?.data?.hasMore ?? false
  const page = Math.floor(offset / LIMIT) + 1

  // ─── Mutations ──────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('No file selected')
      return uploadApi.upload(selectedFile, selectedCategory, token!, entityId || undefined)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-uploads'] })
      setUploadDialogOpen(false)
      resetUploadForm()
      toast.success('Upload thành công')
    },
    onError: (err: any) => toast.error(err.message || 'Upload thất bại'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => uploadApi.delete(id, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-uploads'] })
      setDeleteConfirmId(null)
      toast.success('Đã xóa file')
    },
    onError: (err: any) => toast.error(err.message || 'Xóa thất bại'),
  })

  // ─── Handlers ───────────────────────────────────────────────

  const resetUploadForm = () => {
    setSelectedFile(null)
    setSelectedCategory('general')
    setEntityId('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = (file: File) => {
    const maxSize = UPLOAD_MAX_SIZE[selectedCategory]
    if (file.size > maxSize) {
      toast.error(`File quá lớn. Tối đa ${formatSize(maxSize)} cho "${CATEGORY_LABELS[selectedCategory]}"`)
      return
    }
    const allowed = UPLOAD_ALLOWED_TYPES[selectedCategory]
    if (!allowed.includes(file.type)) {
      toast.error(`Loại file "${file.type}" không được phép cho "${CATEGORY_LABELS[selectedCategory]}"`)
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [selectedCategory],
  )

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Uploads</h1>
        <Button
          onClick={() => {
            resetUploadForm()
            setUploadDialogOpen(true)
          }}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload file
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setOffset(0) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tất cả loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {ALL_UPLOAD_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat] ?? cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Tên file</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>MIME</TableHead>
                <TableHead className="text-right">Kích thước</TableHead>
                <TableHead>Ngày upload</TableHead>
                <TableHead className="text-center w-[100px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : uploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Chưa có file nào được upload
                  </TableCell>
                </TableRow>
              ) : (
                uploads.map((upload: any) => (
                  <TableRow key={upload.id} className="group">
                    <TableCell>
                      {isImageMime(upload.mimeType) ? (
                        <button
                          onClick={() => setPreviewUrl(upload.url)}
                          className="h-9 w-9 rounded border bg-muted/50 overflow-hidden hover:ring-2 ring-primary transition-all"
                        >
                          <img
                            src={upload.url}
                            alt={upload.filename}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        </button>
                      ) : (
                        <div className="h-9 w-9 rounded border bg-muted/50 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm truncate max-w-[200px]">{upload.filename}</span>
                        <button
                          onClick={() => handleCopyUrl(upload.url, upload.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-0.5 w-fit"
                        >
                          {copiedId === upload.id ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-green-500">Đã copy</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span className="truncate max-w-[160px]">Copy URL</span>
                            </>
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={CATEGORY_COLORS[upload.category] ?? CATEGORY_COLORS.general}
                      >
                        {CATEGORY_LABELS[upload.category] ?? upload.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {upload.mimeType}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatSize(upload.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {upload.createdAt
                        ? new Date(upload.createdAt).toLocaleString('vi-VN')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirmId(upload.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(offset > 0 || hasMore) && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">Trang {page}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + LIMIT)}
              disabled={!hasMore}
            >
              Tiếp <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        title="Upload file"
        className="max-w-md"
      >
        <div className="space-y-5 px-6 pt-6 pb-2">
          {/* Category */}
          <div className="space-y-2">
            <Label>Loại</Label>
            <Select
              value={selectedCategory}
              onValueChange={(v) => {
                setSelectedCategory(v as UploadCategory)
                setSelectedFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_UPLOAD_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Tối đa {formatSize(UPLOAD_MAX_SIZE[selectedCategory])} ·{' '}
              {UPLOAD_ALLOWED_TYPES[selectedCategory].map((t) => t.split('/')[1]).join(', ')}
            </p>
          </div>

          {/* Entity ID (optional) */}
          <div className="space-y-2">
            <Label>Entity ID <span className="text-muted-foreground font-normal">(tuỳ chọn)</span></Label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="userId, groupId, itemId..."
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors
              ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/40'}
              ${selectedFile ? 'border-green-500/50 bg-green-50/50' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={UPLOAD_ALLOWED_TYPES[selectedCategory].join(',')}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
            />
            {selectedFile ? (
              <>
                {isImageMime(selectedFile.type) ? (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="preview"
                    className="h-20 w-20 rounded object-cover border"
                  />
                ) : (
                  <FileText className="h-10 w-10 text-green-600" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium truncate max-w-[250px]">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Kéo thả file vào đây hoặc <span className="text-primary font-medium">chọn file</span>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 bg-muted/30 border-t justify-end">
          <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(false)}>
            Huỷ
          </Button>
          <Button
            size="sm"
            disabled={!selectedFile || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
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
        </div>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Xác nhận xóa"
        className="max-w-sm"
      >
        <div className="px-6 pt-4 pb-2">
          <p className="text-sm text-muted-foreground">
            File sẽ bị xóa khỏi cả R2 storage và database. Hành động này không thể hoàn tác.
          </p>
        </div>
        <div className="flex items-center gap-2 px-6 py-4 bg-muted/30 border-t justify-end">
          <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
          >
            {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa file'}
          </Button>
        </div>
      </Dialog>

      {/* Image Preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
