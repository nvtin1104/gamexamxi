import { z } from 'zod'

export const createPickemEventSchema = z.object({
  title: z.string().min(2, 'Tên sự kiện tối thiểu 2 ký tự').max(200, 'Tên sự kiện tối đa 200 ký tự'),
  thumbnail: z.string().url('URL thumbnail không hợp lệ').optional().or(z.literal('')).default(''),
  description: z.string().max(2000, 'Mô tả tối đa 2000 ký tự').optional().default(''),
  winPoints: z.number().int().min(0, 'Điểm thưởng phải lớn hơn 0').default(0),
  pickPoints: z.number().int().min(0, 'Điểm cược phải lớn hơn 0').default(0),
  winExp: z.number().int().min(0, 'EXP thưởng phải lớn hơn 0').default(0),
  pickExp: z.number().int().min(0, 'EXP cược phải lớn hơn 0').default(0),
  eventDate: z.string().min(1, 'Ngày sự kiện là bắt buộc'),
  closePicksAt: z.string().min(1, 'Thời hạn chọn là bắt buộc'),
  maxPickItems: z.number().int().min(1, 'Số lượng chọn tối thiểu là 1').max(10, 'Số lượng chọn tối đa là 10').default(1),
})

export const updatePickemEventSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  thumbnail: z.string().url().optional().or(z.literal('')).default(''),
  description: z.string().max(2000).optional().default(''),
  winPoints: z.number().int().min(0).optional(),
  pickPoints: z.number().int().min(0).optional(),
  winExp: z.number().int().min(0).optional(),
  pickExp: z.number().int().min(0).optional(),
  eventDate: z.string().min(1).optional(),
  closePicksAt: z.string().min(1).optional(),
  maxPickItems: z.number().int().min(1).max(10).optional(),
})

export const createPickemEventOptionSchema = z.object({
  eventItemId: z.string().min(1, 'Item là bắt buộc'),
  isWinningOption: z.boolean().default(false),
})

export const updatePickemEventOptionSchema = z.object({
  isWinningOption: z.boolean().optional(),
})

export type CreatePickemEventFormData = z.infer<typeof createPickemEventSchema>
export type UpdatePickemEventFormData = z.infer<typeof updatePickemEventSchema>
export type CreatePickemEventOptionFormData = z.infer<typeof createPickemEventOptionSchema>
export type UpdatePickemEventOptionFormData = z.infer<typeof updatePickemEventOptionSchema>
