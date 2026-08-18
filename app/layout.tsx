import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");
const title = "오타쿠놀이터 | 취향이 놀거리가 되는 곳";
const description =
  "익명 캐릭터 첫인상, 오타쿠형 월드컵, 변수·MBTI 테스트, 커미션 신청서와 연성 소재를 한곳에서 만들고 즐겨보세요.";
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  icons: { icon: `${siteUrl}/favicon.svg`, shortcut: `${siteUrl}/favicon.svg` },
  openGraph: { title, description, images: [`${siteUrl}/og.png`] },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        {children}
        {adsenseClient && (
          <Script
            id="adsense-script"
            strategy="afterInteractive"
            async
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
          />
        )}
      </body>
    </html>
  );
}
