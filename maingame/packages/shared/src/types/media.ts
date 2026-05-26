export interface Media {
  id: string
  fileName: string
  fileKey: string
  fileUrl: string
  mimeType: string
  fileSize: number
  width: number | null
  height: number | null
  alt: string | null
  uploadedBy: string
  createdAt: Date
}

export interface MediaWithUploader extends Media {
  uploaderName?: string
}
