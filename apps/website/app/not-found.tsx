import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative z-10">
      <div className="text-center">
        <h1 className="font-display text-[120px] font-bold leading-none text-ink [text-shadow:4px_4px_0_var(--color-peach)]">
          404
        </h1>
        <p className="text-xl font-semibold text-ink mt-4">Trang không tồn tại</p>
        <p className="text-muted mt-2">Xin lỗi, trang bạn đang tìm kiếm không tồn tại.</p>
        <Link
          href="/"
          className="inline-block mt-8 px-6 py-3 bg-peach border border-ink rounded-lg font-semibold text-ink shadow-sm hover:bg-peach-dark hover:shadow-md transition-all"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}
