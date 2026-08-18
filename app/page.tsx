"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  firebaseConfigured,
  getFirebaseAuth,
  getFirebaseServices,
} from "@/lib/firebase";

type ViewName =
  | "home"
  | "first-impression"
  | "worldcup"
  | "tests"
  | "commission"
  | "prompts";
type ContentKind = "월드컵" | "테스트";
type ModalName =
  | "creator"
  | "preview"
  | "library"
  | "account"
  | "loginHelp"
  | "worldcupPlay"
  | "testPlay"
  | null;
type TestMode = "variable" | "mbti";
type WorldcupEntry = {
  id: string;
  name: string;
  description: string;
  image?: string;
};
type ScoreLink = { id: string; variable: string; score: number };
type TestChoice = { id: string; text: string; links: ScoreLink[] };
type TestQuestion = { id: string; text: string; choices: TestChoice[] };
type TestResult = {
  id: string;
  key: string;
  title: string;
  description: string;
};
type Draft = {
  id: string;
  kind: ContentKind;
  template: string;
  title: string;
  description: string;
  cover?: string;
  theme: string;
  entries?: WorldcupEntry[];
  testMode?: TestMode;
  questions?: TestQuestion[];
  results?: TestResult[];
  mbtiLabels?: Record<string, string>;
};
type PromptResult = {
  genre: string;
  relationship: string;
  mood: string;
  place: string;
  incident: string;
  line: string;
};
type PlayedResult = { code: string; title: string; description: string };
type FirstImpressionRoom = {
  id: string;
  ownerId: string;
  ownerName: string;
  characterName: string;
  intro: string;
  image: string;
  createdAt?: unknown;
};
type FirstImpressionResponse = {
  id: string;
  nickname: string;
  text: string;
  keywords: string[];
  createdAt?: unknown;
};
type CommissionTier = {
  id: string;
  name: string;
  badge: string;
  description: string;
  fields: string[];
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const heroImage = `${basePath}/characters/ante-maid-transparent.png`;
const draftKey = "otaku-playground-drafts-v4";
const roomKey = "otaku-first-impression-rooms-v1";
const responseKey = "otaku-first-impression-responses-v1";
const worldcupTemplates = [
  "최애 캐릭터 월드컵",
  "자캐 인기투표",
  "관계성·커플링 월드컵",
  "의상·표정·장면 고르기",
  "절대 못 참는 것 월드컵",
];
const testTemplates = [
  "내 취향의 캐릭터 유형은?",
  "내가 이 세계관에 들어가면?",
  "나와 가장 잘 맞는 자캐는?",
  "내 취향의 관계성 조합",
  "나의 오타쿠 유형은?",
];
const themes = ["라일락", "피치", "민트", "나이트"];
const mbtiVariables = ["E", "I", "S", "N", "T", "F", "J", "P"];
const mbtiTypes = [
  "ISTJ",
  "ISFJ",
  "INFJ",
  "INTJ",
  "ISTP",
  "ISFP",
  "INFP",
  "INTP",
  "ESTP",
  "ESFP",
  "ENFP",
  "ENTP",
  "ESTJ",
  "ESFJ",
  "ENFJ",
  "ENTJ",
];
const firstKeywords = [
  "차가워 보여",
  "다정해 보여",
  "강해 보여",
  "비밀이 많아 보여",
  "햇살 같아",
  "위험해 보여",
  "말랑해 보여",
  "서사가 깊어 보여",
];
const commissionTiers: CommissionTier[] = [
  {
    id: "quick",
    name: "핵심만 신청",
    badge: "가볍게",
    description: "빠른 러프·단순 작업에 필요한 내용만",
    fields: [
      "신청자명 / 연락처",
      "캐릭터 한 줄 소개",
      "원하는 구도·표정",
      "예산",
      "희망 마감일",
      "참고 자료 링크",
    ],
  },
  {
    id: "standard",
    name: "표준 신청",
    badge: "추천",
    description: "일반 커미션에 빠짐없이 전달하는 구성",
    fields: [
      "신청자명 / 연락처",
      "캐릭터 기본 설정",
      "외형·의상",
      "포즈·표정",
      "구도·카메라",
      "배경",
      "색감·분위기",
      "참고 자료 링크",
      "사용 용도",
      "예산 / 희망 마감일",
    ],
  },
  {
    id: "detail",
    name: "디테일 신청",
    badge: "꼼꼼하게",
    description: "페어·서사·상업 작업까지 세밀하게",
    fields: [
      "신청자명 / 연락처",
      "캐릭터 상세 프로필",
      "두 인물의 관계",
      "장면과 상황",
      "외형·의상",
      "포즈·표정",
      "구도·카메라",
      "배경·시간대",
      "조명·색감",
      "반드시 넣을 요소",
      "피해야 할 요소",
      "참고 자료 링크",
      "사용 범위·상업 이용",
      "수정 요청 기준",
      "예산 / 희망 마감일",
    ],
  },
];
const promptParts = {
  genre: [
    "고딕 판타지",
    "현대 오컬트",
    "동양풍 궁중극",
    "스페이스 오페라",
    "아포칼립스",
    "마법 학교",
    "느와르",
    "로맨스 판타지",
  ],
  relationship: [
    "서로를 의심하는 동료",
    "오래 헤어진 소꿉친구",
    "주종이 뒤바뀐 계약 관계",
    "기억을 공유하는 숙적",
    "정체를 숨긴 구원자와 추적자",
    "가짜 연인 행세를 하는 원수",
  ],
  mood: [
    "비가 그친 직후의 서늘함",
    "파국 직전의 다정함",
    "들킬 듯 말 듯한 긴장",
    "되돌릴 수 없는 그리움",
    "웃음 아래 감춘 공포",
    "오래된 약속의 온기",
  ],
  place: [
    "폐쇄된 야간 열차",
    "장미가 시들지 않는 온실",
    "봉인된 왕실 기록실",
    "해가 뜨지 않는 항구",
    "폐허가 된 놀이공원",
    "눈보라 속 외딴 여관",
  ],
  incident: [
    "둘 중 한 명의 기억이 매일 사라진다",
    "거짓말을 하면 상대의 상처가 벌어진다",
    "자정마다 관계가 하루 전으로 되돌아간다",
    "한 명만 읽을 수 있는 유언장이 도착한다",
    "죽은 줄 알았던 인물에게서 초대장이 온다",
  ],
  line: [
    "“이번에도 나를 모르는 척할 거야?”",
    "“네가 기억하지 못해도, 나는 약속을 지킬 거야.”",
    "“도망쳐. 내가 아직 네 편일 때.”",
    "“처음부터 구하려던 건 세상이 아니었어.”",
    "“그 문을 열면 우리 중 하나는 돌아오지 못해.”",
  ],
};

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function randomItem(items: string[]) {
  return items[Math.floor(Math.random() * items.length)];
}
function defaultResults(): TestResult[] {
  return [
    {
      id: "result-a",
      key: "A",
      title: "서사를 지키는 관찰자",
      description: "천천히 맥락을 읽고 오래 기억하는 타입",
    },
    {
      id: "result-b",
      key: "B",
      title: "감정에 뛰어드는 주인공",
      description: "마음이 움직이면 곧장 장면 속으로 들어가는 타입",
    },
    {
      id: "result-c",
      key: "C",
      title: "관계를 엮는 설계자",
      description: "인물 사이의 감정선과 조합을 사랑하는 타입",
    },
    {
      id: "result-d",
      key: "D",
      title: "설정을 파고드는 탐험가",
      description: "세계의 규칙과 숨은 설정을 끝까지 찾아가는 타입",
    },
  ];
}
function defaultMbtiLabels() {
  return Object.fromEntries(
    mbtiTypes.map((code) => [code, `${code}형 오타쿠`]),
  );
}
function defaultQuestions(mode: TestMode): TestQuestion[] {
  if (mode === "mbti")
    return [
      {
        id: "q-mbti",
        text: "새 장르에 입덕했을 때 나는?",
        choices: [
          {
            id: "c-e",
            text: "친구를 불러 함께 이야기한다",
            links: [{ id: "l-e", variable: "E", score: 1 }],
          },
          {
            id: "c-i",
            text: "혼자 조용히 자료부터 모은다",
            links: [{ id: "l-i", variable: "I", score: 1 }],
          },
        ],
      },
    ];
  return [
    {
      id: "q-variable",
      text: "가장 먼저 마음이 가는 장면은?",
      choices: [
        {
          id: "c-b",
          text: "위험을 무릅쓰고 달려오는 장면",
          links: [{ id: "l-b", variable: "B", score: 2 }],
        },
        {
          id: "c-d",
          text: "오래된 비밀이 드러나는 장면",
          links: [{ id: "l-d", variable: "D", score: 2 }],
        },
      ],
    },
  ];
}
function newWorldcupEntry(index: number): WorldcupEntry {
  return { id: uid(), name: `참가자 ${index}`, description: "" };
}
function newChoice(variable: string, index: number): TestChoice {
  return {
    id: uid(),
    text: `선택지 ${index}`,
    links: [{ id: uid(), variable, score: 1 }],
  };
}
function newQuestion(mode: TestMode, index: number): TestQuestion {
  return {
    id: uid(),
    text: `질문 ${index}`,
    choices: [
      newChoice(mode === "mbti" ? "E" : "A", 1),
      newChoice(mode === "mbti" ? "I" : "B", 2),
    ],
  };
}
function Logo() {
  return (
    <span className="brand">
      <span>O</span>
      <b>오타쿠놀이터</b>
    </span>
  );
}
function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [view, setView] = useState<ViewName>("home");
  const [modal, setModal] = useState<ModalName>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [kind, setKind] = useState<ContentKind>("월드컵");
  const [template, setTemplate] = useState(worldcupTemplates[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState("");
  const [theme, setTheme] = useState(themes[0]);
  const [entries, setEntries] = useState<WorldcupEntry[]>([
    { id: "entry-a", name: "참가자 1", description: "" },
    { id: "entry-b", name: "참가자 2", description: "" },
  ]);
  const [testMode, setTestMode] = useState<TestMode>("variable");
  const [questions, setQuestions] = useState<TestQuestion[]>(
    defaultQuestions("variable"),
  );
  const [results, setResults] = useState<TestResult[]>(defaultResults());
  const [mbtiLabels, setMbtiLabels] =
    useState<Record<string, string>>(defaultMbtiLabels());
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [tournamentQueue, setTournamentQueue] = useState<WorldcupEntry[]>([]);
  const [tournamentWinners, setTournamentWinners] = useState<WorldcupEntry[]>(
    [],
  );
  const [champion, setChampion] = useState<WorldcupEntry | null>(null);
  const [testIndex, setTestIndex] = useState(0);
  const [testScores, setTestScores] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<PlayedResult | null>(null);
  const [toast, setToast] = useState("");
  const [rooms, setRooms] = useState<FirstImpressionRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<FirstImpressionRoom | null>(
    null,
  );
  const [roomResponses, setRoomResponses] = useState<FirstImpressionResponse[]>(
    [],
  );
  const [characterName, setCharacterName] = useState("");
  const [characterIntro, setCharacterIntro] = useState("");
  const [characterImage, setCharacterImage] = useState("");
  const [characterImageFile, setCharacterImageFile] = useState<File | null>(
    null,
  );
  const [responseNickname, setResponseNickname] = useState("");
  const [responseText, setResponseText] = useState("");
  const [responseKeywords, setResponseKeywords] = useState<string[]>([]);
  const [savingRoom, setSavingRoom] = useState(false);
  const [commissionTierId, setCommissionTierId] = useState("standard");
  const [commissionTitle, setCommissionTitle] = useState("커미션 신청서");
  const [commissionValues, setCommissionValues] = useState<
    Record<string, string>
  >({});
  const commissionCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allowed: ViewName[] = [
      "home",
      "first-impression",
      "worldcup",
      "tests",
      "commission",
      "prompts",
    ];
    const fromHash = window.location.hash.replace("#", "") as ViewName;
    queueMicrotask(() => {
      setDrafts(readLocal<Draft[]>(draftKey, []));
      setRooms(readLocal<FirstImpressionRoom[]>(roomKey, []));
      if (allowed.includes(fromHash)) setView(fromHash);
    });
    const roomId = new URLSearchParams(window.location.search).get(
      "impression",
    );
    if (roomId)
      queueMicrotask(() => {
        setView("first-impression");
        void loadRoom(roomId);
      });
    const onHash = () => {
      const next = window.location.hash.replace("#", "") as ViewName;
      if (allowed.includes(next)) setView(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      queueMicrotask(() => setAuthLoading(false));
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
  }, []);
  useEffect(() => {
    if (!firebaseConfigured || !user || user.isAnonymous) return;
    const services = getFirebaseServices();
    if (!services) return;
    void getDocs(
      query(
        collection(services.db, "firstImpressions"),
        where("ownerId", "==", user.uid),
      ),
    )
      .then((snapshot) =>
        setRooms(
          snapshot.docs.map(
            (item) => ({ id: item.id, ...item.data() }) as FirstImpressionRoom,
          ),
        ),
      )
      .catch(() => undefined);
  }, [user]);
  // Firebase response loading is intentionally keyed only to the active room and signed-in owner.
  useEffect(() => {
    if (
      !activeRoom ||
      !user ||
      activeRoom.ownerId !== user.uid ||
      !firebaseConfigured
    )
      return;
    void loadRoomResponses(activeRoom.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, user]);

  const templateOptions = useMemo(
    () => (kind === "월드컵" ? worldcupTemplates : testTemplates),
    [kind],
  );
  const variableOptions = useMemo(
    () =>
      testMode === "mbti"
        ? mbtiVariables
        : results
            .map((result) => result.key.trim().toUpperCase())
            .filter(Boolean),
    [testMode, results],
  );
  const commissionTier = useMemo(
    () =>
      commissionTiers.find((item) => item.id === commissionTierId) ||
      commissionTiers[1],
    [commissionTierId],
  );
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const navigate = (next: ViewName) => {
    setView(next);
    setModal(null);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const loginWithGoogle = async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setModal("loginHelp");
      return null;
    }
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      notify("Google 계정으로 로그인했어요.");
      return result.user;
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      if (code !== "auth/popup-closed-by-user")
        notify(
          "로그인에 실패했어요. Firebase 승인 도메인과 Google 제공업체 설정을 확인해 주세요.",
        );
      return null;
    }
  };
  const logout = async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    setModal(null);
    notify("로그아웃했어요.");
  };
  const fileToData = (file: File, done: (value: string) => void) => {
    if (!file.type.startsWith("image/"))
      return notify("이미지 파일을 선택해 주세요.");
    if (file.size > 10 * 1024 * 1024)
      return notify("이미지는 10MB 이하만 올릴 수 있어요.");
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const resetBuilder = (
    nextKind: ContentKind,
    nextTemplate?: string,
    mode?: TestMode,
  ) => {
    const options = nextKind === "월드컵" ? worldcupTemplates : testTemplates;
    const nextMode = mode || "variable";
    setKind(nextKind);
    setTemplate(nextTemplate || options[0]);
    setTitle("");
    setDescription("");
    setCover("");
    setTheme(themes[0]);
    setEntries([newWorldcupEntry(1), newWorldcupEntry(2)]);
    setTestMode(nextMode);
    setQuestions(defaultQuestions(nextMode));
    setResults(defaultResults());
    setMbtiLabels(defaultMbtiLabels());
    setModal("creator");
  };
  const changeTestMode = (mode: TestMode) => {
    setTestMode(mode);
    setQuestions(defaultQuestions(mode));
    setTestResult(null);
  };
  const updateEntry = (
    id: string,
    field: "name" | "description",
    value: string,
  ) =>
    setEntries((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  const updateQuestionText = (questionId: string, value: string) =>
    setQuestions((items) =>
      items.map((item) =>
        item.id === questionId ? { ...item, text: value } : item,
      ),
    );
  const updateChoiceText = (
    questionId: string,
    choiceId: string,
    value: string,
  ) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              choices: question.choices.map((choice) =>
                choice.id === choiceId ? { ...choice, text: value } : choice,
              ),
            },
      ),
    );
  const updateLink = (
    questionId: string,
    choiceId: string,
    linkId: string,
    field: "variable" | "score",
    value: string | number,
  ) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              choices: question.choices.map((choice) =>
                choice.id !== choiceId
                  ? choice
                  : {
                      ...choice,
                      links: choice.links.map((link) =>
                        link.id === linkId ? { ...link, [field]: value } : link,
                      ),
                    },
              ),
            },
      ),
    );
  const addLink = (questionId: string, choiceId: string) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              choices: question.choices.map((choice) =>
                choice.id === choiceId
                  ? {
                      ...choice,
                      links: [
                        ...choice.links,
                        {
                          id: uid(),
                          variable: variableOptions[0] || "A",
                          score: 1,
                        },
                      ],
                    }
                  : choice,
              ),
            },
      ),
    );
  const removeLink = (questionId: string, choiceId: string, linkId: string) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id !== questionId
          ? question
          : {
              ...question,
              choices: question.choices.map((choice) =>
                choice.id === choiceId
                  ? {
                      ...choice,
                      links: choice.links.filter((link) => link.id !== linkId),
                    }
                  : choice,
              ),
            },
      ),
    );
  const addChoice = (questionId: string) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id === questionId
          ? {
              ...question,
              choices: [
                ...question.choices,
                newChoice(
                  variableOptions[0] || "A",
                  question.choices.length + 1,
                ),
              ],
            }
          : question,
      ),
    );
  const removeChoice = (questionId: string, choiceId: string) =>
    setQuestions((items) =>
      items.map((question) =>
        question.id === questionId
          ? {
              ...question,
              choices: question.choices.filter(
                (choice) => choice.id !== choiceId,
              ),
            }
          : question,
      ),
    );
  const validateDraft = () => {
    if (!title.trim()) return "제목을 적어주세요.";
    if (
      kind === "월드컵" &&
      entries.filter((entry) => entry.name.trim()).length < 2
    )
      return "참가자를 두 명 이상 적어주세요.";
    if (kind === "테스트") {
      if (
        testMode === "variable" &&
        (results.length < 2 ||
          new Set(results.map((item) => item.key.trim().toUpperCase())).size !==
            results.length ||
          results.some((item) => !item.key.trim() || !item.title.trim()))
      )
        return "결과 변수는 서로 다른 이름으로 두 개 이상 설정해 주세요.";
      if (
        !questions.length ||
        questions.some(
          (question) =>
            !question.text.trim() ||
            question.choices.length < 2 ||
            question.choices.some(
              (choice) => !choice.text.trim() || !choice.links.length,
            ),
        )
      )
        return "각 질문에 선택지와 숨은 점수를 모두 채워주세요.";
    }
    return "";
  };
  const currentDraft = (): Draft => ({
    id: uid(),
    kind,
    template,
    title: title.trim(),
    description: description.trim(),
    cover: cover || undefined,
    theme,
    entries: kind === "월드컵" ? entries : undefined,
    testMode: kind === "테스트" ? testMode : undefined,
    questions: kind === "테스트" ? questions : undefined,
    results: kind === "테스트" ? results : undefined,
    mbtiLabels: kind === "테스트" ? mbtiLabels : undefined,
  });
  const saveDraft = () => {
    const error = validateDraft();
    if (error) return notify(error);
    const next = [currentDraft(), ...drafts];
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
      setDrafts(next);
      setModal("library");
      notify("이 브라우저의 보관함에 저장했어요.");
    } catch {
      notify("이미지가 너무 커서 저장하지 못했어요.");
    }
  };
  const loadDraft = (draft: Draft) => {
    setKind(draft.kind);
    setTemplate(draft.template);
    setTitle(draft.title);
    setDescription(draft.description);
    setCover(draft.cover || "");
    setTheme(draft.theme);
    if (draft.entries) setEntries(draft.entries);
    setTestMode(draft.testMode || "variable");
    if (draft.questions) setQuestions(draft.questions);
    if (draft.results) setResults(draft.results);
    if (draft.mbtiLabels) setMbtiLabels(draft.mbtiLabels);
    setModal("preview");
  };
  const startWorldcup = () => {
    const error = validateDraft();
    if (error) return notify(error);
    setTournamentQueue(entries.filter((entry) => entry.name.trim()));
    setTournamentWinners([]);
    setChampion(null);
    setModal("worldcupPlay");
  };
  const chooseWinner = (winner: WorldcupEntry) => {
    const remaining = tournamentQueue.slice(2);
    const nextWinners = [...tournamentWinners, winner];
    if (remaining.length === 1) {
      setTournamentQueue([...nextWinners, remaining[0]]);
      setTournamentWinners([]);
    } else if (!remaining.length) {
      if (nextWinners.length === 1) setChampion(nextWinners[0]);
      else {
        setTournamentQueue(nextWinners);
        setTournamentWinners([]);
      }
    } else {
      setTournamentQueue(remaining);
      setTournamentWinners(nextWinners);
    }
  };
  const startTest = () => {
    const error = validateDraft();
    if (error) return notify(error);
    setTestIndex(0);
    setTestScores({});
    setTestResult(null);
    setModal("testPlay");
  };
  const resolveTestResult = (scores: Record<string, number>): PlayedResult => {
    if (testMode === "mbti") {
      const code = `${(scores.E || 0) >= (scores.I || 0) ? "E" : "I"}${(scores.S || 0) >= (scores.N || 0) ? "S" : "N"}${(scores.T || 0) >= (scores.F || 0) ? "T" : "F"}${(scores.J || 0) >= (scores.P || 0) ? "J" : "P"}`;
      return {
        code,
        title: mbtiLabels[code] || `${code}형 오타쿠`,
        description: "네 가지 성향 축의 숨은 점수를 합산한 결과예요.",
      };
    }
    const winner = [...results].sort(
      (a, b) =>
        (scores[b.key.trim().toUpperCase()] || 0) -
        (scores[a.key.trim().toUpperCase()] || 0),
    )[0];
    return {
      code: winner.key.toUpperCase(),
      title: winner.title,
      description: winner.description,
    };
  };
  const answerTest = (choice: TestChoice) => {
    const nextScores = { ...testScores };
    choice.links.forEach((link) => {
      const key = link.variable.trim().toUpperCase();
      nextScores[key] = (nextScores[key] || 0) + Number(link.score || 0);
    });
    setTestScores(nextScores);
    if (testIndex + 1 >= questions.length)
      setTestResult(resolveTestResult(nextScores));
    else setTestIndex((value) => value + 1);
  };
  const copyPrompt = async () => {
    if (!promptResult) return;
    try {
      await navigator.clipboard.writeText(
        `[${promptResult.genre}] ${promptResult.relationship}. ${promptResult.place}에서 ${promptResult.incident}. ${promptResult.line}`,
      );
      notify("연성 소재를 복사했어요.");
    } catch {
      notify("화면의 문장을 직접 선택해 주세요.");
    }
  };

  async function loadRoom(roomId: string) {
    if (firebaseConfigured) {
      const services = getFirebaseServices();
      if (services) {
        try {
          const snapshot = await getDoc(
            doc(services.db, "firstImpressions", roomId),
          );
          if (snapshot.exists()) {
            setActiveRoom({
              id: snapshot.id,
              ...snapshot.data(),
            } as FirstImpressionRoom);
            return;
          }
        } catch {
          /* local fallback */
        }
      }
    }
    const localRooms = readLocal<FirstImpressionRoom[]>(roomKey, []);
    const found = localRooms.find((item) => item.id === roomId);
    if (found) {
      setActiveRoom(found);
      setRoomResponses(
        readLocal<Record<string, FirstImpressionResponse[]>>(responseKey, {})[
          roomId
        ] || [],
      );
    }
  }
  async function loadRoomResponses(roomId: string) {
    const services = getFirebaseServices();
    if (!services) return;
    try {
      const snapshot = await getDocs(
        collection(services.db, "firstImpressions", roomId, "responses"),
      );
      setRoomResponses(
        snapshot.docs.map(
          (item) =>
            ({ id: item.id, ...item.data() }) as FirstImpressionResponse,
        ),
      );
    } catch {
      notify("답변함은 캐릭터를 등록한 계정에서만 볼 수 있어요.");
    }
  }
  const createFirstImpression = async () => {
    if (!characterName.trim()) return notify("캐릭터 이름을 적어주세요.");
    if (!characterImage) return notify("캐릭터 이미지를 올려주세요.");
    setSavingRoom(true);
    const roomId = uid();
    try {
      if (firebaseConfigured) {
        const services = getFirebaseServices();
        if (!services) throw new Error("firebase unavailable");
        let owner = user;
        if (!owner || owner.isAnonymous) owner = await loginWithGoogle();
        if (!owner) return;
        let imageUrl = characterImage;
        if (characterImageFile) {
          const imageRef = ref(
            services.storage,
            `first-impressions/${owner.uid}/${roomId}-${characterImageFile.name}`,
          );
          await uploadBytes(imageRef, characterImageFile, {
            contentType: characterImageFile.type,
          });
          imageUrl = await getDownloadURL(imageRef);
        }
        const room: FirstImpressionRoom = {
          id: roomId,
          ownerId: owner.uid,
          ownerName: owner.displayName || "등록자",
          characterName: characterName.trim(),
          intro: characterIntro.trim(),
          image: imageUrl,
        };
        await setDoc(doc(services.db, "firstImpressions", roomId), {
          ...room,
          createdAt: serverTimestamp(),
        });
        setRooms((items) => [room, ...items]);
        setActiveRoom(room);
        setRoomResponses([]);
      } else {
        const room: FirstImpressionRoom = {
          id: roomId,
          ownerId: user?.uid || "local-owner",
          ownerName: user?.displayName || "등록자",
          characterName: characterName.trim(),
          intro: characterIntro.trim(),
          image: characterImage,
        };
        const next = [room, ...rooms];
        const persistable = next.map((item) =>
          item.image.length > 2_000_000 ? { ...item, image: "" } : item,
        );
        try {
          localStorage.setItem(roomKey, JSON.stringify(persistable));
        } catch {
          /* large images remain available for this session */
        }
        setRooms(next);
        setActiveRoom(room);
        setRoomResponses([]);
      }
      const url = new URL(window.location.href);
      url.searchParams.set("impression", roomId);
      url.hash = "first-impression";
      window.history.replaceState({}, "", url);
      notify("익명 첫인상 링크를 만들었어요.");
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      notify(
        code.includes("storage")
          ? "Firebase Storage 설정과 요금제 연결을 확인해 주세요."
          : "첫인상 방을 만들지 못했어요. Firebase 설정을 확인해 주세요.",
      );
    } finally {
      setSavingRoom(false);
    }
  };
  const submitFirstImpression = async () => {
    if (!activeRoom) return;
    if (!responseText.trim() && !responseKeywords.length)
      return notify("첫인상 문장이나 키워드를 하나 이상 남겨주세요.");
    const response: FirstImpressionResponse = {
      id: uid(),
      nickname: responseNickname.trim() || "익명",
      text: responseText.trim(),
      keywords: responseKeywords,
    };
    try {
      if (firebaseConfigured) {
        const services = getFirebaseServices();
        if (!services) throw new Error("firebase unavailable");
        if (!services.auth.currentUser) await signInAnonymously(services.auth);
        await addDoc(
          collection(
            services.db,
            "firstImpressions",
            activeRoom.id,
            "responses",
          ),
          {
            nickname: response.nickname,
            text: response.text,
            keywords: response.keywords,
            createdAt: serverTimestamp(),
            responderId: services.auth.currentUser?.uid || "anonymous",
          },
        );
      } else {
        const all = readLocal<Record<string, FirstImpressionResponse[]>>(
          responseKey,
          {},
        );
        all[activeRoom.id] = [response, ...(all[activeRoom.id] || [])];
        localStorage.setItem(responseKey, JSON.stringify(all));
        if (activeRoom.ownerId === (user?.uid || "local-owner"))
          setRoomResponses(all[activeRoom.id]);
      }
      setResponseNickname("");
      setResponseText("");
      setResponseKeywords([]);
      notify("익명 첫인상을 전달했어요.");
    } catch {
      notify(
        "익명 답변을 사용하려면 Firebase Authentication에서 Anonymous 제공업체를 켜 주세요.",
      );
    }
  };
  const copyRoomLink = async () => {
    if (!activeRoom) return;
    const url = new URL(window.location.href);
    url.searchParams.set("impression", activeRoom.id);
    url.hash = "first-impression";
    await navigator.clipboard.writeText(url.toString());
    notify("첫인상 링크를 복사했어요.");
  };
  const chooseCommissionTier = (tier: CommissionTier) => {
    setCommissionTierId(tier.id);
    setCommissionValues((values) =>
      Object.fromEntries(
        tier.fields.map((field) => [field, values[field] || ""]),
      ),
    );
  };
  const commissionText = () =>
    [
      `[${commissionTitle || "커미션 신청서"}]`,
      `양식: ${commissionTier.name}`,
      "",
      ...commissionTier.fields.map(
        (field) => `${field}\n${commissionValues[field]?.trim() || "(미작성)"}`,
      ),
    ].join("\n");
  const copyCommission = async () => {
    try {
      await navigator.clipboard.writeText(commissionText());
      notify("커미션 신청서를 복사했어요.");
    } catch {
      notify("복사 권한을 확인해 주세요.");
    }
  };
  const saveCommissionPng = async () => {
    if (!commissionCardRef.current) return;
    try {
      const { toPng } = await import("html-to-image");
      const data = await toPng(commissionCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `${commissionTitle || "커미션-신청서"}.png`;
      link.href = data;
      link.click();
      notify("PNG로 저장했어요.");
    } catch {
      notify("PNG 저장에 실패했어요. 브라우저 다운로드 권한을 확인해 주세요.");
    }
  };
  const navItems: [ViewName, string][] = [
    ["first-impression", "첫인상"],
    ["worldcup", "월드컵"],
    ["tests", "테스트"],
    ["commission", "커미션 신청서"],
    ["prompts", "연성 소재"],
  ];

  return (
    <main className="site-shell">
      <div className="utility-bar">
        <div>
          <span>취향이 콘텐츠가 되는 곳</span>
          <span>익명 첫인상부터 월드컵·테스트·신청서까지</span>
        </div>
      </div>
      <header className="site-header">
        <button
          className="logo-button"
          type="button"
          onClick={() => navigate("home")}
          aria-label="오타쿠놀이터 홈"
        >
          <Logo />
        </button>
        <nav>
          {navItems.map(([name, label]) => (
            <button
              type="button"
              key={name}
              className={view === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="login-button"
            type="button"
            disabled={authLoading}
            onClick={() =>
              user && !user.isAnonymous
                ? setModal("account")
                : void loginWithGoogle()
            }
          >
            {user?.photoURL && !user.isAnonymous ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="google-g">G</span>
            )}
            {authLoading
              ? "확인 중"
              : user && !user.isAnonymous
                ? user.displayName || "내 계정"
                : "Google로 로그인"}
          </button>
          <button
            className="create-button"
            type="button"
            onClick={() => navigate("first-impression")}
          >
            ＋ 첫인상 등록
          </button>
        </div>
      </header>

      {view === "home" && (
        <>
          <section className="home-hero">
            <div className="home-hero-copy">
              <span className="eyebrow">FIRST IMPRESSION PLAYGROUND</span>
              <h1>
                내 캐릭터,
                <br />
                남들은 어떻게 볼까?
              </h1>
              <p>
                캐릭터 이미지를 올리고 링크만 공유하세요.
                <br />
                친구들은 로그인 없이 익명으로 첫인상을 남길 수 있어요.
              </p>
              <div>
                <button
                  className="primary-cta"
                  type="button"
                  onClick={() => navigate("first-impression")}
                >
                  익명 첫인상 만들기
                </button>
                <button type="button" onClick={() => navigate("worldcup")}>
                  다른 놀이 보기
                </button>
              </div>
            </div>
            <div className="home-hero-art">
              <span>FEATURED CHARACTER</span>
              <div className="art-orbit" />
              <img src={heroImage} alt="사용자가 제공한 안테 캐릭터 일러스트" />
            </div>
          </section>
          <section className="home-shortcuts">
            <button type="button" onClick={() => navigate("first-impression")}>
              <i>01</i>
              <b>익명 첫인상</b>
              <small>링크로 받고 내 답변함에서 보기</small>
              <span>주요 기능 →</span>
            </button>
            <button type="button" onClick={() => navigate("worldcup")}>
              <i>02</i>
              <b>오타쿠형 월드컵</b>
              <small>이미지·설명까지 넣고 실제 대결</small>
              <span>열기 →</span>
            </button>
            <button type="button" onClick={() => navigate("tests")}>
              <i>03</i>
              <b>성향 테스트</b>
              <small>직접 변수형과 MBTI형 중 선택</small>
              <span>열기 →</span>
            </button>
            <button type="button" onClick={() => navigate("commission")}>
              <i>04</i>
              <b>커미션 신청서</b>
              <small>복사하고 PNG로 바로 저장</small>
              <span>열기 →</span>
            </button>
          </section>
          <section className="home-explain">
            <div>
              <span>HOW IT WORKS</span>
              <h2>
                캐릭터 하나,
                <br />세 번의 클릭
              </h2>
            </div>
            <ol>
              <li>
                <b>1</b>
                <h3>이미지 등록</h3>
                <p>이름과 짧은 소개를 적어요.</p>
              </li>
              <li>
                <b>2</b>
                <h3>링크 공유</h3>
                <p>SNS나 단체방에 링크를 보내요.</p>
              </li>
              <li>
                <b>3</b>
                <h3>익명 답변 확인</h3>
                <p>등록한 사람만 답변함을 열어요.</p>
              </li>
            </ol>
          </section>
        </>
      )}

      {view === "first-impression" && (
        <section className="page-view impression-page">
          <div className="page-heading">
            <span>ANONYMOUS FIRST IMPRESSION</span>
            <h1>익명 캐릭터 첫인상</h1>
            <p>
              로그인을 강요하지 않는 한마디. 답변은 캐릭터를 등록한 사람의
              답변함에 모여요.
            </p>
          </div>
          {!activeRoom ? (
            <div className="impression-layout">
              <form
                className="clean-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createFirstImpression();
                }}
              >
                <div className="form-title">
                  <span>01</span>
                  <div>
                    <h2>첫인상 받을 캐릭터 등록</h2>
                    <p>
                      등록자는 Google 로그인, 답변자는 익명으로 참여할 수
                      있어요.
                    </p>
                  </div>
                </div>
                <label>
                  캐릭터 이름
                  <input
                    value={characterName}
                    onChange={(event) => setCharacterName(event.target.value)}
                    placeholder="예: 안테 홀슈타인"
                  />
                </label>
                <label>
                  한 줄 소개
                  <textarea
                    value={characterIntro}
                    onChange={(event) => setCharacterIntro(event.target.value)}
                    placeholder="설정을 다 알려주지 않아도 좋아요."
                  />
                </label>
                <label className="upload-drop">
                  {characterImage ? (
                    <img src={characterImage} alt="업로드 미리보기" />
                  ) : (
                    <>
                      <b>캐릭터 이미지 올리기</b>
                      <small>PNG · JPG · WEBP / 최대 10MB</small>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setCharacterImageFile(file);
                      fileToData(file, setCharacterImage);
                    }}
                  />
                </label>
                <button
                  className="primary-cta wide-button"
                  type="button"
                  disabled={savingRoom}
                  onClick={() => void createFirstImpression()}
                >
                  {savingRoom ? "링크 만드는 중…" : "익명 첫인상 링크 만들기"}
                </button>
              </form>
              <aside className="impression-guide">
                <span>WHAT PEOPLE SEE</span>
                <h2>답변자는 이렇게 보여요</h2>
                <div className="mini-impression-card">
                  <div>
                    {characterImage ? (
                      <img src={characterImage} alt="" />
                    ) : (
                      <span>OC</span>
                    )}
                  </div>
                  <h3>{characterName || "캐릭터 이름"}</h3>
                  <p>
                    {characterIntro ||
                      "이 캐릭터의 첫인상을 자유롭게 남겨 주세요."}
                  </p>
                  <div>
                    {firstKeywords.slice(0, 4).map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <textarea disabled placeholder="익명 첫인상 한마디" />
                </div>
                <p className="privacy-note">
                  닉네임은 비워 두면 ‘익명’으로 전송돼요. 답변 목록은
                  등록자에게만 공개됩니다.
                </p>
              </aside>
            </div>
          ) : (
            <div className="room-layout">
              <article className="public-room">
                <button
                  className="text-back"
                  type="button"
                  onClick={() => {
                    setActiveRoom(null);
                    const url = new URL(window.location.href);
                    url.searchParams.delete("impression");
                    window.history.replaceState({}, "", url);
                  }}
                >
                  ← 새 캐릭터 등록
                </button>
                <div className="room-character">
                  <img src={activeRoom.image} alt={activeRoom.characterName} />
                  <div>
                    <span>FIRST IMPRESSION FOR</span>
                    <h2>{activeRoom.characterName}</h2>
                    <p>
                      {activeRoom.intro ||
                        "이미지를 보고 떠오르는 첫인상을 남겨 주세요."}
                    </p>
                  </div>
                </div>
                <div className="keyword-pick">
                  <b>먼저 떠오르는 키워드</b>
                  {firstKeywords.map((item) => (
                    <button
                      type="button"
                      className={
                        responseKeywords.includes(item) ? "active" : ""
                      }
                      key={item}
                      onClick={() =>
                        setResponseKeywords((items) =>
                          items.includes(item)
                            ? items.filter((value) => value !== item)
                            : [...items, item],
                        )
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <label>
                  닉네임 <small>선택 · 비우면 익명</small>
                  <input
                    value={responseNickname}
                    onChange={(event) =>
                      setResponseNickname(event.target.value)
                    }
                    placeholder="익명"
                  />
                </label>
                <label>
                  첫인상 한마디
                  <textarea
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                    maxLength={500}
                    placeholder="이미지만 보고 떠오른 느낌을 편하게 적어 주세요."
                  />
                </label>
                <button
                  className="primary-cta wide-button"
                  type="button"
                  onClick={() => void submitFirstImpression()}
                >
                  익명으로 전달하기
                </button>
              </article>
              <aside className="owner-box">
                <span>OWNER TOOLS</span>
                <h2>등록자 도구</h2>
                <button type="button" onClick={() => void copyRoomLink()}>
                  공유 링크 복사
                </button>
                {activeRoom.ownerId === (user?.uid || "local-owner") ? (
                  <>
                    <div className="inbox-title">
                      <b>내 답변함</b>
                      <small>{roomResponses.length}개의 답변</small>
                    </div>
                    {roomResponses.length ? (
                      <div className="response-list">
                        {roomResponses.map((item) => (
                          <article key={item.id}>
                            <div>
                              {item.keywords.map((keyword) => (
                                <span key={keyword}>{keyword}</span>
                              ))}
                            </div>
                            <p>{item.text || "키워드만 남긴 답변"}</p>
                            <small>{item.nickname || "익명"}</small>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-copy">
                        아직 도착한 답변이 없어요. 링크를 공유해 보세요.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="empty-copy">
                    답변함은 이 캐릭터를 등록한 Google 계정에서만 보여요.
                  </p>
                )}
              </aside>
            </div>
          )}
          {!activeRoom && rooms.length > 0 && (
            <div className="my-room-list">
              <div>
                <span>MY ROOMS</span>
                <h2>내 첫인상 링크</h2>
              </div>
              {rooms.map((room) => (
                <button
                  type="button"
                  key={room.id}
                  onClick={() => {
                    setActiveRoom(room);
                    void loadRoomResponses(room.id);
                  }}
                >
                  <img src={room.image} alt="" />
                  <span>
                    <b>{room.characterName}</b>
                    <small>{room.intro || "소개 없음"}</small>
                  </span>
                  <i>열기 →</i>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "worldcup" && (
        <section className="page-view">
          <div className="page-heading">
            <span>WORLD CUP</span>
            <h1>오타쿠형 월드컵</h1>
            <p>
              이 페이지에는 월드컵만 있어요. 참가자 이미지와 설명을 등록하면
              바로 대결을 시작할 수 있습니다.
            </p>
          </div>
          <div className="worldcup-intro">
            <div>
              <b>VS</b>
              <h2>
                표지가 아니라
                <br />
                실제로 플레이하는 월드컵
              </h2>
              <ul>
                <li>참가자 수 제한 없이 추가</li>
                <li>이미지·대사·태그 함께 등록</li>
                <li>자동 라운드 진행과 최종 우승</li>
              </ul>
              <button
                className="primary-cta"
                type="button"
                onClick={() => resetBuilder("월드컵")}
              >
                새 월드컵 만들기
              </button>
            </div>
            <div className="versus-demo">
              <article>
                <span>A</span>
                <h3>최애 캐릭터</h3>
              </article>
              <i>VS</i>
              <article>
                <span>B</span>
                <h3>관계성 조합</h3>
              </article>
            </div>
          </div>
          <div className="template-section">
            <div>
              <span>TEMPLATES</span>
              <h2>어떤 대결을 열까요?</h2>
            </div>
            <div className="template-grid">
              {worldcupTemplates.map((item, index) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => resetBuilder("월드컵", item)}
                >
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <b>{item}</b>
                  <small>참가자를 채우고 바로 대결 시작</small>
                  <span>이 템플릿으로 만들기 →</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {view === "tests" && (
        <section className="page-view">
          <div className="page-heading">
            <span>TEST STUDIO</span>
            <h1>테스트 유형부터 선택하세요</h1>
            <p>
              테스트 페이지에는 테스트 제작 기능만 모았어요. 이용자에게 변수와
              점수는 보이지 않습니다.
            </p>
          </div>
          <div className="test-type-grid">
            <button
              type="button"
              onClick={() =>
                resetBuilder("테스트", testTemplates[0], "variable")
              }
            >
              <span>A · B · C · D</span>
              <h2>직접 변수형</h2>
              <p>
                결과가 네 가지라면 선택지마다 A, B, C, D에 원하는 점수를
                연결해요. 결과 개수와 선택지 수는 자유롭게 늘릴 수 있어요.
              </p>
              <ul>
                <li>결과 변수 직접 이름 짓기</li>
                <li>한 선택지에 여러 변수 연결</li>
                <li>음수부터 양수 점수까지</li>
              </ul>
              <b>직접 변수형 만들기 →</b>
            </button>
            <button
              type="button"
              onClick={() => resetBuilder("테스트", testTemplates[0], "mbti")}
            >
              <span>EI · SN · TF · JP</span>
              <h2>MBTI형</h2>
              <p>
                네 개 성향 축의 숨은 점수를 합산해 16가지 유형을 만들어요. 각
                유형의 결과 이름과 설명도 바꿀 수 있어요.
              </p>
              <ul>
                <li>4개 성향 축 자동 계산</li>
                <li>16개 결과 이름 편집</li>
                <li>선택지 개수 자유롭게 추가</li>
              </ul>
              <b>MBTI형 만들기 →</b>
            </button>
          </div>
          <div className="template-section">
            <div>
              <span>TEST IDEAS</span>
              <h2>오타쿠용 테스트 템플릿</h2>
            </div>
            <div className="template-grid compact">
              {testTemplates.map((item, index) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => resetBuilder("테스트", item, "variable")}
                >
                  <i>{String(index + 1).padStart(2, "0")}</i>
                  <b>{item}</b>
                  <small>직접 변수형으로 시작</small>
                  <span>선택 →</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {view === "commission" && (
        <section className="page-view">
          <div className="page-heading">
            <span>COMMISSION REQUEST BUILDER</span>
            <h1>커미션 신청서 제작기</h1>
            <p>
              작업 규모에 맞는 틀을 고르고 필요한 내용만 채우세요. 한 번에
              복사하거나 PNG 한 장으로 저장할 수 있어요.
            </p>
          </div>
          <div className="commission-tier-grid">
            {commissionTiers.map((tier) => (
              <button
                type="button"
                key={tier.id}
                className={commissionTierId === tier.id ? "active" : ""}
                onClick={() => chooseCommissionTier(tier)}
              >
                <span>{tier.badge}</span>
                <h2>{tier.name}</h2>
                <p>{tier.description}</p>
                <b>{tier.fields.length}개 항목</b>
              </button>
            ))}
          </div>
          <div className="commission-workspace">
            <form
              className="commission-editor"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="form-title">
                <span>✎</span>
                <div>
                  <h2>{commissionTier.name}</h2>
                  <p>비워 둔 항목은 PNG에도 ‘미작성’으로 표시돼요.</p>
                </div>
              </div>
              <label>
                신청서 제목
                <input
                  value={commissionTitle}
                  onChange={(event) => setCommissionTitle(event.target.value)}
                />
              </label>
              {commissionTier.fields.map((field) => (
                <label key={field}>
                  {field}
                  <textarea
                    value={commissionValues[field] || ""}
                    onChange={(event) =>
                      setCommissionValues({
                        ...commissionValues,
                        [field]: event.target.value,
                      })
                    }
                    placeholder={`${field} 내용을 적어 주세요.`}
                  />
                </label>
              ))}
            </form>
            <aside className="commission-preview">
              <div className="preview-label">
                <span>LIVE PREVIEW</span>
                <small>저장될 카드 미리보기</small>
              </div>
              <div className="commission-card" ref={commissionCardRef}>
                <div className="commission-card-head">
                  <span>COMMISSION REQUEST</span>
                  <h2>{commissionTitle || "커미션 신청서"}</h2>
                  <p>
                    {commissionTier.name} · {commissionTier.description}
                  </p>
                </div>
                {commissionTier.fields.map((field, index) => (
                  <section key={field}>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <div>
                      <b>{field}</b>
                      <p>{commissionValues[field]?.trim() || "미작성"}</p>
                    </div>
                  </section>
                ))}
                <footer>OTAKU PLAYGROUND · COMMISSION FORM</footer>
              </div>
              <div className="commission-actions">
                <button type="button" onClick={() => void copyCommission()}>
                  신청서 복사
                </button>
                <button
                  className="primary-cta"
                  type="button"
                  onClick={() => void saveCommissionPng()}
                >
                  PNG로 저장
                </button>
              </div>
            </aside>
          </div>
        </section>
      )}

      {view === "prompts" && (
        <section className="page-view prompt-page">
          <div className="page-heading">
            <span>WRITING PROMPT</span>
            <h1>연성 소재 뽑기</h1>
            <p>관계, 분위기, 장소, 사건과 대사를 한 장으로 조합합니다.</p>
          </div>
          <div className="prompt-machine">
            <div className="prompt-machine-copy">
              <span>RANDOM SCENE GENERATOR</span>
              <h2>
                막힌 다음 장면을
                <br />
                우연에게 맡겨 보세요.
              </h2>
              <p>마음에 들 때까지 몇 번이든 다시 뽑을 수 있어요.</p>
              <button
                className="primary-cta"
                type="button"
                onClick={() =>
                  setPromptResult({
                    genre: randomItem(promptParts.genre),
                    relationship: randomItem(promptParts.relationship),
                    mood: randomItem(promptParts.mood),
                    place: randomItem(promptParts.place),
                    incident: randomItem(promptParts.incident),
                    line: randomItem(promptParts.line),
                  })
                }
              >
                {promptResult ? "다시 뽑기 ↻" : "소재 한 장 뽑기"}
              </button>
            </div>
            <div className="drawn-prompt">
              {promptResult ? (
                <>
                  <div>
                    <span>{promptResult.genre}</span>
                    <span>{promptResult.mood}</span>
                  </div>
                  <h3>{promptResult.relationship}</h3>
                  <p>
                    <b>장소</b>
                    {promptResult.place}
                  </p>
                  <p>
                    <b>사건</b>
                    {promptResult.incident}
                  </p>
                  <blockquote>{promptResult.line}</blockquote>
                  <button type="button" onClick={() => void copyPrompt()}>
                    이 소재 복사하기
                  </button>
                </>
              ) : (
                <div className="prompt-empty">
                  <span>✦</span>
                  <h3>아직 뽑은 소재가 없어요.</h3>
                  <p>버튼을 누르면 이곳에 한 장이 도착합니다.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <Logo />
        <p>익명 첫인상 · 월드컵 · 테스트 · 커미션 신청서 · 연성 소재</p>
        <div>
          {navItems.map(([name, label]) => (
            <button type="button" key={name} onClick={() => navigate(name)}>
              {label}
            </button>
          ))}
        </div>
      </footer>
      <nav className="mobile-nav">
        <button type="button" onClick={() => navigate("home")}>
          <span>⌂</span>홈
        </button>
        <button type="button" onClick={() => navigate("first-impression")}>
          <span>?</span>첫인상
        </button>
        <button type="button" onClick={() => navigate("worldcup")}>
          <span>VS</span>월드컵
        </button>
        <button type="button" onClick={() => navigate("tests")}>
          <span>＋</span>테스트
        </button>
        <button type="button" onClick={() => setModal("library")}>
          <span>□</span>보관함
        </button>
      </nav>

      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setModal(null)
          }
        >
          <section
            className={`modal ${modal}-modal`}
            role="dialog"
            aria-modal="true"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="닫기"
              onClick={() => setModal(null)}
            >
              ×
            </button>
            {modal === "account" && user && (
              <div className="account-panel">
                <div className="account-avatar">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    "G"
                  )}
                </div>
                <span>GOOGLE ACCOUNT</span>
                <h2>{user.displayName || "오타쿠놀이터 회원"}</h2>
                <p>{user.email}</p>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setModal(null);
                      navigate("first-impression");
                    }}
                  >
                    내 첫인상함
                  </button>
                  <button type="button" onClick={() => setModal("library")}>
                    내 보관함
                  </button>
                  <button type="button" onClick={() => void logout()}>
                    로그아웃
                  </button>
                </div>
              </div>
            )}
            {modal === "loginHelp" && (
              <div className="login-help">
                <span>GOOGLE LOGIN SETUP</span>
                <h2>Firebase 연결이 필요해요</h2>
                <p>
                  승인 도메인은 ‘로그인을 시작해도 되는 사이트 주소’예요. GitHub
                  Pages라면 경로 없이 도메인만 등록합니다.
                </p>
                <ol>
                  <li>
                    Firebase Console → Authentication → Sign-in method에서
                    Google을 켜요.
                  </li>
                  <li>
                    Authentication → Settings → Authorized domains에{" "}
                    <b>kkyareuk.github.io</b>를 추가해요.
                  </li>
                  <li>
                    익명 첫인상 답변을 받으려면 Anonymous 제공업체도 켜요.
                  </li>
                  <li>
                    저장소 Actions secrets에 README의 Firebase 값을 넣어요.
                  </li>
                </ol>
                <p className="help-note">
                  <b>otaku-4143.firebaseapp.com을 ‘꺄륵 게임즈’로 바꾸려면?</b>
                  <br />
                  ‘꺄륵 게임즈’는 Google Auth Platform의 앱 이름에서 설정하고,
                  주소 자체는 소유한 맞춤 도메인을 Firebase Hosting에 연결한 뒤
                  authDomain으로 사용해야 해요.
                </p>
                <button type="button" onClick={() => setModal(null)}>
                  확인
                </button>
              </div>
            )}
            {modal === "creator" && (
              <div className="creator-panel">
                <div className="modal-heading">
                  <span>
                    {kind === "월드컵" ? "WORLD CUP MAKER" : "TEST MAKER"}
                  </span>
                  <h2>{kind} 만들기</h2>
                  <p>
                    {kind === "월드컵"
                      ? "참가자와 실제 대결 내용을 설정해요."
                      : `${testMode === "mbti" ? "MBTI형" : "직접 변수형"} 테스트의 결과·질문·선택지를 설정해요.`}
                  </p>
                </div>
                <div className="basic-fields">
                  <label>
                    템플릿
                    <select
                      value={template}
                      onChange={(event) => setTemplate(event.target.value)}
                    >
                      {templateOptions.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    제목
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="콘텐츠 제목"
                    />
                  </label>
                  <label className="wide">
                    소개
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="참여자에게 보여줄 소개"
                    />
                  </label>
                  <label>
                    컬러 테마
                    <select
                      value={theme}
                      onChange={(event) => setTheme(event.target.value)}
                    >
                      {themes.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="file-field">
                    대표 표지
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        event.target.files?.[0] &&
                        fileToData(event.target.files[0], setCover)
                      }
                    />
                    <span>{cover ? "이미지 선택됨" : "이미지 선택"}</span>
                  </label>
                </div>
                {kind === "월드컵" && (
                  <div className="sub-builder">
                    <div className="builder-heading">
                      <div>
                        <span>ENTRIES</span>
                        <h3>월드컵 참가자</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEntries((items) => [
                            ...items,
                            newWorldcupEntry(items.length + 1),
                          ])
                        }
                      >
                        ＋ 참가자 추가
                      </button>
                    </div>
                    <div className="entry-grid">
                      {entries.map((entry, index) => (
                        <article className="entry-editor" key={entry.id}>
                          <b>{index + 1}</b>
                          <label className="entry-image">
                            {entry.image ? (
                              <img src={entry.image} alt="" />
                            ) : (
                              <span>이미지 추가</span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                event.target.files?.[0] &&
                                fileToData(event.target.files[0], (image) =>
                                  setEntries((items) =>
                                    items.map((item) =>
                                      item.id === entry.id
                                        ? { ...item, image }
                                        : item,
                                    ),
                                  ),
                                )
                              }
                            />
                          </label>
                          <input
                            aria-label="참가자 이름"
                            value={entry.name}
                            onChange={(event) =>
                              updateEntry(entry.id, "name", event.target.value)
                            }
                            placeholder="참가자 이름"
                          />
                          <textarea
                            aria-label="참가자 설명"
                            value={entry.description}
                            onChange={(event) =>
                              updateEntry(
                                entry.id,
                                "description",
                                event.target.value,
                              )
                            }
                            placeholder="설명·대사·태그"
                          />
                          {entries.length > 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEntries((items) =>
                                  items.filter((item) => item.id !== entry.id),
                                )
                              }
                            >
                              삭제
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {kind === "테스트" && (
                  <div className="sub-builder test-builder">
                    <div className="test-mode">
                      <div>
                        <b>계산 방식</b>
                        <p>이용자에게 점수와 변수는 보이지 않아요.</p>
                      </div>
                      <button
                        type="button"
                        className={testMode === "variable" ? "active" : ""}
                        onClick={() => changeTestMode("variable")}
                      >
                        <b>직접 변수형</b>
                        <small>A·B·C·D처럼 결과를 직접 만들기</small>
                      </button>
                      <button
                        type="button"
                        className={testMode === "mbti" ? "active" : ""}
                        onClick={() => changeTestMode("mbti")}
                      >
                        <b>MBTI형</b>
                        <small>E/I · S/N · T/F · J/P 계산</small>
                      </button>
                    </div>
                    {testMode === "variable" ? (
                      <div className="result-editor">
                        <div className="builder-heading">
                          <div>
                            <span>RESULT VARIABLES</span>
                            <h3>결과 변수</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setResults((items) => [
                                ...items,
                                {
                                  id: uid(),
                                  key: `R${items.length + 1}`,
                                  title: `결과 ${items.length + 1}`,
                                  description: "",
                                },
                              ])
                            }
                          >
                            ＋ 결과 추가
                          </button>
                        </div>
                        <p className="builder-guide">
                          변수 이름은 제작자만 봐요. 각 선택지에서 이 변수에
                          숨은 점수를 줄 수 있습니다.
                        </p>
                        <div className="result-grid">
                          {results.map((result) => (
                            <article key={result.id}>
                              <input
                                className="variable-key"
                                aria-label="변수 이름"
                                value={result.key}
                                maxLength={4}
                                onChange={(event) =>
                                  setResults((items) =>
                                    items.map((item) =>
                                      item.id === result.id
                                        ? {
                                            ...item,
                                            key: event.target.value.toUpperCase(),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <input
                                aria-label="결과 제목"
                                value={result.title}
                                onChange={(event) =>
                                  setResults((items) =>
                                    items.map((item) =>
                                      item.id === result.id
                                        ? { ...item, title: event.target.value }
                                        : item,
                                    ),
                                  )
                                }
                              />
                              <textarea
                                aria-label="결과 설명"
                                value={result.description}
                                onChange={(event) =>
                                  setResults((items) =>
                                    items.map((item) =>
                                      item.id === result.id
                                        ? {
                                            ...item,
                                            description: event.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="결과 설명"
                              />
                              {results.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setResults((items) =>
                                      items.filter(
                                        (item) => item.id !== result.id,
                                      ),
                                    )
                                  }
                                >
                                  삭제
                                </button>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mbti-editor">
                        <span>MBTI VARIABLES</span>
                        <h3>4개 성향 축 · 16개 결과</h3>
                        <div className="mbti-pairs">
                          <b>E / I</b>
                          <b>S / N</b>
                          <b>T / F</b>
                          <b>J / P</b>
                        </div>
                        <details>
                          <summary>16개 결과 이름 편집</summary>
                          <div className="mbti-label-grid">
                            {mbtiTypes.map((code) => (
                              <label key={code}>
                                <b>{code}</b>
                                <input
                                  value={mbtiLabels[code]}
                                  onChange={(event) =>
                                    setMbtiLabels({
                                      ...mbtiLabels,
                                      [code]: event.target.value,
                                    })
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                    <div className="builder-heading question-heading">
                      <div>
                        <span>QUESTIONS</span>
                        <h3>질문과 선택지</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setQuestions((items) => [
                            ...items,
                            newQuestion(testMode, items.length + 1),
                          ])
                        }
                      >
                        ＋ 질문 추가
                      </button>
                    </div>
                    <div className="question-list">
                      {questions.map((question, qIndex) => (
                        <article className="question-editor" key={question.id}>
                          <div className="question-top">
                            <b>Q{qIndex + 1}</b>
                            <input
                              aria-label="질문"
                              value={question.text}
                              onChange={(event) =>
                                updateQuestionText(
                                  question.id,
                                  event.target.value,
                                )
                              }
                              placeholder="질문을 입력하세요"
                            />
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setQuestions((items) =>
                                    items.filter(
                                      (item) => item.id !== question.id,
                                    ),
                                  )
                                }
                              >
                                질문 삭제
                              </button>
                            )}
                          </div>
                          <div className="choice-list">
                            {question.choices.map((choice, cIndex) => (
                              <div className="choice-editor" key={choice.id}>
                                <div className="choice-visible">
                                  <span>{cIndex + 1}</span>
                                  <input
                                    aria-label={`선택지 ${cIndex + 1}`}
                                    value={choice.text}
                                    onChange={(event) =>
                                      updateChoiceText(
                                        question.id,
                                        choice.id,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="이용자에게 보일 선택지"
                                  />
                                  {question.choices.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeChoice(question.id, choice.id)
                                      }
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                                <div className="score-box">
                                  <small>제작자만 보는 숨은 점수</small>
                                  {choice.links.map((link) => (
                                    <div className="score-link" key={link.id}>
                                      <select
                                        aria-label="연결 변수"
                                        value={link.variable}
                                        onChange={(event) =>
                                          updateLink(
                                            question.id,
                                            choice.id,
                                            link.id,
                                            "variable",
                                            event.target.value,
                                          )
                                        }
                                      >
                                        {variableOptions.map((variable) => (
                                          <option key={variable}>
                                            {variable}
                                          </option>
                                        ))}
                                      </select>
                                      <span>＋</span>
                                      <input
                                        aria-label="점수"
                                        type="number"
                                        min="-10"
                                        max="10"
                                        value={link.score}
                                        onChange={(event) =>
                                          updateLink(
                                            question.id,
                                            choice.id,
                                            link.id,
                                            "score",
                                            Number(event.target.value),
                                          )
                                        }
                                      />
                                      <b>점</b>
                                      {choice.links.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeLink(
                                              question.id,
                                              choice.id,
                                              link.id,
                                            )
                                          }
                                        >
                                          삭제
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addLink(question.id, choice.id)
                                    }
                                  >
                                    ＋ 변수 하나 더 연결
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            className="add-choice"
                            type="button"
                            onClick={() => addChoice(question.id)}
                          >
                            ＋ 선택지 추가
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                <div className="modal-actions">
                  <button type="button" onClick={() => setModal("preview")}>
                    미리보기
                  </button>
                  <button type="button" onClick={saveDraft}>
                    보관함 저장
                  </button>
                  <button
                    className="primary"
                    type="button"
                    onClick={() =>
                      kind === "월드컵" ? startWorldcup() : startTest()
                    }
                  >
                    {kind === "월드컵" ? "대결 시작" : "테스트 풀기"} →
                  </button>
                </div>
              </div>
            )}
            {modal === "preview" && (
              <div className="preview-panel">
                <button
                  className="back-button"
                  type="button"
                  onClick={() => setModal("creator")}
                >
                  ← 편집으로
                </button>
                <div
                  className={`content-preview theme-${themes.indexOf(theme)}`}
                >
                  <div>
                    {cover ? (
                      <img src={cover} alt="콘텐츠 표지" />
                    ) : (
                      <span>{kind === "월드컵" ? "VS" : "f(x)"}</span>
                    )}
                  </div>
                  <article>
                    <small>
                      {kind} · {template}
                    </small>
                    <h2>{title || "제목을 입력해 주세요"}</h2>
                    <p>{description || "소개가 이곳에 표시됩니다."}</p>
                    <b>
                      {kind === "월드컵"
                        ? `${entries.length}명의 참가자`
                        : `${questions.length}개 질문 · ${testMode === "mbti" ? "MBTI형" : `${results.length}개 결과`}`}
                    </b>
                  </article>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setModal("creator")}>
                    계속 편집
                  </button>
                  <button type="button" onClick={saveDraft}>
                    보관함 저장
                  </button>
                  <button
                    className="primary"
                    type="button"
                    onClick={() =>
                      kind === "월드컵" ? startWorldcup() : startTest()
                    }
                  >
                    플레이 →
                  </button>
                </div>
              </div>
            )}
            {modal === "worldcupPlay" && (
              <div className="play-panel">
                <div className="modal-heading">
                  <span>LIVE WORLD CUP</span>
                  <h2>{champion ? "최종 우승" : title || "월드컵 대결"}</h2>
                  <p>
                    {champion
                      ? "당신의 선택이 끝났어요."
                      : "더 마음에 드는 쪽을 선택하세요."}
                  </p>
                </div>
                {champion ? (
                  <div className="result-card">
                    {champion.image ? (
                      <img src={champion.image} alt="우승자" />
                    ) : (
                      <span>🏆</span>
                    )}
                    <small>CHAMPION</small>
                    <h3>{champion.name}</h3>
                    <p>{champion.description}</p>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `${title} 우승: ${champion.name}`,
                        );
                        notify("결과를 복사했어요.");
                      }}
                    >
                      결과 복사
                    </button>
                  </div>
                ) : (
                  <div className="match-grid">
                    {tournamentQueue.slice(0, 2).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => chooseWinner(entry)}
                      >
                        {entry.image ? (
                          <img src={entry.image} alt={entry.name} />
                        ) : (
                          <span>{entry.name.slice(0, 1)}</span>
                        )}
                        <h3>{entry.name}</h3>
                        <p>{entry.description || "이 참가자를 선택하기"}</p>
                      </button>
                    ))}
                    <i>VS</i>
                  </div>
                )}
              </div>
            )}
            {modal === "testPlay" && (
              <div className="play-panel">
                <div className="modal-heading">
                  <span>LIVE TEST</span>
                  <h2>{title || "취향 테스트"}</h2>
                  <p>
                    {testResult
                      ? "결과가 도착했어요."
                      : `${testIndex + 1} / ${questions.length}`}
                  </p>
                </div>
                {testResult ? (
                  <div className="result-card test-result">
                    <span>{testResult.code}</span>
                    <small>YOUR RESULT</small>
                    <h3>{testResult.title}</h3>
                    <p>
                      {testResult.description ||
                        description ||
                        "당신의 선택이 만든 결과예요."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setTestIndex(0);
                        setTestScores({});
                        setTestResult(null);
                      }}
                    >
                      다시 풀기
                    </button>
                  </div>
                ) : (
                  <div className="live-question">
                    <small>QUESTION {testIndex + 1}</small>
                    <h3>{questions[testIndex]?.text}</h3>
                    {questions[testIndex]?.choices.map((choice, index) => (
                      <button
                        type="button"
                        key={choice.id}
                        onClick={() => answerTest(choice)}
                      >
                        <span>{index + 1}</span>
                        {choice.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {modal === "library" && (
              <div className="library-panel">
                <div className="modal-heading">
                  <span>MY LIBRARY</span>
                  <h2>내 보관함</h2>
                  <p>
                    월드컵과 테스트 임시 저장본은 현재 이 브라우저에 저장돼요.
                  </p>
                </div>
                {drafts.length ? (
                  <div className="draft-list">
                    {drafts.map((draft) => (
                      <article key={draft.id}>
                        {draft.cover ? (
                          <img src={draft.cover} alt="" />
                        ) : (
                          <span>{draft.kind === "월드컵" ? "VS" : "f(x)"}</span>
                        )}
                        <div>
                          <small>
                            {draft.kind} · {draft.template}
                          </small>
                          <h3>{draft.title}</h3>
                          <p>{draft.description || "소개 없음"}</p>
                        </div>
                        <button type="button" onClick={() => loadDraft(draft)}>
                          열기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = drafts.filter(
                              (item) => item.id !== draft.id,
                            );
                            setDrafts(next);
                            localStorage.setItem(
                              draftKey,
                              JSON.stringify(next),
                            );
                          }}
                        >
                          삭제
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span>□</span>
                    <h3>아직 저장한 콘텐츠가 없어요.</h3>
                    <p>월드컵이나 테스트를 만들어 첫 기록을 남겨보세요.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setModal(null);
                        navigate("tests");
                      }}
                    >
                      테스트 보러 가기
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {!firebaseConfigured && (
        <button
          className="dev-note"
          type="button"
          onClick={() => setModal("loginHelp")}
        >
          Firebase 설정 전 · 연결 방법 보기
        </button>
      )}
    </main>
  );
}
