import { z } from 'zod'

export const linkSocialSchema = z.object({
  type: z.enum(['twitter', 'facebook', 'instagram', 'tiktok', 'youtube', 'other']),
  url: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  handle: z.string().optional(),
  isPublic: z.boolean().default(true),
})

export type LinkSocialInput = z.infer<typeof linkSocialSchema>

export const createItemSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(200, 'Tên tối đa 200 ký tự'),
  logo: z.string().url('URL logo không hợp lệ').optional().or(z.literal('')),
  description: z.string().max(2000, 'Mô tả tối đa 2000 ký tự').optional(),
  linkSocial: z.array(linkSocialSchema).default([]),
  level: z.number().int().min(0).max(1).default(0),
  parentId: z.string().optional().nullable(),
  type: z.enum(['player', 'team', 'tournament']),
})

export const updateItemSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  logo: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  linkSocial: z.array(linkSocialSchema).optional(),
  level: z.number().int().min(0).max(1).optional(),
  parentId: z.string().optional().nullable(),
})

export type CreateItemFormData = z.infer<typeof createItemSchema>
export type UpdateItemFormData = z.infer<typeof updateItemSchema>

export const ITEM_TYPE_LABELS: Record<string, string> = {
  player: 'Player',
  team: 'Team',
  tournament: 'Tournament',
}
