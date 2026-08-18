# 오타쿠놀이터

익명 캐릭터 첫인상을 중심으로 월드컵, 성향 테스트, 커미션 신청서와 연성 소재를 만드는 오타쿠 콘텐츠 플랫폼입니다. 각 메뉴는 독립 화면으로 열리며 서로 다른 제작기가 섞여 보이지 않습니다.

## 현재 구현된 기능

- 캐릭터 이미지·이름·소개를 등록하고 공유 링크를 만드는 익명 첫인상
- 답변자의 선택 닉네임, 익명 기본값, 첫인상 키워드와 500자 답변
- 등록한 Google 계정만 읽을 수 있는 첫인상 답변함
- 참가자 이미지·설명·대사를 등록하고 실제 우승까지 진행하는 월드컵
- 결과 변수를 직접 만드는 테스트와 E/I·S/N·T/F·J/P를 계산하는 MBTI형 테스트
- 질문과 선택지를 자유롭게 추가하고 한 선택지에 여러 숨은 변수·점수를 연결하는 제작기
- `핵심만 신청`, `표준 신청`, `디테일 신청` 커미션 신청서 템플릿
- 커미션 신청서를 텍스트로 복사하거나 PNG로 저장
- 관계·분위기·장소·사건·대사를 조합하는 연성 소재 뽑기
- 실제 Firebase Google 로그인, Firestore, Storage 연결 코드와 보안 규칙
- PC·모바일 반응형 화면과 GitHub Pages 자동 배포
- AdSense 고객 ID가 설정됐을 때만 광고 스크립트를 불러오는 선택 연결

Firebase 값을 넣지 않은 로컬 화면에서는 첫인상과 보관함이 브라우저 `localStorage`로 동작합니다. 여러 사용자가 같은 링크로 답변을 주고받는 실제 서비스 운영에는 아래 Firebase 설정이 필요합니다.

## 로컬 실행

Node.js 22.13 이상과 pnpm을 사용합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## GitHub Pages 배포

이 폴더의 파일과 폴더를 GitHub 저장소 최상단에 그대로 올립니다.

1. 저장소 **Settings > Pages**로 이동합니다.
2. **Build and deployment > Source**를 **GitHub Actions**로 선택합니다.
3. `main` 브랜치에 커밋합니다.
4. **Actions > Deploy GitHub Pages**가 완료되면 사이트를 엽니다.

저장소 이름이 `otaku`라면 주소는 `https://아이디.github.io/otaku/` 형태입니다.

## Firebase와 Google 로그인 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트와 웹 앱을 만듭니다.
2. **Authentication > Sign-in method**에서 `Google`과 `Anonymous`를 모두 활성화합니다.
   - Google: 캐릭터 등록자 로그인과 답변함 소유자 확인
   - Anonymous: 답변자가 Google 로그인 없이 첫인상을 전송할 때 내부적으로 사용하는 익명 계정
3. **Firestore Database**를 생성합니다.
4. **Storage**를 생성합니다. Firebase 정책상 Storage는 결제 계정 연결이 필요할 수 있지만, 무료 사용량 안에서는 실제 청구액이 0원일 수 있습니다.
5. **Authentication > Settings > Authorized domains**에 배포 도메인을 추가합니다.
   - GitHub Pages가 `https://kkyareuk.github.io/otaku/`이면 `kkyareuk.github.io`만 입력합니다.
   - `https://`, `/otaku`, 마지막 슬래시는 넣지 않습니다.
6. 프로젝트 설정의 웹 앱 구성값을 확인합니다.
7. GitHub 저장소 **Settings > Secrets and variables > Actions**에서 아래 Repository secret을 추가합니다.

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

로컬에서는 `.env.example`을 `.env.local`로 복사해 같은 값을 입력합니다.

### Firestore·Storage 보안 규칙 배포

저장소에 포함된 규칙은 첫인상 방을 공개로 읽게 하고, 답변 목록은 방 소유자만 읽도록 제한합니다. Firebase CLI에서 한 번 배포합니다.

```bash
npx firebase-tools login
npx firebase-tools use 내_FIREBASE_PROJECT_ID
npx firebase-tools deploy --only firestore:rules,storage
```

### `otaku-4143.firebaseapp.com`과 `꺄륵 게임즈`는 서로 다른 설정

- `꺄륵 게임즈`처럼 로그인 화면에 보일 브랜드명은 **Google Auth Platform > Branding > App name**에서 설정합니다.
- `otaku-4143.firebaseapp.com`은 Firebase가 OAuth 처리를 위해 만든 인증 도메인입니다. 프로젝트 ID를 한글 브랜드명으로 단순 변경하는 방식이 아닙니다.
- 로그인 중 보이는 주소까지 바꾸려면 소유한 도메인(예: `auth.example.com`)을 Firebase Hosting에 연결하고, Firebase의 승인 도메인과 Google OAuth 리디렉션 URI에 `https://auth.example.com/__/auth/handler`를 등록한 다음 `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.example.com`으로 빌드합니다.
- Google OAuth 브랜딩의 앱 이름·로고를 일반 사용자에게 표시하려면 Google의 브랜드 확인 절차가 요구될 수 있습니다. 홈페이지, 개인정보처리방침, 소유 도메인을 미리 준비하는 편이 좋습니다.

## 광고 넣기

코드는 AdSense 고객 ID가 있을 때 자동 광고 스크립트를 불러오도록 준비되어 있습니다.

1. Google AdSense에서 사이트를 추가하고 심사를 요청합니다.
2. 승인 후 고객 ID `ca-pub-숫자`를 확인합니다.
3. GitHub Actions secret에 `NEXT_PUBLIC_ADSENSE_CLIENT`라는 이름으로 고객 ID를 추가합니다.
4. 다시 배포하고 AdSense에서 **자동 광고**를 켭니다.

```text
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000
```

이 사이트는 사용자가 텍스트와 이미지를 올리는 UGC 서비스이므로 광고를 붙이기 전에 다음 운영 기능이 필요합니다.

- 신고 버튼과 관리자 삭제·차단
- 성인·선정·폭력 콘텐츠 규정과 업로드 동의
- 광고 제한 콘텐츠 페이지에서 광고 비활성화
- 개인정보처리방침, 이용약관, 쿠키·동의 안내
- 반복 스팸 방지를 위한 App Check, 속도 제한 또는 CAPTCHA

UGC가 정책을 위반하면 운영자가 직접 작성하지 않은 내용이어도 AdSense 게시자 책임이 됩니다. 신고·검수 기능을 먼저 만든 뒤 광고를 켜는 것을 권장합니다.

## 주요 파일

- `app/page.tsx`: 메뉴별 독립 화면, 첫인상, 월드컵·테스트, 커미션 신청서, 연성 소재
- `app/globals.css`: 전체 디자인과 PC·모바일 반응형 스타일
- `app/layout.tsx`: 공유 메타데이터와 선택형 AdSense 스크립트
- `lib/firebase.ts`: Firebase Auth, Firestore, Storage 초기화
- `firestore.rules`: 첫인상 방과 등록자 전용 답변함 규칙
- `storage.rules`: 첫인상 캐릭터 이미지 업로드 규칙
- `public/characters/ante-maid-transparent.png`: 사용자 제공 새 대표 이미지의 배경 투명화본
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 배포
