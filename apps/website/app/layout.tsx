import type { Metadata } from "next";
import { Be_Vietnam_Pro, DM_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Gamexamxi - Minigame",
  description: "Kho game nhỏ xinh, chơi ngay trên trình duyệt — không cần cài đặt. Thử thách bạn bè, leo bảng xếp hạng!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnamPro.variable} ${dmMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
