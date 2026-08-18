# 오타쿠놀이터

월드컵, 테스트 제작, 자캐 놀이를 한곳에서 즐기는 오타쿠 콘텐츠 플랫폼의 프론트엔드입니다.

## 현재 들어 있는 기능

- 오타쿠형 월드컵 아이디어와 제작 진입 화면
- 오타쿠용 테스트 템플릿 선택기
- 자캐 프로필·첫인상·관계도·케미·가챠·빙고·팔레트 콘텐츠
- 콘텐츠 종류와 템플릿 선택
- 제목과 소개 입력
- 표지 이미지 업로드 및 미리보기
- 색상 테마 선택
- 현재 브라우저의 내 보관함에 초안 저장·삭제
- PC와 모바일 반응형 화면
- GitHub Pages 정적 배포

초안은 사용 중인 브라우저의 로컬 저장소에 보관됩니다.

## 로컬 실행

Node.js 22.13 이상과 pnpm을 사용합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## GitHub Pages 배포

프로젝트 전체를 GitHub 저장소의 최상단에 올리면 `.github/workflows/deploy-pages.yml`이 Next.js를 정적 HTML로 빌드합니다.

1. 저장소의 **Settings > Pages**로 이동합니다.
2. **Build and deployment > Source**를 **GitHub Actions**로 선택합니다.
3. `main` 브랜치에 변경사항을 커밋합니다.
4. **Actions > Deploy GitHub Pages**가 완료될 때까지 기다립니다.

저장소 이름이 `otaku`라면 배포 주소는 `https://아이디.github.io/otaku/` 형식입니다.

## 주요 파일

- `app/page.tsx`: 홈, 콘텐츠 목록, 제작기, 미리보기, 내 보관함
- `app/globals.css`: 전체 디자인과 반응형 스타일
- `app/layout.tsx`: 사이트 제목과 공유 메타데이터
- `public/characters/ante-holstein.png`: 사용자 제공 대표 이미지 원본
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 배포
