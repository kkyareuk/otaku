"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { firebaseConfigured, getFirebaseAuth } from "@/lib/firebase";

type ContentKind = "월드컵" | "테스트" | "자캐 콘텐츠";
type ModalName = "creator" | "preview" | "library" | "account" | "loginHelp" | "prompt" | "worldcupPlay" | "testPlay" | null;
type TestMode = "variable" | "mbti";
type WorldcupEntry = { id: string; name: string; description: string; image?: string };
type ScoreLink = { id: string; variable: string; score: number };
type TestChoice = { id: string; text: string; links: ScoreLink[] };
type TestQuestion = { id: string; text: string; choices: TestChoice[] };
type TestResult = { id: string; key: string; title: string; description: string };
type Draft = {
  id: string; kind: ContentKind; template: string; title: string; description: string; cover?: string; theme: string;
  entries?: WorldcupEntry[]; testMode?: TestMode; questions?: TestQuestion[]; results?: TestResult[]; mbtiLabels?: Record<string, string>;
};
type PromptResult = { genre: string; relationship: string; mood: string; place: string; incident: string; line: string };
type PlayedResult = { code: string; title: string; description: string };

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const heroImage = `${basePath}/characters/ante-holstein.png`;
const draftKey = "otaku-playground-drafts-v3";
const worldcupTemplates = ["최애 캐릭터 월드컵", "자캐 인기투표", "관계성·커플링 월드컵", "의상·표정·장면 고르기"];
const testTemplates = ["내 취향의 캐릭터 유형은?", "내가 이 세계관에 들어가면?", "나와 가장 잘 맞는 자캐는?", "내 취향의 관계성 조합", "나의 오타쿠 유형은?"];
const characterTemplates = ["자캐 프로필 카드", "익명 첫인상", "자캐 관계도", "자캐 케미 테스트", "랜덤 관계성", "대사·상황 가챠", "선관표·취향 빙고", "색상 팔레트"];
const themes = ["라일락", "피치", "민트", "나이트"];
const mbtiVariables = ["E", "I", "S", "N", "T", "F", "J", "P"];
const mbtiTypes = ["ISTJ","ISFJ","INFJ","INTJ","ISTP","ISFP","INFP","INTP","ESTP","ESFP","ENFP","ENTP","ESTJ","ESFJ","ENFJ","ENTJ"];
const promptParts = {
  genre: ["고딕 판타지", "현대 오컬트", "동양풍 궁중극", "스페이스 오페라", "아포칼립스", "마법 학교", "느와르", "로맨스 판타지"],
  relationship: ["서로를 의심하는 동료", "오래 헤어진 소꿉친구", "주종이 뒤바뀐 계약 관계", "기억을 공유하는 숙적", "정체를 숨긴 구원자와 추적자", "가짜 연인 행세를 하는 원수"],
  mood: ["비가 그친 직후의 서늘함", "파국 직전의 다정함", "들킬 듯 말 듯한 긴장", "되돌릴 수 없는 그리움", "웃음 아래 감춘 공포", "오래된 약속의 온기"],
  place: ["폐쇄된 야간 열차", "장미가 시들지 않는 온실", "봉인된 왕실 기록실", "해가 뜨지 않는 항구", "폐허가 된 놀이공원", "눈보라 속 외딴 여관"],
  incident: ["둘 중 한 명의 기억이 매일 사라진다", "거짓말을 하면 상대의 상처가 벌어진다", "자정마다 관계가 하루 전으로 되돌아간다", "한 명만 읽을 수 있는 유언장이 도착한다", "죽은 줄 알았던 인물에게서 초대장이 온다"],
  line: ["“이번에도 나를 모르는 척할 거야?”", "“네가 기억하지 못해도, 나는 약속을 지킬 거야.”", "“도망쳐. 내가 아직 네 편일 때.”", "“처음부터 구하려던 건 세상이 아니었어.”", "“그 문을 열면 우리 중 하나는 돌아오지 못해.”"],
};

function uid() { return crypto.randomUUID(); }
function randomItem(items: string[]) { return items[crypto.getRandomValues(new Uint32Array(1))[0] % items.length]; }
function defaultResults(): TestResult[] { return [
  { id: "result-a", key: "A", title: "서사를 지키는 관찰자", description: "천천히 맥락을 읽고 오래 기억하는 타입" },
  { id: "result-b", key: "B", title: "감정에 뛰어드는 주인공", description: "마음이 움직이면 곧장 장면 속으로 들어가는 타입" },
  { id: "result-c", key: "C", title: "관계를 엮는 설계자", description: "인물 사이의 감정선과 조합을 사랑하는 타입" },
  { id: "result-d", key: "D", title: "설정을 파고드는 탐험가", description: "세계의 규칙과 숨은 설정을 끝까지 찾아가는 타입" },
]; }
function defaultMbtiLabels() { return Object.fromEntries(mbtiTypes.map((code) => [code, `${code}형 오타쿠`])); }
function defaultQuestions(mode: TestMode): TestQuestion[] {
  if (mode === "mbti") return [{ id: "q-mbti", text: "새 장르에 입덕했을 때 나는?", choices: [
    { id: "c-e", text: "친구를 불러 함께 이야기한다", links: [{ id: "l-e", variable: "E", score: 1 }] },
    { id: "c-i", text: "혼자 조용히 자료부터 모은다", links: [{ id: "l-i", variable: "I", score: 1 }] },
  ] }];
  return [{ id: "q-variable", text: "가장 먼저 마음이 가는 장면은?", choices: [
    { id: "c-b", text: "위험을 무릅쓰고 달려오는 장면", links: [{ id: "l-b", variable: "B", score: 2 }] },
    { id: "c-d", text: "오래된 비밀이 드러나는 장면", links: [{ id: "l-d", variable: "D", score: 2 }] },
  ] }];
}
function newWorldcupEntry(index: number): WorldcupEntry { return { id: uid(), name: `참가자 ${index}`, description: "" }; }
function newChoice(variable: string, index: number): TestChoice { return { id: uid(), text: `선택지 ${index}`, links: [{ id: uid(), variable, score: 1 }] }; }
function newQuestion(mode: TestMode, index: number): TestQuestion { return { id: uid(), text: `질문 ${index}`, choices: [newChoice(mode === "mbti" ? "E" : "A", 1), newChoice(mode === "mbti" ? "I" : "B", 2)] }; }
function Logo() { return <span className="brand"><span>O</span><b>오타쿠놀이터</b></span>; }
function readDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(draftKey) || "[]") as Draft[]; } catch { return []; }
}

export default function Home() {
  const [modal, setModal] = useState<ModalName>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>(readDrafts);
  const [kind, setKind] = useState<ContentKind>("월드컵");
  const [template, setTemplate] = useState(worldcupTemplates[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [theme, setTheme] = useState(themes[0]);
  const [entries, setEntries] = useState<WorldcupEntry[]>([{ id: "entry-a", name: "참가자 1", description: "" }, { id: "entry-b", name: "참가자 2", description: "" }]);
  const [testMode, setTestMode] = useState<TestMode>("variable");
  const [questions, setQuestions] = useState<TestQuestion[]>(defaultQuestions("variable"));
  const [results, setResults] = useState<TestResult[]>(defaultResults());
  const [mbtiLabels, setMbtiLabels] = useState<Record<string, string>>(defaultMbtiLabels());
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [tournamentQueue, setTournamentQueue] = useState<WorldcupEntry[]>([]);
  const [tournamentWinners, setTournamentWinners] = useState<WorldcupEntry[]>([]);
  const [champion, setChampion] = useState<WorldcupEntry | null>(null);
  const [testIndex, setTestIndex] = useState(0);
  const [testScores, setTestScores] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<PlayedResult | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { queueMicrotask(() => setAuthLoading(false)); return; }
    return onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setAuthLoading(false); });
  }, []);

  const templateOptions = useMemo(() => kind === "월드컵" ? worldcupTemplates : kind === "테스트" ? testTemplates : characterTemplates, [kind]);
  const variableOptions = useMemo(() => testMode === "mbti" ? mbtiVariables : results.map((result) => result.key.trim().toUpperCase()).filter(Boolean), [testMode, results]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const loginWithGoogle = async () => {
    const auth = getFirebaseAuth(); if (!auth) { setModal("loginHelp"); return; }
    try { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: "select_account" }); await signInWithPopup(auth, provider); notify("Google 계정으로 로그인했어요."); }
    catch (error) { const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""; if (code !== "auth/popup-closed-by-user") notify("로그인에 실패했어요. Firebase 승인 도메인을 확인해 주세요."); }
  };
  const logout = async () => { const auth = getFirebaseAuth(); if (auth) await signOut(auth); setModal(null); notify("로그아웃했어요."); };
  const fileToData = (file: File, done: (value: string) => void) => {
    if (!file.type.startsWith("image/")) return notify("이미지 파일을 선택해 주세요.");
    if (file.size > 10 * 1024 * 1024) return notify("이미지는 10MB 이하만 올릴 수 있어요.");
    const reader = new FileReader(); reader.onload = () => done(String(reader.result || "")); reader.readAsDataURL(file);
  };
  const resetBuilder = (nextKind: ContentKind, nextTemplate?: string) => {
    const options = nextKind === "월드컵" ? worldcupTemplates : nextKind === "테스트" ? testTemplates : characterTemplates;
    setKind(nextKind); setTemplate(nextTemplate || options[0]); setTitle(""); setDescription(""); setCover(""); setTheme(themes[0]);
    setEntries([newWorldcupEntry(1), newWorldcupEntry(2)]); setTestMode("variable"); setQuestions(defaultQuestions("variable")); setResults(defaultResults()); setMbtiLabels(defaultMbtiLabels()); setModal("creator");
  };
  const changeKind = (nextKind: ContentKind) => { const options = nextKind === "월드컵" ? worldcupTemplates : nextKind === "테스트" ? testTemplates : characterTemplates; setKind(nextKind); setTemplate(options[0]); };
  const changeTestMode = (mode: TestMode) => { setTestMode(mode); setQuestions(defaultQuestions(mode)); setTestResult(null); };
  const updateEntry = (id: string, field: "name" | "description", value: string) => setEntries((items) => items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const updateQuestionText = (questionId: string, value: string) => setQuestions((items) => items.map((item) => item.id === questionId ? { ...item, text: value } : item));
  const updateChoiceText = (questionId: string, choiceId: string, value: string) => setQuestions((items) => items.map((question) => question.id !== questionId ? question : { ...question, choices: question.choices.map((choice) => choice.id === choiceId ? { ...choice, text: value } : choice) }));
  const updateLink = (questionId: string, choiceId: string, linkId: string, field: "variable" | "score", value: string | number) => setQuestions((items) => items.map((question) => question.id !== questionId ? question : { ...question, choices: question.choices.map((choice) => choice.id !== choiceId ? choice : { ...choice, links: choice.links.map((link) => link.id === linkId ? { ...link, [field]: value } : link) }) }));
  const addLink = (questionId: string, choiceId: string) => setQuestions((items) => items.map((question) => question.id !== questionId ? question : { ...question, choices: question.choices.map((choice) => choice.id === choiceId ? { ...choice, links: [...choice.links, { id: uid(), variable: variableOptions[0] || "A", score: 1 }] } : choice) }));
  const removeLink = (questionId: string, choiceId: string, linkId: string) => setQuestions((items) => items.map((question) => question.id !== questionId ? question : { ...question, choices: question.choices.map((choice) => choice.id === choiceId ? { ...choice, links: choice.links.filter((link) => link.id !== linkId) } : choice) }));
  const addChoice = (questionId: string) => setQuestions((items) => items.map((question) => question.id === questionId ? { ...question, choices: [...question.choices, newChoice(variableOptions[0] || "A", question.choices.length + 1)] } : question));
  const removeChoice = (questionId: string, choiceId: string) => setQuestions((items) => items.map((question) => question.id === questionId ? { ...question, choices: question.choices.filter((choice) => choice.id !== choiceId) } : question));

  const validateDraft = () => {
    if (!title.trim()) return "제목을 적어주세요.";
    if (kind === "월드컵" && entries.filter((entry) => entry.name.trim()).length < 2) return "참가자를 두 명 이상 적어주세요.";
    if (kind === "테스트") {
      if (testMode === "variable" && (results.length < 2 || new Set(results.map((item) => item.key.trim().toUpperCase())).size !== results.length || results.some((item) => !item.key.trim() || !item.title.trim()))) return "결과 변수는 서로 다른 이름으로 두 개 이상 설정해 주세요.";
      if (!questions.length || questions.some((question) => !question.text.trim() || question.choices.length < 2 || question.choices.some((choice) => !choice.text.trim() || !choice.links.length))) return "각 질문에 선택지와 숨은 점수를 모두 채워주세요.";
    }
    return "";
  };
  const currentDraft = (): Draft => ({ id: uid(), kind, template, title: title.trim(), description: description.trim(), cover: cover || undefined, theme, entries: kind === "월드컵" ? entries : undefined, testMode: kind === "테스트" ? testMode : undefined, questions: kind === "테스트" ? questions : undefined, results: kind === "테스트" ? results : undefined, mbtiLabels: kind === "테스트" ? mbtiLabels : undefined });
  const saveDraft = () => { const error = validateDraft(); if (error) return notify(error); const next = [currentDraft(), ...drafts]; try { localStorage.setItem(draftKey, JSON.stringify(next)); setDrafts(next); setModal("library"); notify(user ? `${user.displayName || "내"} 보관함에 저장했어요.` : "이 브라우저의 보관함에 저장했어요."); } catch { notify("이미지가 너무 커서 저장하지 못했어요."); } };
  const loadDraft = (draft: Draft) => { setKind(draft.kind); setTemplate(draft.template); setTitle(draft.title); setDescription(draft.description); setCover(draft.cover || ""); setTheme(draft.theme); if (draft.entries) setEntries(draft.entries); setTestMode(draft.testMode || "variable"); if (draft.questions) setQuestions(draft.questions); if (draft.results) setResults(draft.results); if (draft.mbtiLabels) setMbtiLabels(draft.mbtiLabels); setModal("preview"); };
  const startWorldcup = () => { const error = validateDraft(); if (error) return notify(error); setTournamentQueue(entries.filter((entry) => entry.name.trim())); setTournamentWinners([]); setChampion(null); setModal("worldcupPlay"); };
  const chooseWinner = (winner: WorldcupEntry) => { const remaining = tournamentQueue.slice(2); const nextWinners = [...tournamentWinners, winner]; if (remaining.length === 1) { setTournamentQueue([...nextWinners, remaining[0]]); setTournamentWinners([]); } else if (!remaining.length) { if (nextWinners.length === 1) setChampion(nextWinners[0]); else { setTournamentQueue(nextWinners); setTournamentWinners([]); } } else { setTournamentQueue(remaining); setTournamentWinners(nextWinners); } };
  const startTest = () => { const error = validateDraft(); if (error) return notify(error); setTestIndex(0); setTestScores({}); setTestResult(null); setModal("testPlay"); };
  const resolveTestResult = (scores: Record<string, number>): PlayedResult => {
    if (testMode === "mbti") { const code = `${(scores.E || 0) >= (scores.I || 0) ? "E" : "I"}${(scores.S || 0) >= (scores.N || 0) ? "S" : "N"}${(scores.T || 0) >= (scores.F || 0) ? "T" : "F"}${(scores.J || 0) >= (scores.P || 0) ? "J" : "P"}`; return { code, title: mbtiLabels[code] || `${code}형 오타쿠`, description: "네 가지 성향 축의 숨은 점수를 합산한 결과예요." }; }
    const winner = [...results].sort((a, b) => (scores[b.key.trim().toUpperCase()] || 0) - (scores[a.key.trim().toUpperCase()] || 0))[0]; return { code: winner.key.toUpperCase(), title: winner.title, description: winner.description };
  };
  const answerTest = (choice: TestChoice) => { const nextScores = { ...testScores }; choice.links.forEach((link) => { const key = link.variable.trim().toUpperCase(); nextScores[key] = (nextScores[key] || 0) + Number(link.score || 0); }); setTestScores(nextScores); if (testIndex + 1 >= questions.length) setTestResult(resolveTestResult(nextScores)); else setTestIndex((value) => value + 1); };
  const generatePrompt = () => { setPromptResult({ genre: randomItem(promptParts.genre), relationship: randomItem(promptParts.relationship), mood: randomItem(promptParts.mood), place: randomItem(promptParts.place), incident: randomItem(promptParts.incident), line: randomItem(promptParts.line) }); setModal("prompt"); };
  const copyPrompt = async () => { if (!promptResult) return; try { await navigator.clipboard.writeText(`[${promptResult.genre}] ${promptResult.relationship}. ${promptResult.place}에서 ${promptResult.incident}. ${promptResult.line}`); notify("연성 소재를 복사했어요."); } catch { notify("화면의 문장을 직접 선택해 주세요."); } };
  const categories = [
    ["🏆", "월드컵", () => resetBuilder("월드컵")], ["✨", "테스트", () => resetBuilder("테스트")], ["🎨", "자캐 등록", () => resetBuilder("자캐 콘텐츠")], ["💬", "첫인상", () => resetBuilder("자캐 콘텐츠", "익명 첫인상")],
    ["🔗", "관계도", () => resetBuilder("자캐 콘텐츠", "자캐 관계도")], ["🎲", "연성 소재", generatePrompt], ["🎭", "케미 테스트", () => resetBuilder("자캐 콘텐츠", "자캐 케미 테스트")], ["🗂️", "내 보관함", () => setModal("library")],
  ] as const;

  return <main className="site-shell">
    <div className="utility-bar"><div><span>취향이 콘텐츠가 되는 곳</span><span>건전한 창작 커뮤니티를 함께 만들어요</span></div></div>
    <header className="site-header"><a href="#top" aria-label="오타쿠놀이터 홈"><Logo /></a><nav><a href="#discover">둘러보기</a><a href="#worldcup">월드컵</a><a href="#test-studio">테스트</a><a href="#oc-tools">자캐 콘텐츠</a><button type="button" onClick={generatePrompt}>연성 소재</button></nav><div className="header-actions"><button className="search-button" type="button" aria-label="검색">⌕</button><button className="login-button" type="button" disabled={authLoading} onClick={() => user ? setModal("account") : void loginWithGoogle()}>{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="google-g">G</span>}{authLoading ? "확인 중" : user ? (user.displayName || "내 계정") : "Google로 로그인"}</button><button className="create-button" type="button" onClick={() => resetBuilder("월드컵")}>＋ 만들기</button></div></header>
    <section className="hero" id="top"><div className="hero-main"><div className="hero-copy"><span className="eyebrow">OTAKU PLAYGROUND</span><h1>내 취향을<br />재미있는 콘텐츠로</h1><p>월드컵부터 성향 테스트, 자캐 관계와 연성 소재까지.<br />만들고, 놀고, 함께 공유해요.</p><div><button type="button" onClick={() => resetBuilder("테스트")}>테스트 만들기</button><button type="button" onClick={() => resetBuilder("월드컵")}>월드컵 열기</button></div></div><div className="hero-image"><span className="image-chip">FEATURED CHARACTER</span><img src={heroImage} alt="사용자가 제공한 캐릭터 원본 이미지" /></div></div><div className="hero-side"><button className="side-card mint" type="button" onClick={() => resetBuilder("테스트")}><span>NEW</span><h2>숨은 변수로 만드는<br />나만의 성향 테스트</h2><p>MBTI형 · 직접 변수형</p><b>만들어 보기 →</b></button><button className="side-card peach" type="button" onClick={generatePrompt}><span>WRITING</span><h2>막힌 장면을 여는<br />연성 소재 한 장</h2><p>관계 · 장소 · 사건 · 대사</p><b>지금 뽑기 →</b></button></div></section>
    <section className="category-strip" aria-label="콘텐츠 바로가기">{categories.map(([icon, label, action]) => <button key={label} type="button" onClick={action}><span>{icon}</span><b>{label}</b></button>)}</section>
    <section className="quick-maker" id="discover"><div><span>뭘 만들지 고민된다면</span><h2>오늘은 어떤 콘텐츠로 놀까요?</h2></div><div className="quick-search"><select aria-label="콘텐츠 종류"><option>전체 콘텐츠</option><option>월드컵</option><option>테스트</option><option>자캐 콘텐츠</option></select><input aria-label="콘텐츠 검색" placeholder="키워드를 입력해 보세요" /><button type="button" onClick={() => resetBuilder("월드컵")}>바로 만들기</button></div><div className="keyword-row"><small>추천</small>{["#최애월드컵","#자캐첫인상","#관계성테스트","#MBTI","#연성소재"].map((tag) => <span key={tag}>{tag}</span>)}</div></section>
    <section className="feature-section" id="worldcup"><div className="section-title"><span>POPULAR MAKERS</span><h2>표지만이 아니라, 실제로 플레이해요</h2><p>이미지와 설명을 넣어 만들고 바로 결과까지 확인할 수 있어요.</p></div><div className="feature-grid"><article className="feature-card lavender"><div className="card-icon">VS</div><span>WORLD CUP</span><h3>오타쿠형 월드컵</h3><p>참가자를 원하는 만큼 추가하고 라운드를 직접 진행해 최종 우승자를 골라요.</p><ul><li>참가자별 이미지 업로드</li><li>자동 라운드 진행</li><li>결과 공유 문구 복사</li></ul><button type="button" onClick={() => resetBuilder("월드컵")}>월드컵 만들기 →</button></article><article className="feature-card sky" id="test-studio"><div className="card-icon">f(x)</div><span>TEST STUDIO</span><h3>고급 테스트 제작기</h3><p>선택지는 이용자에게만 보여 주고, 제작자는 뒤에서 결과 변수를 자유롭게 연결해요.</p><ul><li>선택지 개수 제한 없음</li><li>선택지마다 복수 변수·점수</li><li>직접 변수형 / MBTI형</li></ul><button type="button" onClick={() => resetBuilder("테스트")}>테스트 만들기 →</button></article><article className="feature-card butter"><div className="card-icon">✦</div><span>PROMPT DRAW</span><h3>연성 소재 뽑기</h3><p>관계, 배경, 사건과 대사를 무작위로 조합해 다음 장면의 시작을 만들어요.</p><ul><li>장르와 분위기 조합</li><li>몇 번이든 다시 뽑기</li><li>한 번에 문장 복사</li></ul><button type="button" onClick={generatePrompt}>소재 한 장 뽑기 →</button></article></div></section>
    <section className="oc-section" id="oc-tools"><div className="section-title"><span>ORIGINAL CHARACTER</span><h2>캐릭터 하나로 이어지는 여러 가지 놀이</h2><p>첫인상뿐 아니라 관계, 문답, 가챠와 기록까지 한곳에서.</p></div><div className="oc-grid">{characterTemplates.map((item, index) => <button type="button" key={item} onClick={() => resetBuilder("자캐 콘텐츠", item)}><span>{["ID","?","∞","♥","↻","✎","▦","◐"][index]}</span><div><b>{item}</b><small>{["설정과 이미지를 카드로", "설명 없이 첫 느낌 받기", "감정선을 연결해 기록", "둘의 조합을 테스트", "뜻밖의 관계를 뽑기", "대사와 상황을 가챠", "친구들과 채우는 양식", "캐릭터 색을 한눈에"][index]}</small></div><i>→</i></button>)}</div></section>
    <section className="cta"><div><span>MAKE YOUR FANDOM PLAYABLE</span><h2>머릿속 취향을 오늘의 놀거리로 만들어 보세요.</h2></div><button type="button" onClick={() => resetBuilder("테스트")}>무료로 시작하기 →</button></section>
    <footer><Logo /><p>월드컵 · 테스트 · 자캐 콘텐츠 · 연성 소재</p><div><button type="button" onClick={() => setModal("library")}>내 보관함</button><a href="#top">맨 위로</a></div></footer>
    <nav className="mobile-nav"><a href="#top"><span>⌂</span>홈</a><a href="#worldcup"><span>VS</span>월드컵</a><button type="button" onClick={() => resetBuilder("테스트")}><span>＋</span>만들기</button><button type="button" onClick={generatePrompt}><span>✦</span>소재</button><button type="button" onClick={() => setModal("library")}><span>□</span>보관함</button></nav>

    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModal(null)}><section className={`modal ${modal}-modal`} role="dialog" aria-modal="true"><button className="modal-close" type="button" aria-label="닫기" onClick={() => setModal(null)}>×</button>
      {modal === "account" && user && <div className="account-panel"><div className="account-avatar">{user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : "G"}</div><span>GOOGLE ACCOUNT</span><h2>{user.displayName || "오타쿠놀이터 회원"}</h2><p>{user.email}</p><div><button type="button" onClick={() => setModal("library")}>내 보관함</button><button type="button" onClick={() => void logout()}>로그아웃</button></div></div>}
      {modal === "loginHelp" && <div className="login-help"><span>GOOGLE LOGIN SETUP</span><h2>Firebase 연결이 필요해요</h2><p>이 버튼은 실제 Google OAuth 코드에 연결되어 있어요. Firebase 프로젝트 값을 입력하면 Google 계정 선택창이 열립니다.</p><ol><li>Firebase Console에서 웹 앱을 만들어요.</li><li>Authentication에서 Google 제공업체를 켜요.</li><li>Authorized domains에 <b>kkyareuk.github.io</b>를 추가해요.</li><li>저장소 Actions secrets에 README의 6개 값을 넣어요.</li></ol><button type="button" onClick={() => setModal(null)}>확인</button></div>}
      {modal === "creator" && <div className="creator-panel"><div className="modal-heading"><span>CONTENT MAKER</span><h2>{kind} 만들기</h2><p>기본 정보와 실제 플레이 내용을 함께 설정해요.</p></div><div className="kind-tabs">{(["월드컵","테스트","자캐 콘텐츠"] as ContentKind[]).map((item) => <button key={item} className={kind === item ? "active" : ""} type="button" onClick={() => changeKind(item)}>{item}</button>)}</div><div className="basic-fields"><label>템플릿<select value={template} onChange={(event) => setTemplate(event.target.value)}>{templateOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>제목<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="콘텐츠 제목" /></label><label className="wide">소개<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="참여자에게 보여줄 소개" /></label><label>컬러 테마<select value={theme} onChange={(event) => setTheme(event.target.value)}>{themes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="file-field">대표 표지<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && fileToData(event.target.files[0], setCover)} /><span>{cover ? "이미지 선택됨" : "이미지 선택"}</span></label></div>
        {kind === "월드컵" && <div className="sub-builder"><div className="builder-heading"><div><span>ENTRIES</span><h3>월드컵 참가자</h3></div><button type="button" onClick={() => setEntries((items) => [...items, newWorldcupEntry(items.length + 1)])}>＋ 참가자 추가</button></div><div className="entry-grid">{entries.map((entry, index) => <article className="entry-editor" key={entry.id}><b>{index + 1}</b><label className="entry-image">{entry.image ? <img src={entry.image} alt="" /> : <span>이미지 추가</span>}<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && fileToData(event.target.files[0], (image) => setEntries((items) => items.map((item) => item.id === entry.id ? { ...item, image } : item)))} /></label><input aria-label="참가자 이름" value={entry.name} onChange={(event) => updateEntry(entry.id, "name", event.target.value)} placeholder="참가자 이름" /><textarea aria-label="참가자 설명" value={entry.description} onChange={(event) => updateEntry(entry.id, "description", event.target.value)} placeholder="설명·대사·태그" />{entries.length > 2 && <button type="button" onClick={() => setEntries((items) => items.filter((item) => item.id !== entry.id))}>삭제</button>}</article>)}</div></div>}
        {kind === "테스트" && <div className="sub-builder test-builder"><div className="test-mode"><div><b>계산 방식</b><p>이용자에게 점수와 변수는 보이지 않아요.</p></div><button type="button" className={testMode === "variable" ? "active" : ""} onClick={() => changeTestMode("variable")}><b>직접 변수형</b><small>A·B·C·D처럼 결과를 직접 만들기</small></button><button type="button" className={testMode === "mbti" ? "active" : ""} onClick={() => changeTestMode("mbti")}><b>MBTI형</b><small>E/I · S/N · T/F · J/P 계산</small></button></div>
          {testMode === "variable" ? <div className="result-editor"><div className="builder-heading"><div><span>RESULT VARIABLES</span><h3>결과 변수</h3></div><button type="button" onClick={() => setResults((items) => [...items, { id: uid(), key: `R${items.length + 1}`, title: `결과 ${items.length + 1}`, description: "" }])}>＋ 결과 추가</button></div><p className="builder-guide">변수 이름은 제작자만 봐요. 각 선택지에서 이 변수에 숨은 점수를 줄 수 있습니다.</p><div className="result-grid">{results.map((result) => <article key={result.id}><input className="variable-key" aria-label="변수 이름" value={result.key} maxLength={4} onChange={(event) => setResults((items) => items.map((item) => item.id === result.id ? { ...item, key: event.target.value.toUpperCase() } : item))} /><input aria-label="결과 제목" value={result.title} onChange={(event) => setResults((items) => items.map((item) => item.id === result.id ? { ...item, title: event.target.value } : item))} /><textarea aria-label="결과 설명" value={result.description} onChange={(event) => setResults((items) => items.map((item) => item.id === result.id ? { ...item, description: event.target.value } : item))} placeholder="결과 설명" />{results.length > 2 && <button type="button" onClick={() => setResults((items) => items.filter((item) => item.id !== result.id))}>삭제</button>}</article>)}</div></div> : <div className="mbti-editor"><span>MBTI VARIABLES</span><h3>4개 성향 축 · 16개 결과</h3><div className="mbti-pairs"><b>E / I</b><b>S / N</b><b>T / F</b><b>J / P</b></div><details><summary>16개 결과 이름 편집</summary><div className="mbti-label-grid">{mbtiTypes.map((code) => <label key={code}><b>{code}</b><input value={mbtiLabels[code]} onChange={(event) => setMbtiLabels({ ...mbtiLabels, [code]: event.target.value })} /></label>)}</div></details></div>}
          <div className="builder-heading question-heading"><div><span>QUESTIONS</span><h3>질문과 선택지</h3></div><button type="button" onClick={() => setQuestions((items) => [...items, newQuestion(testMode, items.length + 1)])}>＋ 질문 추가</button></div><div className="question-list">{questions.map((question, qIndex) => <article className="question-editor" key={question.id}><div className="question-top"><b>Q{qIndex + 1}</b><input aria-label="질문" value={question.text} onChange={(event) => updateQuestionText(question.id, event.target.value)} placeholder="질문을 입력하세요" />{questions.length > 1 && <button type="button" onClick={() => setQuestions((items) => items.filter((item) => item.id !== question.id))}>질문 삭제</button>}</div><div className="choice-list">{question.choices.map((choice, cIndex) => <div className="choice-editor" key={choice.id}><div className="choice-visible"><span>{cIndex + 1}</span><input aria-label={`선택지 ${cIndex + 1}`} value={choice.text} onChange={(event) => updateChoiceText(question.id, choice.id, event.target.value)} placeholder="이용자에게 보일 선택지" />{question.choices.length > 2 && <button type="button" onClick={() => removeChoice(question.id, choice.id)}>×</button>}</div><div className="score-box"><small>제작자만 보는 숨은 점수</small>{choice.links.map((link) => <div className="score-link" key={link.id}><select aria-label="연결 변수" value={link.variable} onChange={(event) => updateLink(question.id, choice.id, link.id, "variable", event.target.value)}>{variableOptions.map((variable) => <option key={variable}>{variable}</option>)}</select><span>＋</span><input aria-label="점수" type="number" min="-10" max="10" value={link.score} onChange={(event) => updateLink(question.id, choice.id, link.id, "score", Number(event.target.value))} /><b>점</b>{choice.links.length > 1 && <button type="button" onClick={() => removeLink(question.id, choice.id, link.id)}>삭제</button>}</div>)}<button type="button" onClick={() => addLink(question.id, choice.id)}>＋ 변수 하나 더 연결</button></div></div>)}</div><button className="add-choice" type="button" onClick={() => addChoice(question.id)}>＋ 선택지 추가</button></article>)}</div></div>}
        {kind === "자캐 콘텐츠" && <div className="oc-note"><span>OC</span><div><h3>{template}</h3><p>자캐 이미지와 기본 정보를 등록하는 세부 편집기는 다음 단계에서 이 템플릿에 맞춰 연결됩니다.</p></div></div>}
        <div className="modal-actions"><button type="button" onClick={() => setModal("preview")}>미리보기</button><button type="button" onClick={saveDraft}>보관함 저장</button><button className="primary" type="button" onClick={() => kind === "월드컵" ? startWorldcup() : kind === "테스트" ? startTest() : setModal("preview")}>{kind === "월드컵" ? "대결 시작" : kind === "테스트" ? "테스트 풀기" : "완성 보기"} →</button></div></div>}
      {modal === "preview" && <div className="preview-panel"><button className="back-button" type="button" onClick={() => setModal("creator")}>← 편집으로</button><div className={`content-preview theme-${themes.indexOf(theme)}`}><div>{cover ? <img src={cover} alt="콘텐츠 표지" /> : <span>{kind === "월드컵" ? "VS" : kind === "테스트" ? "f(x)" : "OC"}</span>}</div><article><small>{kind} · {template}</small><h2>{title || "제목을 입력해 주세요"}</h2><p>{description || "소개가 이곳에 표시됩니다."}</p><b>{kind === "월드컵" ? `${entries.length}명의 참가자` : kind === "테스트" ? `${questions.length}개 질문 · ${testMode === "mbti" ? "MBTI형" : `${results.length}개 결과`}` : template}</b></article></div><div className="modal-actions"><button type="button" onClick={() => setModal("creator")}>계속 편집</button><button type="button" onClick={saveDraft}>보관함 저장</button><button className="primary" type="button" onClick={() => kind === "월드컵" ? startWorldcup() : kind === "테스트" ? startTest() : notify("미리보기가 완성됐어요.")}>플레이 →</button></div></div>}
      {modal === "worldcupPlay" && <div className="play-panel"><div className="modal-heading"><span>LIVE WORLD CUP</span><h2>{champion ? "최종 우승" : title || "월드컵 대결"}</h2><p>{champion ? "당신의 선택이 끝났어요." : "더 마음에 드는 쪽을 선택하세요."}</p></div>{champion ? <div className="result-card">{champion.image ? <img src={champion.image} alt="우승자" /> : <span>🏆</span>}<small>CHAMPION</small><h3>{champion.name}</h3><p>{champion.description}</p><button type="button" onClick={() => { void navigator.clipboard.writeText(`${title} 우승: ${champion.name}`); notify("결과를 복사했어요."); }}>결과 복사</button></div> : <div className="match-grid">{tournamentQueue.slice(0,2).map((entry) => <button key={entry.id} type="button" onClick={() => chooseWinner(entry)}>{entry.image ? <img src={entry.image} alt={entry.name} /> : <span>{entry.name.slice(0,1)}</span>}<h3>{entry.name}</h3><p>{entry.description || "이 참가자를 선택하기"}</p></button>)}<i>VS</i></div>}</div>}
      {modal === "testPlay" && <div className="play-panel"><div className="modal-heading"><span>LIVE TEST</span><h2>{title || "취향 테스트"}</h2><p>{testResult ? "결과가 도착했어요." : `${testIndex + 1} / ${questions.length}`}</p></div>{testResult ? <div className="result-card test-result"><span>{testResult.code}</span><small>YOUR RESULT</small><h3>{testResult.title}</h3><p>{testResult.description || description || "당신의 선택이 만든 결과예요."}</p><button type="button" onClick={() => { setTestIndex(0); setTestScores({}); setTestResult(null); }}>다시 풀기</button></div> : <div className="live-question"><small>QUESTION {testIndex + 1}</small><h3>{questions[testIndex]?.text}</h3>{questions[testIndex]?.choices.map((choice, index) => <button type="button" key={choice.id} onClick={() => answerTest(choice)}><span>{index + 1}</span>{choice.text}</button>)}</div>}</div>}
      {modal === "prompt" && <div className="prompt-panel"><div className="modal-heading"><span>WRITING PROMPT</span><h2>연성 소재 한 장</h2><p>마음에 들지 않으면 몇 번이든 다시 뽑을 수 있어요.</p></div>{promptResult && <div className="drawn-prompt"><div><span>{promptResult.genre}</span><span>{promptResult.mood}</span></div><h3>{promptResult.relationship}</h3><p><b>장소</b>{promptResult.place}</p><p><b>사건</b>{promptResult.incident}</p><blockquote>{promptResult.line}</blockquote></div>}<div className="modal-actions"><button type="button" onClick={generatePrompt}>다시 뽑기 ↻</button><button className="primary" type="button" onClick={() => void copyPrompt()}>소재 복사 →</button></div></div>}
      {modal === "library" && <div className="library-panel"><div className="modal-heading"><span>MY LIBRARY</span><h2>{user ? `${user.displayName || "나"}의 보관함` : "내 보관함"}</h2><p>{user ? "현재는 이 브라우저에 저장되며, 커뮤니티 DB 연결 후 계정 동기화됩니다." : "로그인 전에는 이 브라우저에만 저장돼요."}</p></div>{drafts.length ? <div className="draft-list">{drafts.map((draft) => <article key={draft.id}>{draft.cover ? <img src={draft.cover} alt="" /> : <span>{draft.kind === "월드컵" ? "VS" : draft.kind === "테스트" ? "f(x)" : "OC"}</span>}<div><small>{draft.kind} · {draft.template}</small><h3>{draft.title}</h3><p>{draft.description || "소개 없음"}</p></div><button type="button" onClick={() => loadDraft(draft)}>열기</button><button type="button" onClick={() => { const next = drafts.filter((item) => item.id !== draft.id); setDrafts(next); localStorage.setItem(draftKey, JSON.stringify(next)); }}>삭제</button></article>)}</div> : <div className="empty-state"><span>□</span><h3>아직 저장한 콘텐츠가 없어요.</h3><p>월드컵이나 테스트를 만들어 첫 기록을 남겨보세요.</p><button type="button" onClick={() => resetBuilder("테스트")}>새 콘텐츠 만들기</button></div>}</div>}
    </section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
    {!firebaseConfigured && <div className="dev-note">Firebase 설정 전 · Google 로그인 준비됨</div>}
  </main>;
}
