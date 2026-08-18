"use client";

import { useMemo, useRef, useState } from "react";

type ContentKind = "월드컵" | "테스트" | "자캐 콘텐츠";
type ModalName = "creator" | "preview" | "library" | null;

type Draft = {
  id: string;
  kind: ContentKind;
  template: string;
  title: string;
  theme: string;
  cover?: string;
  prompt: string;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const heroImage = `${basePath}/characters/ante-holstein.png`;

const pillars = [
  {
    kind: "월드컵" as const,
    kicker: "OTAKU TOURNAMENT",
    title: "오타쿠형 월드컵",
    description: "최애, 자캐, 관계성, 의상과 장면까지. 오타쿠가 고르기 즐거운 대결을 만들어요.",
    icon: "♛",
    color: "violet",
    tags: ["최애 캐릭터", "자캐 인기투표", "관계성", "의상·표정"],
  },
  {
    kind: "테스트" as const,
    kicker: "EASY TEST MAKER",
    title: "초간단 테스트 제작기",
    description: "오타쿠용 템플릿을 고르고 질문과 결과만 채우면 나만의 테스트가 완성돼요.",
    icon: "✦",
    color: "coral",
    tags: ["취향 유형", "세계관 포지션", "케미", "속성·무기"],
  },
  {
    kind: "자캐 콘텐츠" as const,
    kicker: "ORIGINAL CHARACTER LAB",
    title: "자캐 콘텐츠 연구실",
    description: "프로필부터 관계도, 문답, 룰렛까지. 캐릭터를 한 번 등록해 여러 놀이에 활용해요.",
    icon: "♡",
    color: "lime",
    tags: ["프로필 카드", "첫인상표", "관계도", "상황 가챠"],
  },
];

const worldcupIdeas = [
  { title: "최애 캐릭터 월드컵", copy: "작품과 장르를 넘나들며 최애를 끝까지 골라요.", icon: "♥" },
  { title: "자캐 인기투표", copy: "내 세계관의 캐릭터를 한자리에 모아 대결해요.", icon: "OC" },
  { title: "관계성·커플링 월드컵", copy: "서사와 케미 설명을 함께 읽고 관계성을 골라요.", icon: "∞" },
  { title: "의상·표정·장면 고르기", copy: "그림과 대사, 장면 설명을 나란히 비교해요.", icon: "✣" },
  { title: "절대 못 참는 것 월드컵", copy: "내 자캐의 취향과 금기를 선택지로 풀어봐요.", icon: "!" },
];

const testTemplates = [
  "내 취향의 캐릭터 유형은?",
  "내가 이 세계관에 들어가면?",
  "나와 가장 잘 맞는 자캐는?",
  "내 자캐의 첫인상과 실제 성격",
  "당신을 집착할 것 같은 캐릭터",
  "내 취향의 관계성 조합",
  "판타지 길드에서 맡을 포지션",
  "나에게 어울리는 초능력·무기·속성",
  "나의 오타쿠 유형은?",
];

const characterTools = [
  { title: "자캐 프로필 카드", copy: "설정과 이미지를 보기 좋은 한 장으로", glyph: "ID", tone: "purple" },
  { title: "익명 첫인상", copy: "설명을 숨기고 캐릭터의 첫 느낌 받기", glyph: "?", tone: "pink" },
  { title: "자캐 관계도", copy: "같은 세계관의 관계와 감정선 연결하기", glyph: "↗", tone: "blue" },
  { title: "자캐끼리 케미 테스트", copy: "둘의 성격과 설정으로 조합 살펴보기", glyph: "×", tone: "yellow" },
  { title: "랜덤 관계성 뽑기", copy: "두 캐릭터 사이에 새로운 관계 부여하기", glyph: "∞", tone: "lime" },
  { title: "대사·상황 가챠", copy: "대사와 사건을 뽑아 장면 상상하기", glyph: "↻", tone: "coral" },
  { title: "선관표·취향 빙고", copy: "친구들과 채우고 공유하는 양식 만들기", glyph: "▦", tone: "purple" },
  { title: "색상 팔레트", copy: "캐릭터의 분위기를 색으로 모아보기", glyph: "◐", tone: "blue" },
];

const themes = [
  { name: "라일락", className: "theme-lilac" },
  { name: "체리소다", className: "theme-cherry" },
  { name: "라임노트", className: "theme-lime" },
  { name: "미드나잇", className: "theme-night" },
];

function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">O!</span>
      <span>오타쿠놀이터</span>
    </span>
  );
}

export default function Home() {
  const [modal, setModal] = useState<ModalName>(null);
  const [kind, setKind] = useState<ContentKind>("월드컵");
  const [template, setTemplate] = useState(worldcupIdeas[0].title);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState(themes[0].name);
  const [cover, setCover] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = window.localStorage.getItem("otaku-playground-drafts");
      return saved ? JSON.parse(saved) as Draft[] : [];
    } catch {
      return [];
    }
  });
  const [toast, setToast] = useState("");
  const [testPick, setTestPick] = useState(testTemplates[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const templateOptions = useMemo(() => {
    if (kind === "월드컵") return worldcupIdeas.map((item) => item.title);
    if (kind === "테스트") return testTemplates;
    return characterTools.map((item) => item.title);
  }, [kind]);

  const openCreator = (nextKind: ContentKind, nextTemplate?: string) => {
    const fallback = nextKind === "월드컵" ? worldcupIdeas[0].title : nextKind === "테스트" ? testTemplates[0] : characterTools[0].title;
    setKind(nextKind);
    setTemplate(nextTemplate || fallback);
    setTitle("");
    setPrompt("");
    setCover("");
    setTheme(themes[0].name);
    setModal("creator");
  };

  const handleKindChange = (nextKind: ContentKind) => {
    setKind(nextKind);
    setTemplate(nextKind === "월드컵" ? worldcupIdeas[0].title : nextKind === "테스트" ? testTemplates[0] : characterTools[0].title);
  };

  const handleCover = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("이미지 파일을 골라주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCover(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const saveDraft = () => {
    if (!title.trim()) {
      notify("콘텐츠 제목을 먼저 적어주세요.");
      return;
    }
    const draft: Draft = {
      id: crypto.randomUUID(),
      kind,
      template,
      title: title.trim(),
      theme,
      cover: cover || undefined,
      prompt: prompt.trim(),
    };
    const next = [draft, ...drafts];
    setDrafts(next);
    window.localStorage.setItem("otaku-playground-drafts", JSON.stringify(next));
    setModal("library");
    notify("이 브라우저의 내 보관함에 저장했어요.");
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((draft) => draft.id !== id);
    setDrafts(next);
    window.localStorage.setItem("otaku-playground-drafts", JSON.stringify(next));
    notify("임시저장을 삭제했어요.");
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <a href="#top" aria-label="오타쿠놀이터 홈"><Logo /></a>
        <nav className="nav-links" aria-label="주요 메뉴">
          <a href="#play">놀거리</a>
          <a href="#worldcup">월드컵</a>
          <a href="#test-maker">테스트 제작</a>
          <a href="#character-lab">자캐 연구실</a>
        </nav>
        <button className="archive-button" type="button" onClick={() => setModal("library")}>내 보관함</button>
        <button className="make-button" type="button" onClick={() => openCreator("월드컵")}><span>＋</span> 만들기</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">WELCOME TO OTAKU PLAYGROUND</p>
          <h1>취향이 곧<br /><em>놀거리</em>가 되는 곳.</h1>
          <p className="hero-description">최애를 고르고, 테스트를 만들고, 자캐의 새로운 관계성을 발견해요. 오타쿠의 상상을 콘텐츠로 바꾸는 작은 놀이터.</p>
          <div className="hero-actions">
            <button className="primary-action" type="button" onClick={() => openCreator("테스트")}>내 콘텐츠 만들기 <span>↗</span></button>
            <a className="secondary-action" href="#play">놀거리 둘러보기 <span>↓</span></a>
          </div>
          <div className="hero-keywords" aria-label="주요 콘텐츠">
            <span>#월드컵</span><span>#심리테스트</span><span>#자캐문답</span><span>#관계성</span><span>#룰렛</span>
          </div>
        </div>

        <div className="hero-stage" aria-label="오타쿠놀이터 대표 이미지">
          <div className="hero-orbit orbit-a">관계성 룰렛 <b>↻</b></div>
          <div className="hero-orbit orbit-b">자캐 첫인상 <b>?</b></div>
          <div className="hero-image-card">
            <div className="card-tape" />
            <div className="hero-image-frame">
              <img src={heroImage} alt="사용자가 제공한 캐릭터 원본 이미지" />
            </div>
            <div className="hero-card-caption">
              <div><small>FEATURED CHARACTER</small><b>오늘의 상상 재료</b></div>
              <span>✦</span>
            </div>
          </div>
          <div className="hero-ticket"><small>NOW PLAYING</small><b>최애 월드컵</b><span>VS</span></div>
          <div className="hero-spark">✦</div>
        </div>
      </section>

      <section className="play-section" id="play">
        <div className="section-title">
          <div><p className="eyebrow">PICK YOUR PLAY</p><h2>오늘은 뭐 하고 <em>놀까?</em></h2></div>
          <p>하나만 고르지 않아도 괜찮아요.<br />만들고, 참여하고, 자캐에 계속 이어 붙여요.</p>
        </div>
        <div className="pillar-grid">
          {pillars.map((pillar) => (
            <article className={`pillar-card ${pillar.color}`} key={pillar.kind}>
              <div className="pillar-head"><span>{pillar.kicker}</span><b>{pillar.icon}</b></div>
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
              <div className="tag-cloud">{pillar.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <button type="button" onClick={() => openCreator(pillar.kind)}>이걸로 만들기 <span>→</span></button>
            </article>
          ))}
        </div>
      </section>

      <section className="worldcup-section" id="worldcup">
        <div className="worldcup-intro">
          <p className="eyebrow">OTAKU TOURNAMENT</p>
          <h2>고르는 순간까지<br /><em>오타쿠답게.</em></h2>
          <p>캐릭터 설명, 대사, 태그와 작품 링크를 함께 붙이고 스포일러와 민감한 콘텐츠는 가려둘 수 있어요. 꼭 하나를 버릴 수 없다면 ‘둘 다 데려가기’도 선택해요.</p>
          <div className="feature-chips"><span>일대일 대결</span><span>여럿 비교</span><span>스포일러 가림</span><span>결과 카드</span></div>
          <button type="button" onClick={() => openCreator("월드컵")}>월드컵 초안 만들기 <span>↗</span></button>
        </div>
        <div className="worldcup-list">
          {worldcupIdeas.map((idea, index) => (
            <button type="button" key={idea.title} onClick={() => openCreator("월드컵", idea.title)}>
              <i>{String(index + 1).padStart(2, "0")}</i><b>{idea.icon}</b><span><strong>{idea.title}</strong><small>{idea.copy}</small></span><em>↗</em>
            </button>
          ))}
        </div>
      </section>

      <section className="test-section" id="test-maker">
        <div className="test-builder">
          <div className="builder-browser">
            <div className="browser-dots"><i /><i /><i /><span>TEST TEMPLATE LIBRARY</span></div>
            <div className="template-list">
              {testTemplates.map((item) => <button className={testPick === item ? "active" : ""} type="button" key={item} onClick={() => setTestPick(item)}><span>✦</span>{item}<b>→</b></button>)}
            </div>
          </div>
          <div className="template-preview">
            <p>선택한 템플릿</p>
            <div className="preview-sticker">OTAKU<br />TYPE</div>
            <h3>{testPick}</h3>
            <p>질문과 선택지를 내 세계관에 맞게 바꾸고 결과 캐릭터를 연결해 보세요.</p>
            <div className="fake-choice"><span>A</span>첫 번째 선택지</div>
            <div className="fake-choice"><span>B</span>두 번째 선택지</div>
            <button type="button" onClick={() => openCreator("테스트", testPick)}>이 템플릿 사용하기</button>
          </div>
        </div>
        <div className="test-copy">
          <p className="eyebrow">EASY TEST MAKER</p>
          <h2>어려운 분기표 대신,<br /><em>템플릿부터.</em></h2>
          <ol>
            <li><i>01</i><span><b>표지와 제목</b><small>콘텐츠의 첫인상을 정해요.</small></span></li>
            <li><i>02</i><span><b>질문과 선택지</b><small>내 말투와 세계관으로 바꿔요.</small></span></li>
            <li><i>03</i><span><b>결과 캐릭터</b><small>성격, 포지션, 속성을 연결해요.</small></span></li>
            <li><i>04</i><span><b>색상과 테마</b><small>공유하고 싶은 모습으로 꾸며요.</small></span></li>
          </ol>
        </div>
      </section>

      <section className="character-section" id="character-lab">
        <div className="section-title">
          <div><p className="eyebrow">ORIGINAL CHARACTER LAB</p><h2>자캐 하나로 이어지는 <em>놀이들</em></h2></div>
          <p>첫인상은 그중 하나예요.<br />프로필, 관계, 대사와 설정을 여러 콘텐츠로 확장해요.</p>
        </div>
        <div className="tool-grid">
          {characterTools.map((tool) => (
            <button type="button" className="tool-card" key={tool.title} onClick={() => openCreator("자캐 콘텐츠", tool.title)}>
              <span className={`tool-glyph ${tool.tone}`}>{tool.glyph}</span>
              <span><b>{tool.title}</b><small>{tool.copy}</small></span><em>↗</em>
            </button>
          ))}
        </div>
        <div className="character-collection">
          <div className="collection-visual">
            <div className="mini-card card-a"><span>캐릭터 A</span><b>PROFILE</b></div>
            <div className="mini-card card-b"><span>캐릭터 B</span><b>RELATION</b></div>
            <div className="mini-card card-c"><span>세계관</span><b>COLLECTION</b></div>
            <div className="connection-line" />
          </div>
          <div><p className="eyebrow">ONE CHARACTER, MANY STORIES</p><h3>한 번 만든 캐릭터를<br />다음 놀이에도 계속.</h3><p>같은 세계관의 캐릭터를 묶고, 공개할 설정과 혼자 볼 설정을 나누고, 원하는 콘텐츠에 다시 불러오는 구조로 확장할 수 있어요.</p><button type="button" onClick={() => openCreator("자캐 콘텐츠", "자캐 프로필 카드")}>캐릭터 카드 시작하기 →</button></div>
        </div>
      </section>

      <section className="closing-section">
        <span className="closing-star">✦</span><span className="closing-heart">♡</span>
        <p>MAKE YOUR FANDOM PLAYABLE</p>
        <h2>머릿속 설정을 꺼내<br /><em>같이 노는 콘텐츠</em>로.</h2>
        <button type="button" onClick={() => openCreator("자캐 콘텐츠")}>내 놀이터 만들기 <span>↗</span></button>
      </section>

      <footer>
        <Logo /><p>취향과 자캐가 콘텐츠가 되는 곳</p>
        <div><a href="#top">맨 위로</a><button type="button" onClick={() => setModal("library")}>내 보관함</button></div>
      </footer>

      <nav className="mobile-nav" aria-label="모바일 메뉴">
        <a href="#top"><span>⌂</span>홈</a><a href="#worldcup"><span>♛</span>월드컵</a>
        <button type="button" className="mobile-create" onClick={() => openCreator("테스트")}><span>＋</span>만들기</button>
        <a href="#character-lab"><span>♡</span>자캐</a><button type="button" onClick={() => setModal("library")}><span>▣</span>보관함</button>
      </nav>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
          <section className={`modal ${modal === "creator" ? "creator-modal" : modal === "preview" ? "preview-modal" : "library-modal"}`} role="dialog" aria-modal="true" aria-label={modal === "creator" ? "콘텐츠 만들기" : modal === "preview" ? "콘텐츠 미리보기" : "내 보관함"}>
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="닫기">×</button>

            {modal === "creator" && (
              <>
                <div className="creator-heading"><p className="eyebrow">QUICK CREATOR</p><h2>내 콘텐츠 <em>초안 만들기</em></h2><p>종류와 템플릿을 고르고 제목과 표지만 넣어도 초안을 저장할 수 있어요.</p></div>
                <div className="kind-tabs">{pillars.map((item) => <button className={kind === item.kind ? "active" : ""} type="button" key={item.kind} onClick={() => handleKindChange(item.kind)}>{item.icon} {item.kind}</button>)}</div>
                <div className="creator-grid">
                  <div className="creator-form">
                    <label>템플릿<select value={template} onChange={(event) => setTemplate(event.target.value)}>{templateOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
                    <label>콘텐츠 제목<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 내 세계관 최강자는 누구?" maxLength={60} /></label>
                    <label>소개 또는 첫 질문<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="참여자에게 보여줄 설명이나 첫 질문을 적어보세요." maxLength={180} /></label>
                    <fieldset><legend>색상 테마</legend><div className="theme-row">{themes.map((item) => <button className={`${item.className} ${theme === item.name ? "active" : ""}`} type="button" key={item.name} onClick={() => setTheme(item.name)} aria-label={`${item.name} 테마`}><span />{item.name}</button>)}</div></fieldset>
                  </div>
                  <div className="cover-column">
                    <input ref={fileRef} className="file-input" type="file" accept="image/*" onChange={(event) => handleCover(event.target.files?.[0])} />
                    <button className="cover-upload" type="button" onClick={() => fileRef.current?.click()}>{cover ? <img src={cover} alt="선택한 표지 미리보기" /> : <><span>＋</span><b>표지 이미지 고르기</b><small>PNG · JPG · WEBP</small></>}</button>
                    <p>선택한 이미지는 이 브라우저의 초안 미리보기에 사용됩니다.</p>
                  </div>
                </div>
                <div className="creator-actions"><button type="button" onClick={() => setModal("preview")}>미리보기</button><button type="button" className="save-button" onClick={saveDraft}>내 보관함에 저장 <span>→</span></button></div>
              </>
            )}

            {modal === "preview" && (
              <>
                <div className="preview-top"><button type="button" onClick={() => setModal("creator")}>← 편집으로</button><span>PREVIEW</span></div>
                <div className={`content-preview ${themes.find((item) => item.name === theme)?.className || themes[0].className}`}>
                  <div className="preview-cover">{cover ? <img src={cover} alt="콘텐츠 표지" /> : <span>{kind === "월드컵" ? "VS" : kind === "테스트" ? "✦" : "OC"}</span>}</div>
                  <div className="preview-content"><small>{kind} · {template}</small><h2>{title || "아직 제목을 적지 않았어요"}</h2><p>{prompt || "소개나 첫 질문을 적으면 이곳에 표시됩니다."}</p><button type="button">시작하기 →</button></div>
                </div>
                <div className="creator-actions"><button type="button" onClick={() => setModal("creator")}>계속 편집하기</button><button className="save-button" type="button" onClick={saveDraft}>이 초안 저장하기</button></div>
              </>
            )}

            {modal === "library" && (
              <>
                <div className="library-heading"><p className="eyebrow">MY LOCAL ARCHIVE</p><h2>내 보관함</h2><p>현재 브라우저에 임시 저장한 콘텐츠예요.</p></div>
                {drafts.length ? <div className="draft-list">{drafts.map((draft) => <article key={draft.id}>{draft.cover ? <img src={draft.cover} alt="" /> : <span>{draft.kind === "월드컵" ? "VS" : draft.kind === "테스트" ? "✦" : "OC"}</span>}<div><small>{draft.kind} · {draft.template}</small><h3>{draft.title}</h3><p>{draft.prompt || "소개를 아직 적지 않았어요."}</p></div><button type="button" onClick={() => deleteDraft(draft.id)}>삭제</button></article>)}</div> : <div className="empty-library"><span>□</span><h3>아직 저장한 초안이 없어요.</h3><p>원하는 놀거리를 골라 첫 콘텐츠를 만들어 보세요.</p><button type="button" onClick={() => openCreator("테스트")}>콘텐츠 만들기</button></div>}
              </>
            )}
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status">✦ {toast}</div>}
    </main>
  );
}
