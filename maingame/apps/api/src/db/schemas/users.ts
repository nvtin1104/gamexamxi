import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { createId } from '@paralleldrive/cuid2'
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    accountRole: text('account_role', { enum: ['admin', 'user'] }).notNull().default('user'), // Phân quyền tài khoản
    role: text('role', { enum: ['root', 'staff', 'kol', 'mod', 'user'] }).notNull().default('user'),
    passwordHash: text('password_hash').notNull(),
    ggId: text('gg_id').unique(),

    /** Ngày sinh (timestamp) */
    birthdate: integer('birthdate', { mode: 'timestamp' }),
    phone: text('phone'),
    address: text('address'),
    pointsEarned: integer('points_earned').notNull().default(0), // Tổng điểm đã kiếm được (không giảm khi tiêu)
    pointsSpent: integer('points_spent').notNull().default(0), // Tổng điểm đã tiêu (không giảm khi kiếm)
    pointsBalance: integer('points_balance').notNull().default(0), // Điểm hiện tại (cập nhật khi kiếm/tiêu)
    pointsExpired: integer('points_expired').notNull().default(0), // Điểm đã hết hạn (cập nhật khi hết hạn)
    pointsExpiring: integer('points_expiring').notNull().default(0), // Điểm sắp hết hạn (cập nhật hàng ngày)
    level: integer('level').notNull().default(1), // Cấp độ người dùng, có thể dùng để phân quyền hoặc ưu đãi
    experience: integer('experience').notNull().default(0), // Kinh nghiệm để lên cấp, có thể dùng để tính toán level

    loginStreak: integer('login_streak').notNull().default(0), // Số ngày đăng nhập liên tiếp

    // --- CÁC TRƯỜNG BỔ SUNG QUẢN LÝ ---

    /** Trạng thái tài khoản: active, banned, block */
    status: text('status', { enum: ['active', 'banned', 'block'] })
      .notNull()
      .default('active'),

    blockExpiresAt: integer('block_expires_at', { mode: 'timestamp' }),
    blockReason: text('block_reason'),

    /** Lý do khóa tài khoản (nếu có) */
    banReason: text('ban_reason'),

    /** Ảnh đại diện */
    avatar: text('avatar'),

    /** Bảo mật: Lưu lần đăng nhập cuối để kiểm soát session */
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),

    /** IP đăng nhập cuối (để phát hiện gian lận/multi-account) */
    lastLoginIp: text('last_login_ip'),

    /** Xác thực email: null nếu chưa verify, timestamp nếu rồi */
    emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }),

    // --- METADATA ---
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdateFn(() => new Date()),
  },
  (t) => ({
    emailIdx: index('email_idx').on(t.email),
    statusIdx: index('status_idx').on(t.status), // Index để lọc nhanh các user bị ban
  })
)