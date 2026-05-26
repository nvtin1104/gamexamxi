import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  PlusIcon,
  Loader2Icon,
  TrashIcon,
  CopyIcon,
  ImageIcon,
} from 'lucide-react'
import { listMedia, deleteMedia } from '@/lib/api/media'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { MediaUploadModal } from '@/components/media/media-upload-modal'

const searchSchema = z.object({
  page: z.coerce.number().int().positive().optional().catch(1),
  pageSize: z.coerce.number().int().positive().max(50).optional().catch(20),
})

export const Route = createFileRoute('/_authenticated/media/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: MediaPage,
})

function MediaPage() {
  const navigate = Route.useNavigate()
  const filters = Route.useSearch()
  const queryClient = useQueryClient()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const searchFilters = filters as { page?: number; pageSize?: number }
  const page = searchFilters.page ?? 1
  const pageSize = searchFilters.pageSize ?? 20

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['media', searchFilters],
    queryFn: () => listMedia({ page, pageSize }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      toast.success('Đã xóa file')
      queryClient.invalidateQueries({ queryKey: ['media'] })
      setDeleteTargetId(null)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
    },
  })

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize)

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('Đã copy URL vào clipboard')
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Thư viện Media</h1>
          {isFetching && !isLoading && (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground ml-2" />
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {data?.total ?? 0} files
            </p>
          </div>

          <Button onClick={() => setUploadOpen(true)}>
            <PlusIcon className="size-4 mr-2" />
            Upload
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden">
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="flex flex-1 items-center justify-center min-h-64">
            <div className="text-center">
              <ImageIcon className="size-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Chưa có file nào</p>
              <Button className="mt-4" onClick={() => setUploadOpen(true)}>
                Upload file đầu tiên
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data?.data.map((media) => (
              <div
                key={media.id}
                className="group relative aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={media.fileUrl}
                  alt={media.alt ?? media.fileName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-8"
                    onClick={() => handleCopyUrl(media.fileUrl)}
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="size-8"
                    onClick={() => setDeleteTargetId(media.id)}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-xs truncate">
                  {media.fileName}
                  <br />
                  <span className="text-white/70">
                    {formatFileSize(media.fileSize)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (data?.total ?? 0) > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              Hiển thị {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, data?.total ?? 0)} trong {data?.total ?? 0} files
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => navigate({ search: { ...filters, page: page - 1 } })}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => navigate({ search: { ...filters, page: page + 1 } })}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa file này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
            >
              {deleteMutation.isPending ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : null}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MediaUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['media'] })
        }}
      />
    </>
  )
}
