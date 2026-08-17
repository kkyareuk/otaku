"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  doc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, isFirebaseConfigured, storage } from "@/lib/firebase";

type Character = {
  id: string;
  alias: string;
  ownerName: string;
  ownerId?: string;
  tags: string[];
  category: string;
  imageUrl: string;
  visibility: "public" | "private";
  isSample?: boolean;
};

type Reply = {
  id: string;
  characterId: string;
  personality: string;
  role: string;
  message: string;
  createdAt?: Timestamp | null;
};

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const sampleCharacter: Character = {
  id: "sample-ante-holstein",
  alias: "Ante Holstein",
  ownerName: "@Kkyareuk_",
  tags: ["캐릭터", "첫인상"],
  category: "SF",
  imageUrl: `${publicBasePath}/characters/ante-holstein.png`,
  visibility: "public",
  isSample: true,
};

const categories = ["전체", "판타지", "현대", "동양풍", "서양풍", "SF", "인외"];
const personalityOptions = [
  "차가워 보이지만 다정함",
  "은근한 장난꾸러기",
  "고독한 완벽주의자",
  "호기심 많은 괴짜",
  "능글맞은 책략가",
  "햇살 같은 낙천가",
];
const roleOptions = [
  "봉인된 대마법사",
  "왕실의 비밀 고문관",
  "도망친 실험체",
  "달을 지키는 수호자",
  "최종 보스의 오른팔",
  "평범해 보이는 흑막",
];

function Logo() {
  return (
    <span className="brand">
      <span className="brand-mark">O!</span>
      <span>오타쿠놀이터</span>
    </span>
  );
}

function CharacterImage({
  character,
  className = "",
}: {
  character: Character;
  className?: string;
}) {
  return (
    <div className={`real-character-image ${className}`}>
      {/* 사용자 원본을 자르거나 필터링하지 않고 그대로 표시한다. */}
      <img src={character.imageUrl} alt={`${character.alias} 캐릭터 이미지`} />
    </div>
  );
}

function dateLabel(timestamp?: Timestamp | null) {
  if (!timestamp) return "방금 전";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp.toDate());
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(auth));
  const [view, setView] = useState<"home" | "dashboard">("home");
  const [modal, setModal] = useState<"login" | "answer" | "create" | "success" | null>(null);
  const [characters, setCharacters] = useState<Character[]>([sampleCharacter]);
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character>(sampleCharacter);
  const [activeCharacterId, setActiveCharacterId] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [filter, setFilter] = useState("전체");
  const [personality, setPersonality] = useState(personalityOptions[0]);
  const [role, setRole] = useState(roleOptions[0]);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newCategory, setNewCategory] = useState("판타지");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openedFromUrlRef = useRef(false);

  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2400);
  };

  const explainFirebaseSetup = () => {
    setErrorMessage("Firebase 환경값이 아직 없습니다. .env.local 설정 후 실제 Google 로그인이 활성화됩니다.");
    setModal("login");
  };

  useEffect(() => {
    if (!auth) {
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setMyCharacters([]);
        setActiveCharacterId("");
        setReplies([]);
      }
    });
  }, []);

  useEffect(() => {
    const firestore = db;
    if (!firestore) return;
    const loadPublicCharacters = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(firestore, "characters"), where("visibility", "==", "public"), limit(24))
        );
        const remoteCharacters = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Character, "id">),
        }));
        setCharacters([sampleCharacter, ...remoteCharacters.filter((item) => item.id !== sampleCharacter.id)]);
      } catch {
        notify("공개 캐릭터를 불러오지 못했어요. Firebase 규칙을 확인해 주세요.");
      }
    };
    void loadPublicCharacters();
  }, []);

  useEffect(() => {
    const currentUser = user;
    const firestore = db;
    if (!currentUser || !firestore) {
      return;
    }
    const loadMine = async () => {
      const snapshot = await getDocs(
        query(collection(firestore, "characters"), where("ownerId", "==", currentUser.uid))
      );
      const mine = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<Character, "id">),
      }));
      setMyCharacters(mine);
      setActiveCharacterId((current) => current || mine[0]?.id || "");
    };
    void loadMine().catch(() => notify("내 캐릭터를 불러오지 못했어요."));
  }, [user]);

  useEffect(() => {
    const currentUser = user;
    const firestore = db;
    if (!currentUser || !firestore || !activeCharacterId) {
      return;
    }
    const loadReplies = async () => {
      const snapshot = await getDocs(
        query(collection(firestore, "replies"), where("characterId", "==", activeCharacterId))
      );
      const loaded = snapshot.docs
        .map((item) => ({ id: item.id, ...(item.data() as Omit<Reply, "id">) }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setReplies(loaded);
    };
    void loadReplies().catch(() => notify("답변을 불러오지 못했어요."));
  }, [user, activeCharacterId]);

  const uploadPreview = useMemo(
    () => (uploadFile ? URL.createObjectURL(uploadFile) : ""),
    [uploadFile]
  );

  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  useEffect(() => {
    if (openedFromUrlRef.current) return;
    const characterId = new URLSearchParams(window.location.search).get("character");
    if (!characterId) {
      openedFromUrlRef.current = true;
      return;
    }
    const linkedCharacter = characters.find((character) => character.id === characterId);
    if (!linkedCharacter) return;
    openedFromUrlRef.current = true;
    const timer = window.setTimeout(() => {
      setSelected(linkedCharacter);
      setPersonality(personalityOptions[0]);
      setRole(roleOptions[0]);
      setMessage("");
      setErrorMessage("");
      setModal("answer");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [characters]);

  const visibleCharacters = useMemo(
    () => characters.filter((item) => filter === "전체" || item.category === filter),
    [characters, filter]
  );
  const activeCharacter =
    myCharacters.find((item) => item.id === activeCharacterId) ?? myCharacters[0];

  const openAnswer = (character: Character) => {
    setSelected(character);
    setPersonality(personalityOptions[0]);
    setRole(roleOptions[0]);
    setMessage("");
    setErrorMessage("");
    setModal("answer");
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      explainFirebaseSetup();
      return;
    }
    setBusy(true);
    setErrorMessage("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      setModal(uploadFile || newName.trim() ? "create" : null);
      notify("Google 로그인이 완료됐어요.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Google 로그인에 실패했습니다.";
      setErrorMessage(text);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    setView("home");
    notify("로그아웃했어요.");
  };

  const goDashboard = () => {
    if (!user) {
      setModal("login");
      return;
    }
    setView("dashboard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyShareLink = async (characterId: string) => {
    const shareUrl = new URL(window.location.href);
    shareUrl.hash = "";
    shareUrl.search = "";
    shareUrl.searchParams.set("character", characterId);
    await navigator.clipboard.writeText(shareUrl.toString());
    notify("첫인상 링크를 복사했어요.");
  };

  const pickImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("이미지 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify("이미지는 10MB 이하로 올려주세요.");
      return;
    }
    setUploadFile(file);
  };

  const createCharacter = async () => {
    if (!user) {
      setModal("login");
      return;
    }
    if (!db || !storage) {
      explainFirebaseSetup();
      return;
    }
    if (!newName.trim() || !uploadFile) {
      notify("캐릭터 별명과 이미지를 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const characterId = crypto.randomUUID();
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const imageRef = ref(storage, `characters/${user.uid}/${characterId}/${safeName}`);
      await uploadBytes(imageRef, uploadFile, { contentType: uploadFile.type });
      const imageUrl = await getDownloadURL(imageRef);
      const item: Character = {
        id: characterId,
        alias: newName.trim(),
        ownerName: user.displayName || "이름 비공개",
        ownerId: user.uid,
        tags: newTags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 3),
        category: newCategory,
        imageUrl,
        visibility: "public",
      };
      const storedCharacter = {
        alias: item.alias,
        ownerName: item.ownerName,
        ownerId: item.ownerId,
        tags: item.tags,
        category: item.category,
        imageUrl: item.imageUrl,
        visibility: item.visibility,
      };
      await setDoc(doc(db, "characters", characterId), {
        ...storedCharacter,
        createdAt: serverTimestamp(),
      });
      setMyCharacters((current) => [item, ...current]);
      setCharacters((current) => [sampleCharacter, item, ...current.filter((entry) => entry.id !== sampleCharacter.id)]);
      setActiveCharacterId(characterId);
      setNewName("");
      setNewTags("");
      setUploadFile(null);
      setModal(null);
      setView("dashboard");
      notify("캐릭터 이미지와 첫인상 링크를 저장했어요.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "캐릭터 등록에 실패했습니다.";
      setErrorMessage(text);
      notify("등록에 실패했어요. Firebase Storage 설정을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (selected.isSample) {
      setErrorMessage("이 카드는 화면 확인용 예시라 답변을 저장하지 않습니다. 실제 사용자가 올린 캐릭터에만 전송할 수 있어요.");
      return;
    }
    if (!db) {
      setErrorMessage("Firebase 연결 후 실제 답변을 저장할 수 있습니다.");
      return;
    }
    setBusy(true);
    setErrorMessage("");
    try {
      await addDoc(collection(db, "replies"), {
        characterId: selected.id,
        personality,
        role,
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setModal("success");
    } catch (error) {
      const text = error instanceof Error ? error.message : "답변 전송에 실패했습니다.";
      setErrorMessage(text);
    } finally {
      setBusy(false);
    }
  };

  const renderModal = () => {
    if (!modal) return null;
    return (
      <div
        className="modal-backdrop"
        role="presentation"
        onMouseDown={(event) => {
          if (event.currentTarget === event.target) setModal(null);
        }}
      >
        {modal === "login" && (
          <section className="modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="닫기">×</button>
            <span className="login-spark">✦</span>
            <Logo />
            <h2 id="login-title">Google 계정으로<br />내 연구실 열기</h2>
            <p>Firebase Authentication의 실제 Google OAuth 팝업을 사용합니다. 가짜 계정이나 체험 로그인은 만들지 않습니다.</p>
            {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
            <button className="google-login" type="button" onClick={handleGoogleLogin} disabled={busy || authLoading}>
              <span>G</span>{busy ? "Google 연결 중…" : "Google 계정으로 계속하기"}
            </button>
            <small>{isFirebaseConfigured ? "로그인 정보는 Firebase Authentication에서 관리됩니다." : "개발자가 .env.local에 Firebase 프로젝트 정보를 넣어야 활성화됩니다."}</small>
          </section>
        )}

        {modal === "answer" && (
          <section className="modal answer-modal" role="dialog" aria-modal="true" aria-labelledby="answer-title">
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="닫기">×</button>
            <div className="answer-header">
              <CharacterImage character={selected} className="answer-mini-visual" />
              <div>
                <p>FIRST IMPRESSION · 익명</p>
                <h2 id="answer-title">이 캐릭터,<br />어떤 사람 같나요?</h2>
                <span>{selected.tags.map((tag) => `#${tag} `)}</span>
              </div>
            </div>
            <div className="answer-form">
              <fieldset><legend><i>1</i> 첫인상 성격을 골라주세요</legend><div className="choice-grid">{personalityOptions.map((item) => <button className={personality === item ? "selected" : ""} type="button" key={item} onClick={() => setPersonality(item)}>{item}</button>)}</div></fieldset>
              <fieldset><legend><i>2</i> 세계관 속 역할은?</legend><div className="choice-grid">{roleOptions.map((item) => <button className={role === item ? "selected" : ""} type="button" key={item} onClick={() => setRole(item)}>{item}</button>)}</div></fieldset>
              <label className="message-label"><span><i>3</i> 한마디 상상을 남겨주세요 <small>선택</small></span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={120} placeholder="예: 말수는 적지만 은근히 다정할 것 같아요." /><b>{message.length}/120</b></label>
              {selected.isSample && <p className="sample-notice">이 이미지는 UI 확인용 예시입니다. 실제 답변으로 저장되지 않아요.</p>}
              {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
              <button className="submit-answer" type="button" onClick={submitAnswer} disabled={busy}>{busy ? "전송 중…" : "익명으로 첫인상 보내기"} <span>↗</span></button>
            </div>
          </section>
        )}

        {modal === "create" && (
          <section className="modal create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="닫기">×</button>
            <p className="eyebrow">NEW CHARACTER FILE</p>
            <h2 id="create-title">첫인상을 받을<br /><em>캐릭터 등록</em></h2>
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => pickImage(event.target.files?.[0])}
            />
            <button className="upload-zone" type="button" onClick={() => fileInputRef.current?.click()}>
              {uploadPreview ? <img src={uploadPreview} alt="업로드할 캐릭터 이미지 미리보기" /> : <><span>＋</span><b>캐릭터 이미지 선택</b><small>PNG, JPG, WEBP · 최대 10MB</small></>}
            </button>
            <label>공개할 별명<input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="예: 이름 비공개 / CODE: 071" /></label>
            <label>분류<select value={newCategory} onChange={(event) => setNewCategory(event.target.value)}>{categories.filter((item) => item !== "전체").map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>힌트 태그<input value={newTags} onChange={(event) => setNewTags(event.target.value)} placeholder="판타지, 은발, 인외" /></label>
            <p className="create-tip">✦ 선택한 원본 파일을 Firebase Storage에 그대로 올립니다.</p>
            {!user && <p className="sample-notice">이미지를 먼저 골라도 괜찮아요. 저장 직전에 실제 Google 로그인을 요청합니다.</p>}
            {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
            <button className="submit-answer" type="button" onClick={createCharacter} disabled={busy}>{busy ? "이미지 업로드 중…" : user ? "첫인상 링크 만들기" : "Google 로그인하고 계속하기"} <span>↗</span></button>
          </section>
        )}

        {modal === "success" && (
          <section className="modal success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <span className="success-stamp">SENT!</span>
            <h2 id="success-title">첫인상이<br />실제로 저장됐어요!</h2>
            <p>캐릭터 주인이 로그인하면 답변함에서 이 응답을 확인할 수 있어요.</p>
            <button className="submit-answer" type="button" onClick={() => setModal(null)}>계속 구경하기 →</button>
          </section>
        )}
      </div>
    );
  };

  if (view === "dashboard") {
    return (
      <main className="dashboard-shell">
        <header className="dashboard-topbar">
          <button className="logo-button" type="button" onClick={() => setView("home")}><Logo /></button>
          <div className="dashboard-title-mobile">내 캐릭터 답변함</div>
          <button className="profile-pill" type="button" onClick={handleSignOut} title="로그아웃">
            {user?.photoURL ? <img src={user.photoURL} alt="" /> : <span className="profile-avatar">{user?.displayName?.slice(0, 1) || "나"}</span>}
            <span>{user?.displayName || user?.email || "로그인 사용자"}</span><i>로그아웃</i>
          </button>
        </header>
        <div className="dashboard-layout">
          <aside className="dash-sidebar">
            <p className="side-label">MY PLAYGROUND</p>
            <button className="side-link active" type="button"><span>✦</span> 첫인상 답변함 <b>{replies.length}</b></button>
            <button className="side-link" type="button" onClick={() => { setErrorMessage(""); setModal("create"); }}><span>＋</span> 캐릭터 등록</button>
            <button className="back-home" type="button" onClick={() => setView("home")}>← 놀이터로 돌아가기</button>
          </aside>
          <section className="dashboard-main">
            <div className="dash-heading">
              <div><p className="eyebrow">MY CHARACTER LAB</p><h1>내 캐릭터 <em>답변함</em></h1><p>실제로 등록한 캐릭터와 Firestore에 저장된 답변만 보여줘요.</p></div>
              <button className="new-character-button" type="button" onClick={() => { setErrorMessage(""); setModal("create"); }}>＋ 새 캐릭터 등록</button>
            </div>
            {!myCharacters.length ? (
              <div className="dashboard-empty">
                <span>＋</span><h2>아직 등록한 캐릭터가 없어요.</h2><p>캐릭터 이미지를 올리면 첫인상 링크가 생겨요.</p>
                <button type="button" onClick={() => setModal("create")}>첫 캐릭터 등록하기</button>
              </div>
            ) : (
              <>
                <div className="stats-strip">
                  <div><span>내 캐릭터</span><b>{myCharacters.length}</b><small>실제 등록 수</small></div>
                  <div><span>선택한 캐릭터 답변</span><b>{replies.length}</b><small>실제 저장 수</small></div>
                  <div><span>Firebase 상태</span><b className="status-word">연결됨</b><small>실시간 계정 데이터</small></div>
                </div>
                <div className="character-tabs" role="tablist" aria-label="내 캐릭터">
                  {myCharacters.map((character) => (
                    <button key={character.id} type="button" role="tab" aria-selected={activeCharacterId === character.id} className={activeCharacterId === character.id ? "active" : ""} onClick={() => setActiveCharacterId(character.id)}>
                      <span className="tab-avatar"><img src={character.imageUrl} alt="" /></span><span><b>{character.alias}</b><small>{character.category}</small></span>
                    </button>
                  ))}
                  <button className="tab-add" type="button" onClick={() => setModal("create")}>＋</button>
                </div>
                <div className="inbox-grid">
                  {activeCharacter && (
                    <article className="character-summary">
                      <CharacterImage character={activeCharacter} />
                      <div className="summary-head"><span>공개 중</span><button type="button" onClick={() => void copyShareLink(activeCharacter.id)}>링크 복사 ↗</button></div>
                      <h2>{activeCharacter.alias}</h2>
                      <div className="tag-row">{activeCharacter.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                    </article>
                  )}
                  <section className="reply-panel">
                    <div className="reply-toolbar"><div><h2>도착한 첫인상</h2><span>{replies.length}개의 실제 익명 답변</span></div></div>
                    <div className="reply-list">
                      {replies.length ? replies.map((reply) => (
                        <article className="reply-card" key={reply.id}>
                          <span className="reply-mood">✦</span>
                          <div className="reply-body">
                            <div className="reply-meta"><span>익명의 관찰자</span><time>{dateLabel(reply.createdAt)}</time></div>
                            <div className="reply-chips"><b>{reply.personality}</b><b>{reply.role}</b></div>
                            {reply.message && <p>“{reply.message}”</p>}
                          </div>
                        </article>
                      )) : <div className="empty-replies"><span>☁</span><b>아직 도착한 답변이 없어요.</b><p>링크를 공유해 첫인상을 받아보세요.</p></div>}
                    </div>
                  </section>
                </div>
              </>
            )}
          </section>
        </div>
        <nav className="mobile-nav" aria-label="모바일 메뉴">
          <button type="button" onClick={() => setView("home")}><span>⌂</span>홈</button>
          <button type="button" className="active"><span>✦</span>답변함</button>
          <button type="button" className="mobile-create" onClick={() => setModal("create")}><span>＋</span></button>
          <button type="button" onClick={handleSignOut}><span>⇥</span>로그아웃</button>
          <button type="button" onClick={goDashboard}><span>●</span>마이</button>
        </nav>
        {renderModal()}
        {toast && <div className="toast" role="status">{toast}</div>}
      </main>
    );
  }

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="주요 메뉴">
        <a href="#top" aria-label="오타쿠놀이터 홈"><Logo /></a>
        <div className="nav-links"><a href="#discover">캐릭터 구경</a><a href="#how">첫인상 받기</a><button type="button" onClick={goDashboard}>내 답변함</button></div>
        {user ? (
          <button className="signed-profile" type="button" onClick={goDashboard}>
            {user.photoURL ? <img src={user.photoURL} alt="" /> : <span>{user.displayName?.slice(0, 1) || "나"}</span>}
            {user.displayName || "내 답변함"}
          </button>
        ) : (
          <button className="login-button" type="button" onClick={() => { setErrorMessage(""); setModal("login"); }} disabled={authLoading}><span className="google-g">G</span> Google로 로그인</button>
        )}
      </nav>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">ANONYMOUS CHARACTER LAB</p>
          <h1>내 자캐의 첫인상,<br />익명으로 <em>수집해요.</em></h1>
          <p className="hero-description">설정은 잠깐 숨겨두고 캐릭터만 보여주세요. 실제 Google 계정으로 캐릭터를 관리하고, 익명으로 도착한 답변을 모아볼 수 있어요.</p>
          {!isFirebaseConfigured && <p className="setup-banner">개발 모드: Firebase 환경값을 넣으면 로그인·업로드·답변 저장이 활성화됩니다.</p>}
          <div className="hero-actions">
            <button className="primary-action" type="button" onClick={() => setModal("create")}>내 캐릭터 올리기 <span>↗</span></button>
            <button className="secondary-action" type="button" onClick={() => openAnswer(visibleCharacters[0] || sampleCharacter)}>캐릭터 첫인상 쓰기 <span>→</span></button>
          </div>
          <div className="honesty-note"><span>✓</span><p><b>예시와 실제 데이터를 구분해요.</b><br />아래 대표 카드는 UI 확인용이고, 숫자를 지어내지 않습니다.</p></div>
        </div>
        <div className="hero-stage" aria-label="대표 캐릭터 첫인상 카드">
          <div className="floating-note note-one">✦ 원본 이미지<br /><b>변형 없이 사용</b></div>
          <button className="character-card hero-character-card" type="button" onClick={() => openAnswer(sampleCharacter)}>
            <div className="card-topline"><span>SAMPLE</span><span>FIRST IMPRESSION</span></div>
            <CharacterImage character={sampleCharacter} />
            <div className="card-caption"><div><b>{sampleCharacter.alias}</b><span>{sampleCharacter.ownerName}</span></div><i>→</i></div>
          </button>
          <div className="floating-note note-two">UI 확인용 예시 카드<br />답변은 저장하지 않아요.</div>
          <div className="stamp" aria-hidden="true">FIRST<br />LOOK!</div>
        </div>
      </section>

      <section className="discover-section" id="discover">
        <div className="section-heading"><div><p className="eyebrow">CHARACTER FILES</p><h2>처음 만난 <em>캐릭터들</em></h2></div><p>필터는 실제로 등록된 캐릭터의 분류를 기준으로 작동해요.<br />결과가 없으면 빈 상태를 그대로 보여줍니다.</p></div>
        <div className="filter-row" aria-label="캐릭터 분류 필터">
          {categories.map((category) => <button key={category} className={filter === category ? "active" : ""} type="button" aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}</button>)}
        </div>
        {visibleCharacters.length ? (
          <div className="gallery-grid">
            {visibleCharacters.map((character, index) => (
              <article className={`gallery-card tilt-${(index % 4) + 1}`} key={character.id}>
                <button className="gallery-visual" type="button" onClick={() => openAnswer(character)} aria-label={`${character.alias} 첫인상 남기기`}><CharacterImage character={character} /></button>
                <div className="gallery-info"><div><span>{character.isSample ? "UI SAMPLE" : `by ${character.ownerName}`}</span><h3>{character.alias}</h3><p>#{character.category} {character.tags.map((tag) => `#${tag} `)}</p></div><button type="button" onClick={() => openAnswer(character)}>첫인상 남기기 <span>→</span></button></div>
              </article>
            ))}
          </div>
        ) : <div className="gallery-empty"><span>☁</span><h3>{filter} 캐릭터가 아직 없어요.</h3><p>첫 번째 캐릭터를 등록해 보세요.</p></div>}
      </section>

      <section className="how-section" id="how">
        <div className="how-card">
          <div className="how-copy"><p className="eyebrow">HOW TO PLAY</p><h2>설명은 숨기고,<br /><em>상상은 활짝.</em></h2><p>Google 로그인 → 실제 이미지 업로드 → 링크 공유 → Firestore 답변 확인 순서로 작동합니다.</p><button type="button" onClick={() => setModal("create")}>첫 캐릭터 등록하기 →</button></div>
          <ol className="steps">
            <li><i>01</i><span>실제 Google 로그인</span><p>Firebase OAuth로 계정을 확인해요.</p><b>G</b></li>
            <li><i>02</i><span>원본 이미지 업로드</span><p>선택한 파일을 Storage에 저장해요.</p><b>＋</b></li>
            <li><i>03</i><span>익명 답변 저장</span><p>응답은 Firestore에 기록돼요.</p><b>✦</b></li>
            <li><i>04</i><span>내 답변함 확인</span><p>캐릭터 주인만 답변을 읽어요.</p><b>♡</b></li>
          </ol>
        </div>
      </section>

      <footer><Logo /><p>취향이 콘텐츠가 되는 곳 · 오타쿠놀이터</p><div><a href="#how">이용안내</a><button type="button" onClick={goDashboard}>내 답변함</button></div></footer>
      <nav className="mobile-nav home-mobile-nav" aria-label="모바일 메뉴">
        <button type="button" className="active"><span>⌂</span>홈</button>
        <button type="button" onClick={() => document.querySelector("#discover")?.scrollIntoView()}><span>⌕</span>탐색</button>
        <button type="button" className="mobile-create" onClick={() => setModal("create")}><span>＋</span></button>
        <button type="button" onClick={goDashboard}><span>✦</span>답변함</button>
        <button type="button" onClick={() => user ? goDashboard() : setModal("login")}><span>●</span>마이</button>
      </nav>
      {renderModal()}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
