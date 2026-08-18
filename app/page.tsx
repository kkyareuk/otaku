"use client";

import { useMemo, useRef, useState } from "react";

type ContentKind = "월드컵" | "테스트" | "자캐 콘텐츠";
type ModalName = "creator" | "preview" | "library" | "profile" | "prompt" | "worldcupPlay" | "testPlay" | null;

type Profile = { userId: string; nickname: string };
type WorldcupEntry = { id: string; name: string; description: string; image?: string };
type TestQuestion = { id: string; text: string; choiceA: string; choiceB: string };
type TestResults = { a: string; b: string };
type Draft = {
  id: string;
  kind: ContentKind;
  template: string;
  title: string;
  description: string;
  cover?: string;
  theme: string;
  entries?: WorldcupEntry[];
  questions?: TestQuestion[];
  results?: TestResults;
};

type PromptResult = {
  genre: string;
  relationship: string;
  mood: string;
  place: string;
  incident: string;
  line: string;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const heroImage = `${basePath}/characters/ante-holstein.png`;
const draftKey = "otaku-playground-drafts-v2";
const profileKey = "otaku-playground-profile";

const worldcupTemplates = ["최애 캐릭터 월드컵", "자캐 인기투표", "관계성·커플링 월드컵", "의상·표정·장면 고르기", "절대 못 참는 것 월드컵"];
const testTemplates = ["내 취향의 캐릭터 유형은?", "내가 이 세계관에 들어가면?", "나와 가장 잘 맞는 자캐는?", "내 취향의 관계성 조합", "판타지 길드에서 맡을 포지션", "나에게 어울리는 초능력·무기·속성", "나의 오타쿠 유형은?"];
const characterTemplates = ["자캐 프로필 카드", "익명 첫인상", "자캐 관계도", "자캐 케미 테스트", "랜덤 관계성", "대사·상황 가챠", "선관표·취향 빙고", "색상 팔레트"];
const themes = ["묵장미", "라일락", "낡은 서류", "미드나잇"];

const promptParts = {
  genre: ["고딕 판타지", "현대 오컬트", "동양풍 궁중극", "스페이스 오페라", "아포칼립스", "마법 학교", "느와르", "로맨스 판타지"],
  relationship: ["서로를 의심하는 동료", "오래 헤어진 소꿉친구", "주종이 뒤바뀐 계약 관계", "기억을 공유하는 숙적", "정체를 숨긴 구원자와 추적자", "서로만 살아남은 라이벌", "가짜 연인 행세를 하는 원수", "한쪽만 미래를 아는 동맹"],
  mood: ["비가 그친 직후의 서늘함", "파국 직전의 다정함", "들킬 듯 말 듯한 긴장", "되돌릴 수 없는 그리움", "웃음 아래 감춘 공포", "오래된 약속의 온기", "말하지 못한 질투", "평온해서 더 불길한 밤"],
  place: ["폐쇄된 야간 열차", "장미가 시들지 않는 온실", "봉인된 왕실 기록실", "해가 뜨지 않는 항구", "폐허가 된 놀이공원", "달의 뒷면 관측소", "눈보라 속 외딴 여관", "출입 금지된 지하 예배당"],
  incident: ["둘 중 한 명의 기억이 매일 사라진다", "거짓말을 하면 상대의 상처가 벌어진다", "자정마다 관계가 하루 전으로 되돌아간다", "서로의 꿈에서 같은 살인 사건을 목격한다", "한 명만 읽을 수 있는 유언장이 도착한다", "둘의 이름이 적힌 수배 전단이 도시 전역에 붙는다", "죽은 줄 알았던 인물에게서 초대장이 온다", "문을 열 때마다 서로 다른 세계가 나타난다"],
  line: ["“이번에도 나를 모르는 척할 거야?”", "“네가 기억하지 못해도, 나는 약속을 지킬 거야.”", "“도망쳐. 내가 아직 네 편일 때.”", "“처음부터 구하려던 건 세상이 아니었어.”", "“그 문을 열면 우리 중 하나는 돌아오지 못해.”", "“미워해도 좋아. 대신 내 곁에서 해.”"],
};

const portals = [
  { kind: "월드컵" as const, roman: "I", icon: "♛", title: "오타쿠형 월드컵", copy: "이미지와 설명을 등록하고 실제 대결을 진행해 최애를 가려요." },
  { kind: "테스트" as const, roman: "II", icon: "✦", title: "테스트 제작실", copy: "질문과 선택지, 결과를 직접 연결하고 완성된 테스트를 풀어요." },
  { kind: "자캐 콘텐츠" as const, roman: "III", icon: "♡", title: "자캐 기록 보관소", copy: "프로필, 첫인상, 관계도와 문답을 한 세계관 안에 쌓아요." },
];

const tools = [
  ["ID", "자캐 프로필 카드", "설정과 이미지를 한 장의 기록표로"],
  ["?", "익명 첫인상", "설명 없이 캐릭터의 첫 느낌 받기"],
  ["∞", "자캐 관계도", "관계와 감정선을 연결해 기록하기"],
  ["×", "자캐 케미 테스트", "둘의 성격으로 조합 살펴보기"],
  ["↻", "랜덤 관계성", "뜻밖의 관계와 사건을 뽑아보기"],
  ["✎", "대사·상황 가챠", "장면을 시작할 한 줄 얻기"],
  ["▦", "선관표·취향 빙고", "친구들과 채우는 양식 만들기"],
  ["◐", "색상 팔레트", "캐릭터의 분위기를 색으로 모으기"],
];

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function randomItem(items: string[]) {
  const number = crypto.getRandomValues(new Uint32Array(1))[0];
  return items[number % items.length];
}

function newEntry(index: number): WorldcupEntry {
  return { id: crypto.randomUUID(), name: `참가자 ${index}`, description: "" };
}

function newQuestion(index: number): TestQuestion {
  return { id: crypto.randomUUID(), text: `질문 ${index}`, choiceA: "첫 번째 선택", choiceB: "두 번째 선택" };
}

function Logo() {
  return <span className="brand"><span className="brand-seal">O</span><span><b>OTAKU</b><small>PLAYGROUND ARCHIVE</small></span></span>;
}

function RoseCluster({ className = "" }: { className?: string }) {
  return (
    <svg className={`rose-cluster ${className}`} viewBox="0 0 210 120" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 96C48 77 72 58 102 25M82 58C55 47 42 28 36 12M93 43c20 8 40 3 57-10M112 77c26-2 48 8 76 30" />
        <path d="M47 70c-24 0-29-19-29-19 19-5 32 5 29 19ZM62 55C49 37 58 23 58 23c18 9 19 24 4 32ZM129 40c5-19 23-21 23-21 4 19-7 31-23 21ZM148 87c16-13 32-5 32-5-6 18-21 22-32 5Z" fill="currentColor" opacity=".22" />
      </g>
      <g fill="currentColor">
        <circle cx="96" cy="58" r="26" opacity=".28" /><circle cx="84" cy="50" r="17" /><circle cx="108" cy="47" r="17" /><circle cx="109" cy="68" r="17" /><circle cx="86" cy="71" r="17" /><circle cx="97" cy="59" r="11" />
      </g>
    </svg>
  );
}

export default function Home() {
  const [modal, setModal] = useState<ModalName>(null);
  const [profile, setProfile] = useState<Profile | null>(() => readLocal<Profile | null>(profileKey, null));
  const [profileId, setProfileId] = useState("");
  const [nickname, setNickname] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>(() => readLocal<Draft[]>(draftKey, []));
  const [kind, setKind] = useState<ContentKind>("월드컵");
  const [template, setTemplate] = useState(worldcupTemplates[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [theme, setTheme] = useState(themes[0]);
  const [entries, setEntries] = useState<WorldcupEntry[]>([
    { id: "initial-a", name: "참가자 1", description: "" },
    { id: "initial-b", name: "참가자 2", description: "" },
  ]);
  const [questions, setQuestions] = useState<TestQuestion[]>([
    { id: "initial-question", text: "어떤 순간에 더 마음이 움직이나요?", choiceA: "말없이 곁을 지킬 때", choiceB: "위험을 무릅쓰고 달려올 때" },
  ]);
  const [results, setResults] = useState<TestResults>({ a: "서사에 끌리는 관찰자", b: "감정에 뛰어드는 모험가" });
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [tournamentQueue, setTournamentQueue] = useState<WorldcupEntry[]>([]);
  const [tournamentWinners, setTournamentWinners] = useState<WorldcupEntry[]>([]);
  const [champion, setChampion] = useState<WorldcupEntry | null>(null);
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testResult, setTestResult] = useState("");
  const [toast, setToast] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);

  const templateOptions = useMemo(() => kind === "월드컵" ? worldcupTemplates : kind === "테스트" ? testTemplates : characterTemplates, [kind]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const fileToData = (file: File, done: (value: string) => void) => {
    if (!file.type.startsWith("image/")) return notify("이미지 파일을 선택해 주세요.");
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const resetBuilder = (nextKind: ContentKind, nextTemplate?: string) => {
    const options = nextKind === "월드컵" ? worldcupTemplates : nextKind === "테스트" ? testTemplates : characterTemplates;
    setKind(nextKind);
    setTemplate(nextTemplate || options[0]);
    setTitle(""); setDescription(""); setCover(""); setTheme(themes[0]);
    setEntries([{ id: crypto.randomUUID(), name: "참가자 1", description: "" }, { id: crypto.randomUUID(), name: "참가자 2", description: "" }]);
    setQuestions([newQuestion(1)]);
    setResults({ a: "서사에 끌리는 관찰자", b: "감정에 뛰어드는 모험가" });
    setModal("creator");
  };

  const changeKind = (nextKind: ContentKind) => {
    const options = nextKind === "월드컵" ? worldcupTemplates : nextKind === "테스트" ? testTemplates : characterTemplates;
    setKind(nextKind); setTemplate(options[0]);
  };

  const saveProfile = () => {
    const cleanId = profileId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (cleanId.length < 3 || !nickname.trim()) return notify("아이디는 영문·숫자 세 글자 이상, 닉네임도 함께 적어주세요.");
    const next = { userId: cleanId, nickname: nickname.trim() };
    setProfile(next); window.localStorage.setItem(profileKey, JSON.stringify(next)); setModal(null); notify("내 프로필을 만들었어요.");
  };

  const updateEntry = (id: string, field: "name" | "description", value: string) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry));
  const updateEntryImage = (id: string, file?: File) => file && fileToData(file, (image) => setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, image } : entry)));
  const updateQuestion = (id: string, field: keyof Omit<TestQuestion, "id">, value: string) => setQuestions((current) => current.map((question) => question.id === id ? { ...question, [field]: value } : question));

  const validateDraft = () => {
    if (!title.trim()) return "제목을 적어주세요.";
    if (kind === "월드컵" && entries.filter((entry) => entry.name.trim()).length < 2) return "월드컵 참가자를 두 명 이상 적어주세요.";
    if (kind === "테스트" && questions.some((question) => !question.text.trim() || !question.choiceA.trim() || !question.choiceB.trim())) return "모든 질문과 선택지를 채워주세요.";
    return "";
  };

  const currentDraft = (): Draft => ({ id: crypto.randomUUID(), kind, template, title: title.trim(), description: description.trim(), cover: cover || undefined, theme, entries: kind === "월드컵" ? entries : undefined, questions: kind === "테스트" ? questions : undefined, results: kind === "테스트" ? results : undefined });

  const saveDraft = () => {
    const error = validateDraft(); if (error) return notify(error);
    const next = [currentDraft(), ...drafts];
    try { window.localStorage.setItem(draftKey, JSON.stringify(next)); setDrafts(next); setModal("library"); notify("내 보관함에 저장했어요."); }
    catch { notify("이미지가 너무 커서 저장하지 못했어요. 더 작은 이미지를 사용해 주세요."); }
  };

  const loadDraft = (draft: Draft) => {
    setKind(draft.kind); setTemplate(draft.template); setTitle(draft.title); setDescription(draft.description); setCover(draft.cover || ""); setTheme(draft.theme);
    if (draft.entries) setEntries(draft.entries); if (draft.questions) setQuestions(draft.questions); if (draft.results) setResults(draft.results);
    setModal("preview");
  };

  const startWorldcup = () => {
    const error = validateDraft(); if (error) return notify(error);
    const players = entries.filter((entry) => entry.name.trim());
    setTournamentQueue(players); setTournamentWinners([]); setChampion(null); setModal("worldcupPlay");
  };

  const chooseWinner = (winner: WorldcupEntry) => {
    const remaining = tournamentQueue.slice(2);
    const nextWinners = [...tournamentWinners, winner];
    if (remaining.length === 1) {
      const finalists = [...nextWinners, remaining[0]];
      setTournamentQueue(finalists); setTournamentWinners([]);
    } else if (remaining.length === 0) {
      if (nextWinners.length === 1) setChampion(nextWinners[0]);
      else { setTournamentQueue(nextWinners); setTournamentWinners([]); }
    } else {
      setTournamentQueue(remaining); setTournamentWinners(nextWinners);
    }
  };

  const startTest = () => {
    const error = validateDraft(); if (error) return notify(error);
    setTestIndex(0); setTestScore(0); setTestResult(""); setModal("testPlay");
  };

  const answerTest = (point: number) => {
    const score = testScore + point;
    if (testIndex + 1 >= questions.length) { setTestScore(score); setTestResult(score >= Math.ceil(questions.length / 2) ? results.a : results.b); }
    else { setTestScore(score); setTestIndex((value) => value + 1); }
  };

  const generatePrompt = () => {
    setPromptResult({ genre: randomItem(promptParts.genre), relationship: randomItem(promptParts.relationship), mood: randomItem(promptParts.mood), place: randomItem(promptParts.place), incident: randomItem(promptParts.incident), line: randomItem(promptParts.line) });
    setModal("prompt");
  };

  const copyPrompt = async () => {
    if (!promptResult) return;
    const text = `[${promptResult.genre}] ${promptResult.relationship}. ${promptResult.place}에서 ${promptResult.incident}. 분위기는 ${promptResult.mood}. 대사: ${promptResult.line}`;
    try { await navigator.clipboard.writeText(text); notify("연성 소재를 복사했어요."); } catch { notify("복사할 수 없어 화면의 문장을 선택해 주세요."); }
  };

  return (
    <main className="archive-site">
      <header className="topbar">
        <a href="#top"><Logo /></a>
        <nav><a href="#chambers">놀이터</a><a href="#tournament">월드컵</a><a href="#test-studio">테스트</a><button type="button" onClick={generatePrompt}>연성 소재</button><a href="#oc-archive">자캐 보관소</a></nav>
        <button className="profile-button" type="button" onClick={() => { setProfileId(profile?.userId || ""); setNickname(profile?.nickname || ""); setModal("profile"); }}><span>♙</span>{profile ? profile.nickname : "프로필 만들기"}</button>
        <button className="create-button" type="button" onClick={() => resetBuilder("월드컵")}>＋ 만들기</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-ornament top-ornament">⚜ ✦ ⚜</div>
        <div className="hero-copy">
          <p className="archive-label">THE CABINET OF IMAGINARY THINGS</p>
          <h1>취향과 설정을<br /><em>꺼내어 노는 곳.</em></h1>
          <p>최애를 겨루고, 테스트를 만들고, 자캐의 관계와 장면을 기록해요. 머릿속 이야기가 실제로 움직이는 오타쿠 전용 아카이브.</p>
          <div className="hero-actions"><button type="button" onClick={() => resetBuilder("월드컵")}>첫 콘텐츠 만들기 <span>↗</span></button><button type="button" onClick={generatePrompt}>연성 소재 뽑기 <span>✦</span></button></div>
          <div className="index-strip"><span>WORLD CUP</span><i /><span>TEST</span><i /><span>OC ARCHIVE</span><i /><span>PROMPT</span></div>
        </div>
        <div className="hero-art">
          <div className="frame-corner corner-a">⌜</div><div className="frame-corner corner-b">⌟</div>
          <div className="portrait-frame"><img src={heroImage} alt="사용자가 제공한 캐릭터 원본 이미지" /><div className="portrait-plaque"><small>ARCHIVE PORTRAIT</small><b>SUBJECT NO. 001</b></div></div>
          <div className="wax-seal"><span>O</span><small>PLAY</small></div>
          <RoseCluster className="hero-roses" />
          <div className="specimen-note">RELATION<br />UNKNOWN</div>
        </div>
      </section>

      <section className="chambers" id="chambers">
        <div className="section-heading"><p>CHOOSE A CHAMBER</p><h2>오늘 열어볼 <em>서랍</em></h2><span>원하는 메뉴를 고르면 제작 화면이 바로 열려요.</span></div>
        <div className="portal-grid">
          {portals.map((portal) => <button className="portal-card" type="button" key={portal.kind} onClick={() => resetBuilder(portal.kind)}><i>{portal.roman}</i><span className="portal-icon">{portal.icon}</span><small>{portal.kind}</small><h3>{portal.title}</h3><p>{portal.copy}</p><b>ENTER →</b></button>)}
          <button className="portal-card prompt-portal" type="button" onClick={generatePrompt}><i>IV</i><span className="portal-icon">✎</span><small>WRITING PROMPT</small><h3>연성 소재 추첨실</h3><p>장르·관계·장소·사건·대사를 한 번에 조합해 장면의 시작을 얻어요.</p><b>DRAW →</b></button>
        </div>
      </section>

      <section className="tournament-section" id="tournament">
        <div className="section-paper tournament-paper">
          <div className="paper-index">FILE / TOURNAMENT</div>
          <div className="tournament-copy"><p className="archive-label">OTAKU TOURNAMENT MAKER</p><h2>표지만이 아니라,<br /><em>진짜 대결까지.</em></h2><p>참가자마다 이름, 이미지, 설명을 등록하세요. 제작이 끝나면 바로 일대일 대결을 진행하고 마지막 우승자를 확인할 수 있어요.</p><ul><li>참가자 계속 추가</li><li>이미지 원본 업로드</li><li>대결 라운드 자동 진행</li><li>우승 결과 복사</li></ul><button type="button" onClick={() => resetBuilder("월드컵")}>월드컵 만들기 →</button></div>
          <div className="duel-preview"><div className="duel-card left"><span>A</span><b>CHARACTER</b></div><div className="versus-seal">VS</div><div className="duel-card right"><span>B</span><b>CHARACTER</b></div><small>CHOOSE YOUR FAVOURITE</small></div>
          <RoseCluster className="paper-roses" />
        </div>
      </section>

      <section className="test-section" id="test-studio">
        <div className="test-demo"><div className="demo-top"><span>QUESTION FILE</span><i>✦</i></div><div className="demo-progress"><b /><b /><b /></div><h3>어떤 순간에 더<br />마음이 움직이나요?</h3><button type="button">A 말없이 곁을 지킬 때</button><button type="button">B 위험을 무릅쓰고 달려올 때</button><div className="demo-result">RESULT <span>?</span></div></div>
        <div className="test-copy"><p className="archive-label">TEST STUDIO</p><h2>질문을 쓰고,<br />선택지를 잇고,<br /><em>결과를 보여줘요.</em></h2><p>질문을 원하는 만큼 추가하고 A·B 선택지를 직접 적어요. 결과 이름까지 설정하면 만든 자리에서 바로 테스트를 풀 수 있어요.</p><button type="button" onClick={() => resetBuilder("테스트")}>테스트 만들기 →</button></div>
      </section>

      <section className="prompt-section">
        <div className="prompt-card"><div className="prompt-pin">✦</div><small>WRITING MATERIAL DRAWER</small><h2>막힌 장면을 여는<br /><em>연성 소재 한 장</em></h2><p>관계 하나, 장소 하나, 사건 하나.<br />서로 어울리지 않을 것 같은 조합에서 이야기가 시작돼요.</p><button type="button" onClick={generatePrompt}>지금 한 장 뽑기 <span>↻</span></button></div>
        <div className="prompt-slips"><span>관계성</span><span>세계관</span><span>사건</span><span>분위기</span><span>대사</span><div className="quill">⌁</div></div>
      </section>

      <section className="oc-section" id="oc-archive">
        <div className="section-heading light"><p>ORIGINAL CHARACTER CABINET</p><h2>자캐 하나에서 이어지는 <em>기록들</em></h2><span>첫인상은 여러 서랍 중 하나예요.</span></div>
        <div className="tool-grid">{tools.map(([icon, name, copy]) => <button type="button" key={name} onClick={() => resetBuilder("자캐 콘텐츠", name)}><i>{icon}</i><span><b>{name}</b><small>{copy}</small></span><em>↗</em></button>)}</div>
      </section>

      <section className="closing"><RoseCluster className="closing-roses left" /><RoseCluster className="closing-roses right" /><p>MAKE YOUR FANDOM PLAYABLE</p><h2>비밀 서랍을 열고<br /><em>당신의 세계를 기록하세요.</em></h2><button type="button" onClick={() => resetBuilder("자캐 콘텐츠")}>새 기록 시작하기 →</button></section>

      <footer><Logo /><p>취향과 자캐가 콘텐츠가 되는 비밀 아카이브</p><div><button type="button" onClick={() => setModal("library")}>내 보관함</button><a href="#top">맨 위로</a></div></footer>

      <nav className="mobile-nav"><a href="#top"><span>⌂</span>홈</a><a href="#tournament"><span>♛</span>월드컵</a><button type="button" onClick={() => resetBuilder("월드컵")}><span>＋</span>만들기</button><button type="button" onClick={generatePrompt}><span>✎</span>소재</button><button type="button" onClick={() => setModal("library")}><span>▣</span>보관함</button></nav>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><section className={`modal ${modal}-modal`} role="dialog" aria-modal="true"><button className="modal-close" type="button" onClick={() => setModal(null)}>×</button>

        {modal === "profile" && <div className="profile-panel"><div className="modal-title"><p>IDENTITY CARD</p><h2>내 프로필 만들기</h2><span>이 브라우저에서 사용할 아이디와 닉네임을 정해요.</span></div><div className="identity-card"><div className="identity-photo">♙</div><label>아이디<input value={profileId} onChange={(event) => setProfileId(event.target.value)} placeholder="영문·숫자·밑줄" /></label><label>사용자 닉네임<input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="사이트에 표시할 이름" /></label><div className="identity-sign">OTAKU ARCHIVE MEMBER</div></div><button className="modal-primary" type="button" onClick={saveProfile}>{profile ? "프로필 수정하기" : "프로필 발급하기"} →</button></div>}

        {modal === "creator" && <div className="creator-panel"><div className="modal-title"><p>CONTENT WORKROOM</p><h2>{kind} 만들기</h2><span>겉표지부터 실제 플레이 내용까지 한 번에 작성해요.</span></div><div className="kind-tabs">{portals.map((portal) => <button className={kind === portal.kind ? "active" : ""} type="button" key={portal.kind} onClick={() => changeKind(portal.kind)}>{portal.icon} {portal.kind}</button>)}</div><div className="basic-fields"><label>템플릿<select value={template} onChange={(event) => setTemplate(event.target.value)}>{templateOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="콘텐츠 제목" /></label><label className="wide">소개<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="참여자에게 보여줄 소개" /></label><label>테마<select value={theme} onChange={(event) => setTheme(event.target.value)}>{themes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="cover-field">대표 표지<input ref={coverRef} type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && fileToData(event.target.files[0], setCover)} /><span>{cover ? "표지 선택됨" : "이미지 선택"}</span></label></div>
          {kind === "월드컵" && <div className="sub-builder"><div className="builder-title"><div><small>TOURNAMENT ENTRIES</small><h3>월드컵 참가자</h3></div><button type="button" onClick={() => setEntries((current) => [...current, newEntry(current.length + 1)])}>＋ 참가자 추가</button></div><div className="entry-grid">{entries.map((entry, index) => <article className="entry-editor" key={entry.id}><div className="entry-number">{String(index + 1).padStart(2,"0")}</div><label className="entry-image">{entry.image ? <img src={entry.image} alt="" /> : <span>＋ IMAGE</span>}<input type="file" accept="image/*" onChange={(event) => updateEntryImage(entry.id, event.target.files?.[0])} /></label><input value={entry.name} onChange={(event) => updateEntry(entry.id,"name",event.target.value)} placeholder="참가자 이름" /><textarea value={entry.description} onChange={(event) => updateEntry(entry.id,"description",event.target.value)} placeholder="설명·대사·태그" />{entries.length > 2 && <button type="button" onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}>삭제</button>}</article>)}</div></div>}
          {kind === "테스트" && <div className="sub-builder"><div className="builder-title"><div><small>QUESTIONS & RESULTS</small><h3>질문과 선택지</h3></div><button type="button" onClick={() => setQuestions((current) => [...current, newQuestion(current.length + 1)])}>＋ 질문 추가</button></div><div className="question-list">{questions.map((question,index) => <article key={question.id}><i>Q{index+1}</i><input value={question.text} onChange={(event) => updateQuestion(question.id,"text",event.target.value)} placeholder="질문" /><div><input value={question.choiceA} onChange={(event) => updateQuestion(question.id,"choiceA",event.target.value)} placeholder="A 선택지" /><input value={question.choiceB} onChange={(event) => updateQuestion(question.id,"choiceB",event.target.value)} placeholder="B 선택지" /></div>{questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}>질문 삭제</button>}</article>)}</div><div className="result-fields"><label>A가 많을 때 결과<input value={results.a} onChange={(event) => setResults({...results,a:event.target.value})} /></label><label>B가 많을 때 결과<input value={results.b} onChange={(event) => setResults({...results,b:event.target.value})} /></label></div></div>}
          {kind === "자캐 콘텐츠" && <div className="oc-builder-note"><span>OC</span><div><b>{template}</b><p>자캐 콘텐츠의 세부 편집 항목은 선택한 템플릿에 맞춰 다음 단계에서 확장됩니다. 지금은 제목·소개·표지와 테마를 저장할 수 있어요.</p></div></div>}
          <div className="modal-actions"><button type="button" onClick={() => setModal("preview")}>미리보기</button><button type="button" onClick={saveDraft}>보관함 저장</button><button className="modal-primary" type="button" onClick={() => kind === "월드컵" ? startWorldcup() : kind === "테스트" ? startTest() : setModal("preview")}>{kind === "월드컵" ? "대결 시작" : kind === "테스트" ? "테스트 풀기" : "완성 보기"} →</button></div></div>}

        {modal === "preview" && <div className="preview-panel"><button className="back-edit" type="button" onClick={() => setModal("creator")}>← 편집으로</button><div className={`content-preview theme-${themes.indexOf(theme)}`}><div className="preview-cover">{cover ? <img src={cover} alt="콘텐츠 표지" /> : <span>{kind === "월드컵" ? "VS" : kind === "테스트" ? "✦" : "OC"}</span>}</div><div><small>{kind} / {template}</small><h2>{title || "제목을 입력해 주세요"}</h2><p>{description || "소개가 이곳에 표시됩니다."}</p>{kind === "월드컵" && <b>{entries.filter((entry) => entry.name.trim()).map((entry) => entry.name).join(" · ")}</b>}{kind === "테스트" && <b>{questions.length}개의 질문</b>}</div></div><div className="modal-actions"><button type="button" onClick={() => setModal("creator")}>계속 편집</button><button type="button" onClick={saveDraft}>보관함 저장</button><button className="modal-primary" type="button" onClick={() => kind === "월드컵" ? startWorldcup() : kind === "테스트" ? startTest() : notify("미리보기가 완성됐어요.")}>플레이 →</button></div></div>}

        {modal === "worldcupPlay" && <div className="play-panel"><div className="modal-title"><p>LIVE TOURNAMENT</p><h2>{champion ? "최종 우승" : title || "월드컵 대결"}</h2><span>{champion ? "당신의 선택이 끝났어요." : "더 마음에 드는 쪽을 선택하세요."}</span></div>{champion ? <div className="champion-card">{champion.image ? <img src={champion.image} alt="우승자" /> : <span>♛</span>}<small>CHAMPION</small><h3>{champion.name}</h3><p>{champion.description}</p><button type="button" onClick={() => { void navigator.clipboard.writeText(`${title} 우승: ${champion.name}`); notify("우승 결과를 복사했어요."); }}>결과 복사</button></div> : <div className="match-grid">{tournamentQueue.slice(0,2).map((entry) => <button type="button" key={entry.id} onClick={() => chooseWinner(entry)}>{entry.image ? <img src={entry.image} alt={entry.name} /> : <span>{entry.name.slice(0,1)}</span>}<h3>{entry.name}</h3><p>{entry.description || "이 참가자를 선택하기"}</p></button>)}<i>VS</i></div>}</div>}

        {modal === "testPlay" && <div className="play-panel"><div className="modal-title"><p>LIVE TEST</p><h2>{title || "취향 테스트"}</h2><span>{testResult ? "결과가 도착했어요." : `${testIndex+1} / ${questions.length}`}</span></div>{testResult ? <div className="test-result-card"><span>✦</span><small>YOUR RESULT</small><h3>{testResult}</h3><p>{description || "당신의 선택이 만든 결과예요."}</p><button type="button" onClick={() => { setTestIndex(0); setTestScore(0); setTestResult(""); }}>다시 풀기</button></div> : <div className="live-question"><i>QUESTION {testIndex+1}</i><h3>{questions[testIndex]?.text}</h3><button type="button" onClick={() => answerTest(1)}>A {questions[testIndex]?.choiceA}</button><button type="button" onClick={() => answerTest(0)}>B {questions[testIndex]?.choiceB}</button></div>}</div>}

        {modal === "prompt" && <div className="prompt-panel"><div className="modal-title"><p>WRITING MATERIAL DRAW</p><h2>연성 소재 한 장</h2><span>마음에 들지 않으면 몇 번이든 다시 뽑을 수 있어요.</span></div>{promptResult && <div className="drawn-prompt"><div className="prompt-meta"><span>{promptResult.genre}</span><span>{promptResult.mood}</span></div><h3>{promptResult.relationship}</h3><p><b>장소</b>{promptResult.place}</p><p><b>사건</b>{promptResult.incident}</p><blockquote>{promptResult.line}</blockquote><div className="prompt-stamp">DRAWN<br />FOR YOU</div></div>}<div className="modal-actions"><button type="button" onClick={generatePrompt}>다시 뽑기 ↻</button><button className="modal-primary" type="button" onClick={() => void copyPrompt()}>소재 복사 →</button></div></div>}

        {modal === "library" && <div className="library-panel"><div className="modal-title"><p>PRIVATE CABINET</p><h2>{profile ? `${profile.nickname}의 보관함` : "내 보관함"}</h2><span>이 브라우저에 저장한 콘텐츠 초안이에요.</span></div>{drafts.length ? <div className="draft-list">{drafts.map((draft) => <article key={draft.id}>{draft.cover ? <img src={draft.cover} alt="" /> : <span>{draft.kind === "월드컵" ? "VS" : draft.kind === "테스트" ? "✦" : "OC"}</span>}<div><small>{draft.kind} / {draft.template}</small><h3>{draft.title}</h3><p>{draft.description || "소개 없음"}</p></div><button type="button" onClick={() => loadDraft(draft)}>열기</button><button type="button" onClick={() => { const next=drafts.filter((item)=>item.id!==draft.id); setDrafts(next); window.localStorage.setItem(draftKey,JSON.stringify(next)); }}>삭제</button></article>)}</div> : <div className="empty-library"><span>□</span><h3>아직 보관한 기록이 없어요.</h3><p>월드컵이나 테스트를 만들어 첫 기록을 남겨보세요.</p><button type="button" onClick={() => resetBuilder("월드컵")}>새 콘텐츠 만들기</button></div>}</div>}
      </section></div>}

      {toast && <div className="toast" role="status">✦ {toast}</div>}
    </main>
  );
}
