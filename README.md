# 오타쿠놀이터

월드컵, 테스트, 자캐 놀이와 연성 소재 추첨을 한곳에서 즐기는 오타쿠 콘텐츠 플랫폼입니다.

## 현재 들어 있는 기능

- 아이디와 닉네임을 만드는 브라우저 로컬 프로필
- 참가자 이름·설명·이미지를 등록하고 실제 대결과 우승 결과까지 진행하는 월드컵 제작기
- 질문·A/B 선택지·결과를 등록하고 실제로 풀어 보는 테스트 제작기
- 장르·관계·분위기·장소·사건·대사를 조합하는 연성 소재 추첨기
- 자캐 프로필·첫인상·관계도·케미·가챠·빙고·팔레트 콘텐츠
- 콘텐츠 종류와 템플릿 선택
- 제목과 소개 입력
- 표지 이미지 업로드 및 미리보기
- 색상 테마 선택
- 현재 브라우저의 내 보관함에 초안 저장·삭제
- PC와 모바일 반응형 화면
- GitHub Pages 정적 배포

프로필과 초안은 사용 중인 브라우저의 로컬 저장소에 보관됩니다. 서버 계정이 아니므로 다른 기기와 자동으로 동기화되지는 않습니다.

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

- `app/page.tsx`: 홈, 프로필, 월드컵·테스트 제작과 플레이, 연성 소재, 내 보관함
- `app/globals.css`: 전체 디자인과 반응형 스타일
- `app/layout.tsx`: 사이트 제목과 공유 메타데이터
- `public/characters/ante-holstein.png`: 사용자 제공 대표 이미지 원본
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 배포
