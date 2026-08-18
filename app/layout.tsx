import type { Metadata } from "next";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const title = "오타쿠놀이터 | 취향이 놀거리가 되는 곳";
const description = "오타쿠형 월드컵, 변수·MBTI 테스트 제작기, 연성 소재 추첨과 자캐 콘텐츠를 한곳에서 만들고 즐겨보세요.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: { icon: `${siteUrl}/favicon.svg`, shortcut: `${siteUrl}/favicon.svg` },
  openGraph: { title, description, images: [`${siteUrl}/og.png`] },
  twitter: { card: "summary_large_image", title, description, images: [`${siteUrl}/og.png`] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
