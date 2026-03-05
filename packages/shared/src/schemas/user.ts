import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100, 'Tên tối đa 100 ký tự'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(128, 'Mật khẩu tối đa 128 ký tự'),
  role: z.enum(['admin', 'mod', 'user']).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(100).optional(),
  email: z.string().email('Email không hợp lệ').optional(),
  role: z.enum(['admin', 'mod', 'user']).optional(),
  status: z.enum(['active', 'banned', 'block']).optional(),
  avatar: z.string().url('URL avatar không hợp lệ').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  birthdate: z.string().optional().or(z.literal('')),
  banReason: z.string().max(500).optional().or(z.literal('')),
  blockReason: z.string().max(500).optional().or(z.literal('')),
  blockExpiresAt: z.string().optional().or(z.literal('')),
})

export type CreateUserFormData = z.infer<typeof createUserSchema>
export type UpdateUserFormData = z.infer<typeof updateUserSchema>
