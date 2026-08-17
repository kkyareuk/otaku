# 오타쿠놀이터

자기 캐릭터 이미지를 등록하고 공유 링크를 만든 뒤, 방문자에게 익명 첫인상을 받는 반응형 웹 서비스입니다. ChatGPT Sites 전용 기능 없이 표준 Next.js와 Firebase로 구성해 일반 GitHub 저장소에서 관리하고 배포할 수 있습니다.

## 지금 구현된 기능

- Firebase Authentication의 실제 Google OAuth 팝업 로그인
- Firebase Storage에 PNG/JPG/WEBP 원본 업로드(최대 10MB)
- Firestore에 캐릭터와 익명 답변 저장
- 로그인한 소유자만 자기 캐릭터의 답변함 열람
- 전체·판타지·현대·동양풍·서양풍·SF·인외 필터
- 캐릭터별 공유 URL 복사 및 URL을 통한 답변 창 열기
- PC와 모바일 레이아웃
- Firebase 미설정 상태에서 가짜 성공 화면 대신 명확한 설정 안내

## GitHub Pages에 실제 사이트 올리기

이 프로젝트는 `README.md`를 직접 게시하는 방식이 아니라 GitHub Actions가 Next.js를 실제 HTML로 빌드해 배포합니다.

1. 이 프로젝트의 파일과 폴더를 GitHub 저장소 최상단에 모두 올립니다. 특히 `.github/workflows/deploy-pages.yml`, `app`, `public`, `package.json`이 있어야 합니다.
2. GitHub 저장소의 Settings > Pages로 이동합니다.
3. Build and deployment의 Source를 `GitHub Actions`로 선택합니다.
4. 저장소의 Actions 탭에서 `Deploy GitHub Pages` 작업이 완료될 때까지 기다립니다.
5. 완료 후 Settings > Pages에 표시되는 주소로 접속합니다.

저장소 이름이 `otaku`라면 주소가 `https://아이디.github.io/otaku/` 형태여도 이미지와 스크립트 경로가 자동으로 맞춰집니다.

Google 로그인까지 활성화하려면 저장소의 Settings > Secrets and variables > Actions에서 다음 이름으로 Repository secret 6개를 추가합니다.

    NEXT_PUBLIC_FIREBASE_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID

값은 Firebase Console의 프로젝트 설정 > 내 앱 > SDK 설정 및 구성에서 확인합니다. 값을 추가한 뒤 Actions 탭에서 `Deploy GitHub Pages`를 다시 실행합니다.

Firebase Console의 Authentication > Settings > Authorized domains에는 경로를 제외한 `아이디.github.io` 도메인을 추가합니다.

## 로컬 실행

Node.js 22.13 이상과 pnpm을 사용합니다.

    pnpm install
    Copy-Item .env.example .env.local
    pnpm dev

브라우저에서 http://localhost:3000 을 엽니다.

## Firebase 연결

1. Firebase Console에서 프로젝트를 만듭니다.
2. Authentication > Sign-in method에서 Google 제공업체를 활성화합니다.
3. 프로젝트 설정에서 웹 앱을 추가하고 아래 값을 `.env.local`에 복사합니다.
4. Firestore Database를 생성합니다.
5. Storage를 생성합니다. 2026년 현재 Storage 사용에는 Blaze 요금제 연결이 필요하지만 무료 사용량 안에서는 청구액이 0원일 수 있습니다.
6. Firebase CLI로 로그인한 뒤 보안 규칙을 배포합니다.

    npx firebase-tools login
    npx firebase-tools use YOUR_PROJECT_ID
    npx firebase-tools deploy --only firestore:rules,storage

필요한 환경 변수:

    NEXT_PUBLIC_FIREBASE_API_KEY=
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
    NEXT_PUBLIC_FIREBASE_APP_ID=

`.env.local`은 Git에 포함되지 않습니다. `.env.example`만 안전하게 커밋됩니다.

Google 로그인 배포 전에는 Firebase Console의 Authentication > Settings > Authorized domains에 실제 배포 도메인을 추가해야 합니다.

## 검증과 GitHub 커밋

    pnpm build
    git add .
    git commit -m "feat: build real character first-impression platform"

원격 저장소가 아직 없다면 GitHub에서 빈 저장소를 만든 뒤:

    git branch -M main
    git remote add origin https://github.com/YOUR_ID/YOUR_REPO.git
    git push -u origin main

## 사용자 제공 대표 이미지

`public/characters/ante-holstein.png`과 `public/og.png`은 사용자가 제공한 원본 PNG를 재인코딩·크롭·필터 적용 없이 그대로 복사한 파일입니다.

원본과 두 파일의 SHA-256:

    E5060C41B8AAB0F5C52DDCE7A5472EF3A38EFE813BFE8DA0681886AB2FDF6A7F

## 주요 파일

- `app/page.tsx`: 로그인, 필터, 이미지 업로드, 캐릭터 등록, 익명 답변, 답변함 UI
- `lib/firebase.ts`: Firebase 클라이언트 초기화
- `firestore.rules`: 캐릭터·답변 접근 권한
- `storage.rules`: 이미지 업로드 권한과 10MB 제한
- `.env.example`: 공개 가능한 환경 변수 템플릿
