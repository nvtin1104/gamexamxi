/** Bảng màu pastel dùng chung cho cảnh 3D — đồng bộ với design tokens CSS. */
export const PALETTE = {
  ink: 0x1e1e24,
  cream: 0xffffff,
  sand: 0xf2ece1,
  ground: 0xebe2d2,
  path: 0xf8f2e8,
  grass: 0xc4ebd4,
  sage: 0xa8e6cf,
  sageDeep: 0x86d1b0,
  butter: 0xffe599,
  sky: 0xb5c7eb,
  coral: 0xffaaa5,
  lavender: 0xdcd3ff,
  trunk: 0xc9a27e,
  skyBg: 0xdfe7f4,
} as const

export const STUDENT_COLORS = [PALETTE.sage, PALETTE.butter, PALETTE.sky, PALETTE.coral, PALETTE.lavender, PALETTE.cream]
