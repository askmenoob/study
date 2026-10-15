import { StudyFooter } from "./components/StudyFooter";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, BookOpenCheck, Brain, ChartNoAxesColumnIncreasing, CheckCircle2, ChevronRight, Cloud, Flame, Lightbulb, LibraryBig, LogOut, Plus, Sparkles, Trophy, UserRound, Home, Settings, Link, Menu, X, ArrowRight, ListChecks } from "lucide-react";
import { findLevel, findSubject, getSubjectsForLevel, getTopics, levels } from "./data/curriculum";
import { FocusBrand, LearnerDashboard, ParentDashboard } from "./components/FocusDashboard";
import { studyTheme, themeColor } from "./lib/uiTheme";
import { AuthGate } from "./components/AuthGate";
import { PwaInstall } from "./components/PwaInstall";
import { ParentStudyLinks } from "./components/ParentStudyLinks";
import { ParentFeedbackForm } from "./components/ParentFeedbackForm";
import { AdminFeedbackInbox } from "./components/AdminFeedbackInbox";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { TuitionTeacherDirectory } from "./components/TuitionTeacherDirectory";
import { ParentTuitionOverview } from "./components/ParentTuitionOverview";
import { StudentTuitionOverview } from "./components/StudentTuitionOverview";
import { AcademyLearningActivity, AcademyNextClass, AcademyProgressCard, academyFocusSection } from "./components/AcademyDashboard";
import { FamilyHomeworkPanel } from "./components/TuitionHomework";
import { AcademyTopbar, AcademyWelcomeBanner, AcademyStudentActions, AcademyParentInsights } from "./components/AcademyChrome";
import { StudentTeacherMaterials } from "./components/StudentTeacherMaterials";
import { ParentTeacherConnection } from "./components/ParentTeacherConnection";
import { TeacherApplicationPanel } from "./components/TeacherApplicationPanel";
import { AccountRoleSwitcher } from "./components/AccountRoleSwitcher";
import "./components/TeacherNetwork.css";
import { StudySessionGate } from "./components/StudySessionGate";
import { captureStudyLink, isSessionEnded, redeemStudyLinkOnce, sessionEndMessage } from "./lib/studySession";
import { UnitLesson } from "./components/UnitLesson";
import { UnitQuestionCard } from "./components/UnitQuestionCard";
import { UnitRevision } from "./components/UnitRevision";
import { learnedUnits } from "./lib/learnedUnits";
import { learningPolicy } from "../server/library/learningPolicy";
import { libraryResources } from "../server/library/catalog";
import { LearningLibrary } from "./components/LearningLibrary";
import { ExamRevision } from "./components/ExamRevision";
import { ChallengeJourney } from "./components/ChallengeJourney";
import { ChallengeParentReport } from "./components/ChallengeParentReport";
import { clearExamDrafts } from "./lib/examDrafts";
import { PracticeChoices } from "./components/PracticeChoices";
import { LearningWelcome, SubjectGraphic } from "./components/LearnerGraphics";
import { practicePool, selectPracticeQuestions, mergeQuestionHistory, includePendingHistory, type PracticeMode } from "./lib/practice";
import { TutorPanel } from "./components/TutorPanel";
import { addAttempt, loadState, saveState } from "./lib/storage";
import { discardStudentPendingAttempts, flushPendingAttempts, loadPendingAttempts, queueAttempt } from "./lib/sync";
import { makeUuid } from "./lib/id";
import { calculateStreak, overallAccuracy, subjectMastery, topicMastery, totalQuestions } from "./lib/progress";
import { buildStudyPlan, dailyMission, diagnosticQuestions, rankTopics } from "./lib/adaptive";
import { isSuperAdminRole, isTeacherRole, shouldLoadFamily } from "./lib/accountRole";
import { getFocusSession, startStudentSession, deleteStudent, createStudent, getAttempts, getMe, getStudents, saveAttemptCloud, tokenStore, updateStudent, type AccountUser, type CloudStudent } from "./lib/api";
import type { AttemptAnswer, AttemptRecord, LevelId, StudyState, Topic, Question } from "./types";

type Screen = "learn" | "manage" | "links" | "settings" | "my-teacher" | "progress" | "lesson" | "exam" | "complete" | "home" | "revision" | "subjects" | "topics" | "quiz" | "diagnostic" | "parent" | "tutor" | "library" | "teacher-materials" | "challenge" | "tuition" | "classes" | "homework";

const initialStudyLink = typeof window === "undefined" ? null : captureStudyLink(window.location, window.history);

export default function App() {
  useEffect(() => {
    // An installed PWA can reuse its current tab for a newly opened child link.
    const openIncomingLink = () => {
      if (new URLSearchParams(window.location.hash.slice(1)).has("join")) window.location.reload();
    };
    window.addEventListener("hashchange", openIncomingLink);
    return () => window.removeEventListener("hashchange", openIncomingLink);
  }, []);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [bootstrapRetry, setBootstrapRetry] = useState(0);
  const [sessionEnded, setSessionEnded] = useState("");
  const [resumeNeedsApproval, setResumeNeedsApproval] = useState(() => Boolean(tokenStore.getFocusSessionId()));
  const [cloudStudents, setCloudStudents] = useState<CloudStudent[]>([]);
  const [study, setStudy] = useState<StudyState>(() => loadState());
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLElement>("nav button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); menuTriggerRef.current?.focus(); }
      if (event.key === "Tab") {
        const controls = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("button,a,select,input") ?? []).filter(item => item.getClientRects().length && !item.hasAttribute("disabled"));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const resize = () => { if (window.innerWidth > 760) setMenuOpen(false); };
    window.addEventListener("keydown", keydown); window.addEventListener("resize", resize);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keydown); window.removeEventListener("resize", resize); };
  }, [menuOpen]);
  const [screen, setScreen] = useState<Screen>("home");
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({top:0,behavior:'instant'});
  }, [screen]);
  const [subjectId, setSubjectId] = useState("math");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [lessonDestination,setLessonDestination] = useState<"quiz"|"challenge">("quiz");
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizMode, setQuizMode] = useState<PracticeMode>("new");
  const quizCompleted = useRef(false);
  const diagnosticCompleted = useRef(false);
  const [diagnosticPool, setDiagnosticPool] = useState<ReturnType<typeof diagnosticQuestions>>([]);
  const [diagnosticReview, setDiagnosticReview] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<AttemptAnswer[]>([]);
  const [draftName, setDraftName] = useState(study.profile.name);
  const [draftLevel, setDraftLevel] = useState<LevelId>(study.profile.levelId);
  const [creatingNewStudent, setCreatingNewStudent] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CloudStudent | null>(null);
  const profileSaving = useRef(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  useEffect(() => {
    if (!syncNotice) return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const timer = window.setTimeout(() => setSyncNotice(""), mobile ? 2500 : 4500);
    return () => window.clearTimeout(timer);
  }, [syncNotice]);
  const [tutorResourceId, setTutorResourceId] = useState<string | undefined>();
  const [libraryResourceId, setLibraryResourceId] = useState<string | undefined>();
  const [returnToChallenge, setReturnToChallenge] = useState(false);
  const [diagnosticIndex, setDiagnosticIndex] = useState(0);
  const [diagnosticSelected, setDiagnosticSelected] = useState<number | null>(null);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Array<{ subjectId: string; topicId: string; questionId: string; selected: number; correct: boolean }>>([]);

  const hydrateStudent = async (student: CloudStudent) => {
    const authToken = tokenStore.get();
    const result = await getAttempts(student.id);
    if (authToken !== tokenStore.get()) return;
    const attempts: AttemptRecord[] = result.attempts.map((item) => ({
      id: item.id, levelId: item.level_id as LevelId, subjectId: item.subject_id,
      topicId: item.topic_id, correct: item.score, total: item.total,
      completedAt: item.created_at, answers: item.answers as AttemptAnswer[],
    }));
    const next: StudyState = {
      profile: { name: student.name, levelId: student.level_id as LevelId, goalMinutes: 15, cloudId: student.id },
      questionHistory: includePendingHistory(mergeQuestionHistory(attempts, result.questionHistory), loadPendingAttempts(), student.id),
      attempts, streak: calculateStreak(attempts), lastStudyDate: attempts[0]?.completedAt.slice(0, 10),
    };
    setTutorResourceId(undefined); setLibraryResourceId(undefined); setReturnToChallenge(false); setTopic(null); setQuizQuestions([]); setQuizAnswers([]);
    setStudy(next); saveState(next); setDraftName(student.name); setDraftLevel(student.level_id as LevelId);
    localStorage.setItem("imai-study-active-student", student.id);
  };
  const loadFamily = async () => {
    const list = await getStudents();
    setCloudStudents(list.students);
    if (!list.students.length) {
      const empty: StudyState = { profile: { name: "", levelId: "d1", goalMinutes: 15 }, attempts: [], streak: 0 };
      setStudy(empty); saveState(empty); setDraftName(""); setDraftLevel("d1"); setScreen("home"); return;
    }
    const preferred = localStorage.getItem("imai-study-active-student");
    const active = list.students.find((item) => item.id === preferred) ?? list.students[0];
    await hydrateStudent(active);
    void flushPendingAttempts();
  };

  useEffect(() => {
    let cancelled = false;
    setAuthReady(false); setAuthError("");
    void (async () => {
      if (initialStudyLink === null && !tokenStore.get()) { setAuthReady(true); return; }
      try {
        let user: AccountUser;
        if (initialStudyLink !== null) {
          tokenStore.clear();
          localStorage.removeItem("imai-study:v2"); localStorage.removeItem("imai-study-active-student");
          const result = await redeemStudyLinkOnce(initialStudyLink);
          if (cancelled) return;
          tokenStore.set(result.token); user = result.user;
        } else {
          const me = await getMe();
          if (cancelled) return;
          user = me.user;
        }
        if (user.focusSessionId) {
          tokenStore.setFocusSessionId(user.focusSessionId); setResumeNeedsApproval(true);
          const result = await getFocusSession();
          if (cancelled) return;
          if (isSessionEnded(result.session.status)) {
            tokenStore.clear(); localStorage.removeItem("imai-study:v2"); localStorage.removeItem("imai-study-active-student");
            setSessionEnded(sessionEndMessage(result.session.status)); return;
          }
        }
        if (shouldLoadFamily(user.role)) await loadFamily();
        if (cancelled) return;
        setAccount(user); setScreen(user.role === "student" ? "learn" : "home");
      } catch (error) {
        if (cancelled) return;
        setAccount(null);
        const code = error instanceof Error ? error.message : "";
        if (["LINK_UNAVAILABLE", "INVALID_INPUT"].includes(code)) {
          tokenStore.clear(); setAuthError("Link ini telah digunakan, tamat tempoh atau dibatalkan. Minta ibu bapa jana link baharu.");
        } else if (code === "UNAUTHORIZED" || code === "SESSION_ENDED" || code === "FOCUS_SESSION_NOT_FOUND") {
          tokenStore.clear(); localStorage.removeItem("imai-study:v2"); localStorage.removeItem("imai-study-active-student");
          setSessionEnded("Sesi ini tidak lagi tersedia. Minta link baharu daripada ibu bapa atau log masuk semula.");
        } else {
          setAuthError("Profil belum dapat dimuatkan. Semak sambungan dan cuba semula. Jika link sudah digunakan, kekalkan halaman ini untuk menyambung sesi.");
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [bootstrapRetry]);
  useEffect(() => {
    const onOnline = () => {
      if (!tokenStore.get() || !account || !shouldLoadFamily(account.role)) return;
      setSyncNotice("Sambungan kembali. Sync latihan...");
      void flushPendingAttempts().then((result) => {
        setSyncNotice(result.remaining ? `${result.remaining} latihan masih menunggu sync.` : result.synced ? `${result.synced} latihan berjaya disync.` : "Cloud sync aktif.");
      });
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [account?.role]);

  const level = findLevel(study.profile.levelId);
  const availableSubjects = getSubjectsForLevel(study.profile.levelId);
  const safeSubjectId = availableSubjects.some((item) => item.id === subjectId) ? subjectId : availableSubjects[0]?.id ?? "bm";
  const subject = findSubject(safeSubjectId);
  const topics = getTopics(study.profile.levelId, safeSubjectId);
  const accuracy = overallAccuracy(study.attempts);
  const questionsDone = totalQuestions(study.attempts);
  const currentScore = quizAnswers.filter((item) => item.correct).length;
  const rankedTopics = useMemo(() => rankTopics(study.attempts, study.profile.levelId, availableSubjects, getTopics, study.questionHistory), [study, availableSubjects]);
  const weakTopic = rankedTopics.find(item => item.remaining > 0) ?? null;
  const mission = useMemo(() => dailyMission(study.attempts), [study.attempts]);
  const mixedTopics = useMemo(() => {
    const learned=learnedUnits(`${account?.id}:${study.profile.cloudId}`);
    for(const attempt of study.attempts) if(attempt.levelId===study.profile.levelId&&attempt.total>0) learned.add(attempt.topicId);
    return (grade: LevelId, id: string) => getTopics(grade,id).filter(t=>learned.has(t.id));
  },[account?.id,study.profile.cloudId,study.profile.levelId,study.attempts,screen]);
  const diagnosticAvailable = useMemo(() => diagnosticQuestions(availableSubjects, study.profile.levelId, mixedTopics, 12, study.attempts, study.questionHistory), [availableSubjects, study, mixedTopics]);
  const diagnosticTotal = diagnosticQuestions(availableSubjects, study.profile.levelId, mixedTopics, 12, [], [], "review").length;
  const studyPlan = useMemo(() => buildStudyPlan(rankedTopics, 7, study.profile.goalMinutes), [rankedTopics, study.profile.goalMinutes]);

  const onAuthenticated = (user: AccountUser) => {
    setSessionEnded(""); setAuthError(""); setResumeNeedsApproval(false); setScreen("home"); setAccount(user); setAuthReady(false); setSyncNotice("Akaun disambungkan.");
    if (!shouldLoadFamily(user.role)) { setAuthReady(true); return; }
    void loadFamily().catch(() => { tokenStore.clear(); setAccount(null); setSyncNotice("Gagal memuatkan profil. Sila log masuk semula."); }).finally(() => setAuthReady(true));
  };
  const saveProfile = async () => {
    if (account?.role !== "parent" || profileSaving.current) return;
    const name = draftName.trim();
    if (!name) { setSyncNotice("Masukkan nama anak."); return; }
    const duplicate = cloudStudents.some((item) => item.id !== (creatingNewStudent ? undefined : study.profile.cloudId) && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase() && item.level_id === draftLevel);
    const unchanged = !creatingNewStudent && name === study.profile.name && draftLevel === study.profile.levelId;
    if (duplicate && !unchanged) { setSyncNotice("Nama dan tahap ini sudah ada. Pilih profil sedia ada atau gunakan nama panggilan berbeza."); return; }
    profileSaving.current = true; setProfileBusy(true);
    setSyncNotice("Menyimpan profil...");
    try {
      if (creatingNewStudent || !study.profile.cloudId) {
        const created = await createStudent(name, draftLevel);
        const nextStudents = [...cloudStudents.filter((item) => item.id !== created.student.id), created.student];
        setCloudStudents(nextStudents); setCreatingNewStudent(false);
        await hydrateStudent(created.student);
      } else {
        const updated = await updateStudent(study.profile.cloudId, name, draftLevel);
        setCloudStudents((items) => items.map((item) => item.id === updated.student.id ? updated.student : item));
        const next = { ...study, profile: { ...study.profile, name, levelId: draftLevel } };
        setStudy(next); saveState(next);
      }
      setSubjectId("math"); setScreen("home"); setSyncNotice("Profil disimpan. Pilih Buka Mod Murid untuk mula belajar.");
    } catch (error) { setSyncNotice(error instanceof Error && error.message === "DUPLICATE_STUDENT" ? "Nama dan tahap ini sudah ada. Pilih profil sedia ada atau gunakan nama panggilan berbeza." : "Gagal sync profil. Cuba sekali lagi."); }
    finally { profileSaving.current = false; setProfileBusy(false); }
  };


  const startDiagnostic = () => {
    if (study.profile.levelId === "d1") { setScreen("subjects"); return; }
    if (profileBusy) return;
    const review = diagnosticAvailable.length === 0;
    setDiagnosticPool(review ? diagnosticQuestions(availableSubjects, study.profile.levelId, mixedTopics, 12, [], [], "review") : diagnosticAvailable);
    setDiagnosticReview(review); diagnosticCompleted.current = false;
    setDiagnosticIndex(0); setDiagnosticSelected(null); setDiagnosticAnswers([]); setScreen("diagnostic");
  };
  const answerDiagnostic = (index: number) => {
    if (diagnosticSelected !== null || profileBusy) return;
    const item = diagnosticPool[diagnosticIndex]; if (!item) return;
    setDiagnosticSelected(index);
    setDiagnosticAnswers((items) => [...items, { subjectId: item.subject.id, topicId: item.topic.id, questionId: item.question.id, selected: index, correct: index === item.question.answer }]);
  };
  const finishDiagnosticOrNext = async () => {
    if (diagnosticSelected === null || profileBusy || diagnosticCompleted.current) return;
    if (diagnosticIndex < diagnosticPool.length - 1) { setDiagnosticIndex((v) => v + 1); setDiagnosticSelected(null); return; }
    diagnosticCompleted.current = true;
    const completedAt = new Date().toISOString();
    const attempts = diagnosticAnswers.map((a) => ({ id: makeUuid(), levelId: study.profile.levelId, subjectId: a.subjectId, topicId: a.topicId, correct: a.correct ? 1 : 0, total: 1, completedAt, answers: [{ questionId: a.questionId, selected: a.selected, correct: a.correct }] } satisfies AttemptRecord));
    let next = study; for (const attempt of attempts) next = addAttempt(next, attempt);
    setStudy(next); setScreen(account?.role === "parent" ? "parent" : "subjects"); setSyncNotice("Diagnostic selesai. Pelan adaptive telah dikemas kini.");
    if (study.profile.cloudId) {
      await Promise.all(attempts.map(async (attempt) => {
        const payload = { clientAttemptId: attempt.id, completedAt: attempt.completedAt, studentId: study.profile.cloudId!, levelId: attempt.levelId, subjectId: attempt.subjectId, topicId: attempt.topicId, score: attempt.correct, total: attempt.total, answers: attempt.answers ?? [] };
        try { await saveAttemptCloud(payload); } catch { queueAttempt(payload); }
      }));
    }
  };

  const startQuiz = (nextTopic: Topic, nextSubjectId = safeSubjectId, mode: PracticeMode = "new", taught = false) => {
    if (profileBusy) return;
    if (nextTopic.unitId && !taught) { setSubjectId(nextSubjectId); setTopic(nextTopic); setQuizMode(mode); setLessonDestination("quiz"); setScreen("lesson"); return; }
    const pool = practicePool(nextTopic, study.profile.levelId, nextSubjectId, study.attempts, study.questionHistory);
    setQuizQuestions(selectPracticeQuestions(pool, mode, study.profile.levelId === "d1" ? 6 : 5)); setQuizMode(mode); quizCompleted.current = false;
    setSubjectId(nextSubjectId); setTopic(nextTopic); setQuestionIndex(0); setSelected(null); setQuizAnswers([]); setScreen("quiz");
  };
  const answer = (index: number) => {
    if (selected !== null || !topic || !quizQuestions[questionIndex] || profileBusy) return;
    const question = quizQuestions[questionIndex];
    setSelected(index);
    setQuizAnswers((items) => [...items, { questionId: question.id, selected: index, correct: index === question.answer }]);
  };
  const finishOrNext = async () => {
    if (!topic || selected === null || profileBusy || quizCompleted.current) return;
    if (questionIndex < quizQuestions.length - 1) {
      setQuestionIndex((value) => value + 1); setSelected(null); return;
    }
    quizCompleted.current = true;
    const attempt: AttemptRecord = {
      id: makeUuid(), levelId: study.profile.levelId, subjectId: safeSubjectId,
      topicId: topic.id, correct: currentScore, total: quizQuestions.length,
      completedAt: new Date().toISOString(), answers: quizAnswers,
    };
    const next = addAttempt(study, attempt); setStudy(next); setScreen("complete");
    if (!study.profile.cloudId) return;
    setSyncNotice("Sync latihan...");
    try {
      await saveAttemptCloud({
        clientAttemptId: attempt.id,
        studentId: study.profile.cloudId, levelId: attempt.levelId, subjectId: attempt.subjectId,
        topicId: attempt.topicId, score: attempt.correct, total: attempt.total,
        answers: attempt.answers ?? [],
      });
      setSyncNotice("Latihan disimpan ke cloud.");
    } catch { queueAttempt({ clientAttemptId: attempt.id, completedAt: attempt.completedAt, studentId: study.profile.cloudId, levelId: attempt.levelId, subjectId: attempt.subjectId, topicId: attempt.topicId, score: attempt.correct, total: attempt.total, answers: attempt.answers ?? [] }); setSyncNotice("Latihan selamat pada peranti; akan sync semula bila online."); }
  };

  const switchStudent = async (id: string) => {
    const student = cloudStudents.find((item) => item.id === id); if (!student) return;
    if (profileBusy) return;
    setProfileBusy(true); setSyncNotice("Memuatkan profil...");
    try { await hydrateStudent(student); setScreen("home"); setCreatingNewStudent(false); setSyncNotice(""); }
    finally { setProfileBusy(false); }
  };
  const logout = useCallback(() => {
    if (account) clearExamDrafts(account.id);
    tokenStore.clear(); localStorage.removeItem("imai-study:v2"); localStorage.removeItem("imai-study-active-student");
    setStudy({ profile: { name: "", levelId: "d1", goalMinutes: 15 }, attempts: [], streak: 0 });
    setTutorResourceId(undefined); setDeleteTarget(null); setDeleteName(""); setDraftName(""); setCreatingNewStudent(false); setAccount(null); setCloudStudents([]); setScreen("home"); setSyncNotice("");
    setTopic(null); setQuizQuestions([]); setQuizAnswers([]); setDiagnosticAnswers([]); setSelected(null); setDiagnosticSelected(null);
  }, [account]);
  const endFocusSession = useCallback((message: string) => {
    logout(); setSessionEnded(message);
  }, [logout]);

  const removeChild = async () => {
    if (account?.role !== "parent" || !deleteTarget || deleteName !== deleteTarget.name || profileBusy) return;
    const target = deleteTarget; setProfileBusy(true);
    try {
      await deleteStudent(target.id);
      discardStudentPendingAttempts(target.id);
      setDeleteTarget(null); setDeleteName("");
      localStorage.removeItem("imai-study:v2");
      localStorage.removeItem("imai-study-active-student");
      setStudy({ profile: { name: "", levelId: "d1", goalMinutes: 15 }, attempts: [], streak: 0 });
      setCloudStudents((items) => items.filter((item) => item.id !== target.id));
      setCreatingNewStudent(false); setScreen("home");
      await loadFamily();
      setSyncNotice("Profil anak dan sejarah latihannya telah dipadam.");
    } catch { setSyncNotice("Tidak dapat menyelesaikan proses padam atau memuatkan profil. Semak semula senarai sebelum mencuba lagi."); }
    finally { setProfileBusy(false); }
  };

  const enterStudentMode = async () => {
    if (!study.profile.cloudId || profileBusy) return;
    setProfileBusy(true);
    try {
      const user = await startStudentSession(study.profile.cloudId);
      setAccount(user); setCloudStudents((items) => items.filter((item) => item.id === study.profile.cloudId));
      setTutorResourceId(undefined); setScreen("learn"); setSyncNotice("");
    } catch { setSyncNotice("Tidak dapat membuka Mod Murid. Cuba lagi."); }
    finally { setProfileBusy(false); }
  };
  const changeWorkspace = async (user: AccountUser) => {
    setAccount(user); setMenuOpen(false); setSyncNotice("");
    if (user.role === "parent") { await loadFamily(); setScreen("home"); }
    else setScreen("home");
  };
  const refreshAccount = async () => {
    try { const current = await getMe(); setAccount(current.user); }
    catch { setSyncNotice("Status role belum dapat dimuat semula. Cuba log masuk semula jika permohonan sudah diluluskan."); }
  };
  const isParent = account?.role === "parent";
  const activeTheme = studyTheme(account?.role, study.profile.levelId);
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor(activeTheme));
  }, [activeTheme]);
  const hasFocusSession = account?.role === "student" && Boolean(account.focusSessionId);
  const studentLabel = (item: CloudStudent) => {
    const same = cloudStudents.filter((other) => other.name.trim().toLocaleLowerCase() === item.name.trim().toLocaleLowerCase() && other.level_id === item.level_id);
    return `${item.name} · ${findLevel(item.level_id as LevelId).label}${same.length > 1 ? ` · Profil ${same.findIndex((other) => other.id === item.id) + 1}` : ""}`;
  };

  if (!authReady) return <div className="loadingScreen"><div className="orb"><Sparkles/></div><p>Memuatkan IMAI Study...</p></div>;
  if (sessionEnded) return <main className="sessionMessage sessionWelcome"><div className="orb"><BookOpen/></div><h1>Sesi belajar tamat</h1><p>{sessionEnded}</p><p>Untuk belajar lagi, minta link baharu daripada ibu bapa.</p><p>Jika Guided Access atau kiosk masih aktif, ibu bapa perlu membukanya pada peranti anak. Tamat sesi Study tidak membuka lock peranti.</p><button className="primary" onClick={() => { setSessionEnded(""); setAuthError(""); }}>Log masuk ibu bapa</button></main>;
  if (authError) return <main className="sessionMessage sessionWelcome"><div className="orb"><BookOpen/></div><h1>Tidak dapat membuka sesi</h1><p role="alert">{authError}</p><div className="headActions"><button className="primary" onClick={() => setBootstrapRetry((value) => value + 1)}>Cuba semula</button>{!resumeNeedsApproval && <button className="miniButton" onClick={() => { tokenStore.clear(); setAuthError(""); }}>Log masuk ibu bapa</button>}</div></main>;
  if (!account) return <AuthGate onAuthenticated={onAuthenticated} />;
  if (isSuperAdminRole(account.role)) return <AdminFeedbackInbox email={account.email} onLogout={logout} />;
  if (isTeacherRole(account.role)) return <TeacherDashboard account={account} onLogout={logout} onAccountChange={(user)=>void changeWorkspace(user)} />;
  const openLibrary = (id?: string) => {setLibraryResourceId(id);setReturnToChallenge(false);setScreen("library");};
  const navigation = isParent ? [
    {id:'home' as Screen,label:'Utama',icon:Home}, {id:'parent' as Screen,label:'Laporan',icon:ChartNoAxesColumnIncreasing},
    {id:'tuition' as Screen,label:'Cari Guru',icon:BookOpenCheck}, {id:'my-teacher' as Screen,label:'Guru Saya',icon:BookOpenCheck}, {id:'links' as Screen,label:'Kongsi link',icon:Link}, {id:'settings' as Screen,label:'Tetapan',icon:Settings},
  ] : [
    {id:'learn' as Screen,label:'Dashboard',icon:Home}, {id:'classes' as Screen,label:'Kelas Saya',icon:BookOpenCheck},
    {id:'subjects' as Screen,label:'Latihan',icon:ListChecks}, {id:'tutor' as Screen,label:'AI Tutor',icon:Sparkles},
    {id:'homework' as Screen,label:'Tugasan',icon:BookOpenCheck}, {id:'library' as Screen,label:'Library',icon:BookOpen},
    {id:'progress' as Screen,label:'Prestasi',icon:ChartNoAxesColumnIncreasing}, {id:'teacher-materials' as Screen,label:'Bahan Guru',icon:LibraryBig},
  ];
  const activeNav = !isParent && ['subjects','topics','quiz','lesson','revision','exam','challenge','complete','diagnostic'].includes(screen) ? 'subjects' : screen === 'manage' ? 'settings' : screen;
  const navigate = (id:Screen) => {
    if(id==='library') openLibrary();else {if(id==='tutor')setTutorResourceId(undefined);setScreen(id);}
    setMenuOpen(false);
    if(menuOpen)requestAnimationFrame(()=>document.getElementById('study-main')?.focus({preventScroll:true}));
  };
  return <StudySessionGate sessionId={hasFocusSession ? account.focusSessionId : undefined} onEnded={endFocusSession}><div className={`app focusApp academyUnified ${isParent?'parentApp':'studentApp'}`} data-theme={activeTheme}>
    <a className="skipLink" href="#study-main">Terus ke kandungan</a>
    <header className="focusMobileHeader"><button className="focusBrandButton" onClick={()=>navigate(isParent?'home':'learn')} aria-label="IMAI Study — Utama"><FocusBrand/></button><button ref={menuTriggerRef} className="iconButton" aria-label={menuOpen?'Tutup menu':'Buka menu'} aria-expanded={menuOpen} aria-controls="study-sidebar" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button></header>
    {menuOpen&&<button className="focusMenuBackdrop" aria-label="Tutup menu" onClick={()=>setMenuOpen(false)}/>}
    <aside ref={sidebarRef} id="study-sidebar" className={`focusSidebar ${menuOpen?'isOpen':''}`} role={menuOpen?'dialog':undefined} aria-modal={menuOpen?true:undefined} aria-label="Navigasi Study">{menuOpen&&<button type="button" className="miniButton focusDrawerClose" onClick={()=>{setMenuOpen(false);menuTriggerRef.current?.focus();}}>Tutup menu<X aria-hidden="true"/></button>}<button className="focusBrandButton" onClick={()=>navigate(isParent?'home':'learn')}><FocusBrand/></button>
      <nav aria-label="Menu utama">{navigation.map(item=><button key={item.id} aria-current={activeNav===item.id?'page':undefined} onClick={()=>navigate(item.id)}><item.icon/><span>{item.label}</span></button>)}</nav>
      <div className="focusSidebarBottom"><div className="focusAccount"><span className="focusUserAvatar"><UserRound/></span><strong>{isParent?'Ibu / Bapa':study.profile.name}</strong><small>{isParent?'Akaun penjaga':level.label}</small></div>
      {isParent&&account.roles?.includes("teacher")&&<AccountRoleSwitcher account={account} onSwitched={(user)=>void changeWorkspace(user)}/>}
      {isParent&&<button onClick={()=>navigate('manage')}><UserRound/>Urus anak</button>}
      {!isParent&&<button onClick={()=>navigate('settings')}><Settings/>Tetapan</button>}
      {!hasFocusSession&&<button onClick={logout}><LogOut/>{isParent?'Log keluar':'Log masuk ibu bapa'}</button>}
      </div>
    </aside>
    <nav className={`focusMobileNav ${isParent ? "parentMobileNav" : ""}`} aria-label="Menu telefon">{navigation.slice(0,4).map(item=><button key={item.id} aria-current={activeNav===item.id?'page':undefined} onClick={()=>navigate(item.id)}><item.icon/>{item.label}</button>)}<button type="button" aria-label="Buka semua menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(value=>!value)}><Menu aria-hidden="true"/>Menu</button></nav>
    <div className="focusMain" id="study-main" tabIndex={-1}>
    <AcademyTopbar role={isParent?"parent":"student"} displayName={isParent ? (account.displayName ?? account.display_name ?? "Ibu Bapa") : study.profile.name}/>
    {syncNotice && <div className="syncNotice" role="status"><Cloud/><span>{syncNotice}</span><button type="button" aria-label="Tutup notis" onClick={() => setSyncNotice("")}><X/></button></div>}
    {isParent && deleteTarget && <div className="deleteOverlay"><form className="deleteDialog" onKeyDown={(event) => {
      if (event.key === "Escape" && !profileBusy) {setDeleteTarget(null);setDeleteName("");}
      if (event.key === "Tab") {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input, button:not(:disabled)'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
      }
    }} role="dialog" aria-modal="true" aria-labelledby="deleteTitle" onSubmit={(event) => { event.preventDefault(); void removeChild(); }}>
      <h2 id="deleteTitle">Padam profil anak?</h2>
      <p><strong>{studentLabel(deleteTarget)}</strong></p>
      <p>{study.attempts.length} sesi latihan dimuatkan untuk profil ini. Profil ini, sejarah latihan dan perbualan AI akan dipadam secara kekal. Profil anak lain tidak terjejas.</p>
      <label>Taip {deleteTarget.name} untuk sahkan<input autoFocus value={deleteName} onChange={(event) => setDeleteName(event.target.value)} autoComplete="off" /></label>
      <div className="headActions"><button type="button" className="miniButton" disabled={profileBusy} onClick={() => {setDeleteTarget(null);setDeleteName("");}}>Batal</button><button className="dangerButton" disabled={profileBusy || deleteName !== deleteTarget.name} type="submit">{profileBusy ? "Memadam..." : "Padam secara kekal"}</button></div>
    </form></div>}

    {screen === "tuition" && isParent && <TuitionTeacherDirectory studentId={study.profile.cloudId} hasStudent={Boolean(study.profile.cloudId)} onManage={()=>setScreen("manage")} onConnect={()=>setScreen("my-teacher")}/>}
    {screen === "home" && isParent && <>
      <ParentDashboard study={study} students={cloudStudents} busy={profileBusy} onSwitch={id=>void switchStudent(id).catch(()=>setSyncNotice("Profil belum dapat dimuatkan. Cuba lagi."))} onManage={()=>setScreen('manage')} onReports={()=>setScreen('parent')} onLinks={()=>setScreen('links')} onStudentMode={()=>void enterStudentMode()} overview={<div className="academyOverviewGrid"><AcademyParentInsights study={study} onReport={()=>setScreen("parent")} onTeacher={()=>setScreen("tuition")} onManage={()=>setScreen("manage")}/><AcademyNextClass key={study.profile.cloudId??"no-child"} role="parent" studentId={study.profile.cloudId} onDetails={()=>academyFocusSection("academy-parent-tuition")}/></div>}/>
      <div id="academy-parent-tuition">
      <ParentTuitionOverview studentId={study.profile.cloudId} studentName={study.profile.name}
        onFindTeacher={()=>setScreen("tuition")} onConnections={()=>setScreen("my-teacher")} onManage={()=>setScreen("manage")}/>
      </div>
    </>}
    {screen === "learn" && <div className="academyStudentHome">
      {!isParent && <AcademyWelcomeBanner study={study} onLearn={()=>{const reading=libraryResources.find(item=>item.kind==="reading"&&item.levelIds.includes(study.profile.levelId)&&item.unitId);if(!study.profile.levelId.startsWith("t")&&reading)openLibrary(reading.id);else setScreen("subjects");}}/>}
      {!isParent && <div className="academyDashboardBody academyStudentOverview"><div className="academyOverviewGrid"><AcademyNextClass role="student" studentId={study.profile.cloudId} onDetails={()=>setScreen("classes")}/><AcademyProgressCard study={study} onProgress={()=>setScreen("progress")}/></div></div>}
      {!isParent && <AcademyStudentActions onLearn={()=>setScreen("subjects")} onTutor={()=>{setTutorResourceId(undefined);setScreen("tutor");}} onMaterials={()=>setScreen("teacher-materials")} onProgress={()=>setScreen("progress")} onLibrary={()=>openLibrary()}/>}
      {!isParent && <div className="academyDashboardBody"><AcademyLearningActivity study={study} onProgress={()=>setScreen("progress")}/>{study.profile.cloudId&&<FamilyHomeworkPanel studentId={study.profile.cloudId} canSubmit={true}/>}</div>}
      <LearnerDashboard study={study} profileKey={`${account.id}:${study.profile.cloudId}`} onAllSubjects={()=>setScreen('subjects')} onSubject={id=>{setSubjectId(id);setScreen('topics');}} onRead={openLibrary} onLesson={(t,id)=>startQuiz(t,id)} onLibrary={()=>openLibrary()} onRevision={()=>setScreen('revision')} onProgress={()=>setScreen(isParent?'parent':'progress')} onTutor={()=>{setTutorResourceId(undefined);setScreen('tutor');}}/>
    </div>}
    {screen === "classes" && !isParent && <StudentTuitionOverview studentId={study.profile.cloudId} onMaterials={()=>setScreen("teacher-materials")} onTutor={()=>{setTutorResourceId(undefined);setScreen("tutor");}}/>}
    {screen === "homework" && !isParent && <main className="content"><h1>Tugasan Saya</h1>{study.profile.cloudId?<FamilyHomeworkPanel studentId={study.profile.cloudId} canSubmit={true}/>:<p>Profil pelajar diperlukan untuk melihat tugasan.</p>}</main>}
    {screen === "links" && isParent && !study.profile.cloudId && <main className="content"><h1>Kongsi link belajar</h1><p>Tambah profil anak dahulu untuk sediakan link belajar mereka.</p><button className="primary" onClick={()=>setScreen('manage')}>Tambah anak<Plus/></button></main>}
    {screen === "settings" && <main className="content focusSettings"><h1>Tetapan</h1><p>Ruang Study anda, mudah diurus.</p><section><h2>{isParent?'Akaun ibu bapa':study.profile.name}</h2><p>{isParent?'Urus profil anak dan sediakan sesi belajar yang sesuai.':`${level.label} · Kemajuan latihan disimpan selepas selesai.`}</p>{isParent?<button className="primary" onClick={()=>setScreen('manage')}><UserRound/>Urus anak</button>:<button className="miniButton" onClick={()=>setScreen('learn')}>Kembali belajar<ArrowRight/></button>}</section>{isParent&&<TeacherApplicationPanel defaultName={account.displayName??account.display_name??""} onApproved={()=>void refreshAccount()}/>}<section><PwaInstall/></section>{isParent && <ParentFeedbackForm />}{!hasFocusSession&&<section><h2>{isParent?'Selesai menggunakan Study?':'Peranti ini untuk ibu bapa?'}</h2><p>{isParent?'Anda boleh log masuk semula untuk melihat laporan anak.':'Ibu bapa perlu log masuk untuk mengurus profil dan laporan.'}</p><button className="miniButton" onClick={logout}><LogOut/>{isParent?'Log keluar':'Log masuk ibu bapa'}</button></section>}</main>}
    {screen === "my-teacher" && isParent && (study.profile.cloudId?<ParentTeacherConnection studentId={study.profile.cloudId} studentName={study.profile.name} onOpenMaterials={()=>setScreen("teacher-materials")}/>:<main className="content"><h1>Guru Saya</h1><p>Tambah profil anak dahulu sebelum menyertai kelas guru.</p><button className="primary" onClick={()=>setScreen("manage")}>Tambah anak</button></main>)}
    {screen === "progress" && !isParent && <main className="content"><h1>Prestasi saya</h1><p>Setiap latihan ialah satu langkah ke hadapan.</p><div className="metrics"><div><small>Latihan selesai</small><b>{study.attempts.length}</b></div><div><small>Soalan dijawab</small><b>{questionsDone}</b></div><div><small>Ketepatan</small><b>{accuracy}%</b></div></div><section className="focusProgressSubjects"><h2>Langkah mengikut subjek</h2>{availableSubjects.map(item=><div className="subbar" key={item.id}><span>{item.name}</span><div><i style={{width:`${subjectMastery(study.attempts,level.id,item.id)}%`}}/></div><b>{subjectMastery(study.attempts,level.id,item.id)}%</b></div>)}</section><button className="primary" onClick={()=>setScreen('learn')}>Sambung belajar<ArrowRight/></button></main>}
    {screen === "manage" && isParent && <div className="parentPwaInstall"><PwaInstall/></div>}
    {screen === "manage" && isParent && <main className="hero focusManage">
      <section>
        <h1>Urus anak</h1>
        <p>Urus nama dan tahap anak di sini. Laporan hanya tersedia dalam sesi ibu bapa. Buka Mod Murid sebelum menyerahkan peranti kepada anak.</p>
        <div className="profile">
          <label>{creatingNewStudent || !study.profile.cloudId ? "Nama anak" : "Nama pelajar"}
            <input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </label>
          <label>Tahap
            <select value={draftLevel} onChange={(e) => setDraftLevel(e.target.value as LevelId)}>
              {levels.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.stage}</option>)}
            </select>
          </label>
          <button disabled={profileBusy} onClick={() => void saveProfile()}>{creatingNewStudent || !study.profile.cloudId ? "Tambah anak" : "Simpan profil"} <ChevronRight /></button>
        </div>
        {study.profile.cloudId && !creatingNewStudent && <div className="headActions"><button className="primary" disabled={profileBusy} onClick={() => void enterStudentMode()}>Buka Mod Murid <ChevronRight /></button><button className="miniButton" onClick={() => setScreen("parent")}>Lihat laporan</button></div>}
        {study.profile.cloudId && !creatingNewStudent && <button className="deleteChildLink" disabled={profileBusy} onClick={() => {const target = cloudStudents.find((item) => item.id === study.profile.cloudId); if(target) {setDeleteTarget(target);setDeleteName("");}}}>Padam profil anak</button>}
        {creatingNewStudent && study.profile.cloudId && <button className="miniButton" disabled={profileBusy} onClick={() => {setCreatingNewStudent(false);setDraftName(study.profile.name);setDraftLevel(study.profile.levelId);}}>Batal tambah anak</button>}
        {cloudStudents.length > 0 && !creatingNewStudent && <button className="addChildLink" disabled={profileBusy} onClick={()=>{setCreatingNewStudent(true);setDraftName("");setDraftLevel("d1")}}><Plus/> Tambah profil anak</button>}
      </section>
      <aside className="focusManageArt"><img src="/focus-books.webp" alt="" width="360" height="270"/><h2>Ruang belajar yang sesuai</h2><p>Pilih tahap kelas sebenar anak. Nota dan latihan akan mengikut tahap yang dipilih.</p></aside>
    </main>}
    {screen === "links" && isParent && study.profile.cloudId && <ParentStudyLinks key={study.profile.cloudId} studentId={study.profile.cloudId} studentName={study.profile.name} />}
    {screen === "exam" && (study.profile.cloudId
      ? <ExamRevision key={`${account.id}:${study.profile.cloudId}:${study.profile.levelId}`} studentId={study.profile.cloudId} levelId={study.profile.levelId} accountKey={account.id} allowExternalLinks={!account.focusSessionId} onOpenTopicPractice={() => setScreen("revision")} />
      : <main className="content"><h2>Tambah profil anak dahulu</h2><p>Tahap profil menentukan set ulang kaji yang sesuai.</p><button className="primary" onClick={() => setScreen("manage")}>Urus profil anak</button></main>)}
    {screen === "revision" && <UnitRevision levelId={level.id} levelLabel={level.label} profileKey={`${account.id}:${study.profile.cloudId}`} attempts={study.attempts} onReview={(item,id) => startQuiz(item,id,"review")} onLearn={id => {setSubjectId(id);setScreen("topics");}} onExam={() => setScreen("exam")}/>}
    {screen === "lesson" && topic?.unitId && <UnitLesson key={`${study.profile.cloudId}:${topic.unitId}`} unitId={topic.unitId} profileKey={`${account.id}:${study.profile.cloudId}`} onBack={() => setScreen("topics")} onStart={() => lessonDestination === "challenge" ? setScreen("challenge") : startQuiz(topic,safeSubjectId,quizMode,true)}/>}
    {screen === "subjects" && <main className="content">
      <LearningWelcome name={study.profile.name} levelLabel={level.label} secondary={level.stage !== "KSSR"} streak={study.streak} />
      <div className="head learnerSubjectsHeading"><div><h2>Pilih subjek</h2><p>Belajar daripada gambar, nota dan contoh. Kemudian cuba aktiviti dalam unit yang sama.</p></div>{level.id !== "d1" && diagnosticTotal > 0 && <button className="miniButton" onClick={startDiagnostic}><Brain aria-hidden="true" />{diagnosticAvailable.length ? "Ulang kaji unit dipelajari" : "Ulang kaji unit dipelajari · Soalan sama"}</button>}</div>
      <div className="subjectGrid learnerSubjectGrid">{availableSubjects.map((item) => {
        const mastery = subjectMastery(study.attempts, study.profile.levelId, item.id);
        const hasPractised = study.attempts.some(attempt => attempt.levelId === study.profile.levelId && attempt.subjectId === item.id);
        const bank = getTopics(study.profile.levelId, item.id);
        const total = bank.reduce((sum, topic) => sum + topic.questions.length, 0);
        return <button className="subjectCard" key={item.id} onClick={() => { setSubjectId(item.id); setScreen("topics"); }}>
          <SubjectGraphic subjectId={item.id} /><div className="subjectText"><b>{item.name}</b><small>{learningPolicy(level.id).approach}</small><small>{bank.length} unit pilihan · {total} aktiviti berpandu</small><small>{hasPractised ? `${mastery}% penguasaan latihan topik` : "Jom mula belajar"}</small><span className="subjectProgress" aria-hidden="true"><i style={{ width: `${mastery}%` }} /></span></div><ChevronRight aria-hidden="true" />
        </button>;
      })}</div>
    </main>}

    {screen === "challenge" && study.profile.cloudId && <ChallengeJourney
      key={`${study.profile.cloudId}:${level.id}:${safeSubjectId}`}
      studentId={study.profile.cloudId} levelId={level.id} levelLabel={level.label}
      subjectId={safeSubjectId} subjectName={subject.name}
      onBack={() => setScreen("subjects")} onPracticeFallback={() => setScreen("topics")}
      onReadResource={id => { setLibraryResourceId(id); setReturnToChallenge(true); setScreen("library"); }}
    />}

    {screen === "topics" && <main className="content">
      <button className="back" onClick={() => setScreen("subjects")}>← Semua subjek</button>
      <div className="head"><div><div className="learnerTopicTitle"><SubjectGraphic subjectId={safeSubjectId} /><div><small>{level.label} · {level.stage}</small><h2>{subject.name}</h2></div></div><p>Pilih unit Library. Lihat nota dan contoh dahulu, kemudian jawab latihan daripada unit itu.</p></div><div className="master"><b>{subjectMastery(study.attempts, study.profile.levelId, safeSubjectId)}%</b><small>Penguasaan</small></div></div>
      <div className="topicList">{topics.length ? topics.map((item) => {
        const mastery = topicMastery(study.attempts, study.profile.levelId, safeSubjectId, item);
        return <div className="topic" key={item.id}><div><b>{item.name}</b><small>{item.description}</small></div><div className="bar"><i style={{ width: `${mastery}%` }} /><small>{mastery ? `${mastery}% mastery` : "Belum dicuba"}</small></div><div className="unitTopicActions"><button className="primary" onClick={() => startQuiz(item,safeSubjectId,practicePool(item,study.profile.levelId,safeSubjectId,study.attempts,study.questionHistory).unseen.length ? "new" : "review")}>Belajar dan cuba</button>{level.id !== "d1" && <button className="miniButton" onClick={() => {setTopic(item);setLessonDestination("challenge");setScreen("lesson");}}>Cabaran unit · Maksimum {learningPolicy(level.id).maximum}</button>}<button className="miniButton" onClick={() => {setLibraryResourceId(item.resourceId);setReturnToChallenge(false);setScreen("library");}}>Buka unit dalam Library</button></div></div>;
      }) : <div className="emptyState"><b>Subjek tersedia dalam katalog STPM.</b><p>Bahan untuk subjek ini sedang disediakan. Pilih subjek lain untuk terus belajar.</p></div>}</div>
    </main>}
    {screen === "complete" && topic && <main className="quiz">
      <section aria-labelledby="practiceDoneTitle">
        <div className="learnerFeedback"><CheckCircle2 aria-hidden="true" /><h2 id="practiceDoneTitle">Set selesai. Bagus usaha anda!</h2></div>
        <p>{subject.name} · {topic.name}</p>
        <p><strong>Skor {currentScore}/{quizQuestions.length}</strong> · Kemajuan set ini sudah direkod pada peranti.</p>
        <p>Nak cuba lagi? Sambung set seterusnya sekarang, atau berehat dahulu.</p>
        <PracticeChoices pool={practicePool(topic, study.profile.levelId, safeSubjectId, study.attempts, study.questionHistory)} onStart={mode => startQuiz(topic, safeSubjectId, mode)} />
        <div className="headActions"><button className="miniButton" onClick={() => setScreen("topics")}>Pilih topik lain</button><button className="miniButton" onClick={() => setScreen("subjects")}>Tukar subjek</button></div>
      </section>
    </main>}
    {screen === "quiz" && topic && quizQuestions.length > 0 && <main className="quiz">
      <div className="quizTop"><button className="back" onClick={() => setScreen("topics")}>← Keluar</button><span>{topic.name}</span><b>{questionIndex + 1}/{quizQuestions.length}</b></div>
      <p className="practiceSessionLabel">{quizMode === "new" ? "Aktiviti daripada unit yang dipelajari" : "Ulang kaji · Aktiviti yang pernah tersedia dalam unit ini"}</p>
      <UnitQuestionCard levelId={level.id} key={quizQuestions[questionIndex].id} question={quizQuestions[questionIndex]} selected={selected} onSelect={answer} onNext={() => void finishOrNext()} last={questionIndex === quizQuestions.length-1} language={libraryResources.find(r => r.unitId === topic.unitId)?.language ?? "ms"}/>

    </main>}

    {screen === "quiz" && topic && quizQuestions.length === 0 && <main className="quiz">
      <button className="back" onClick={() => setScreen("topics")}>← Pilih topik lain</button>
      <section><h2>{topic.name}</h2><PracticeChoices pool={practicePool(topic, study.profile.levelId, safeSubjectId, study.attempts, study.questionHistory)} onStart={mode => startQuiz(topic, safeSubjectId, mode)} /></section>
    </main>}

    {screen === "diagnostic" && diagnosticPool[diagnosticIndex] && <main className="quiz">
      <div className="quizTop"><button className="back" onClick={() => setScreen("subjects")}>← Keluar</button><span>Diagnostic · {diagnosticPool[diagnosticIndex].subject.name}</span><b>{diagnosticIndex + 1}/{diagnosticPool.length}</b></div>
      <section>
        <div className="qbar"><i style={{ width: `${((diagnosticIndex + 1) / diagnosticPool.length) * 100}%` }} /></div>
        <small>{diagnosticReview ? "Diagnostic ulangan · Soalan sama" : "Diagnostic · Soalan belum dijawab"} · {diagnosticPool[diagnosticIndex].topic.name}</small><h2>{diagnosticPool[diagnosticIndex].question.prompt}</h2>
        <div className="opts">{diagnosticPool[diagnosticIndex].question.options.map((option, index) => <button key={option} disabled={diagnosticSelected !== null} onClick={() => answerDiagnostic(index)} className={diagnosticSelected === null ? "" : index === diagnosticPool[diagnosticIndex].question.answer ? "ok" : index === diagnosticSelected ? "no" : ""}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
        {diagnosticSelected !== null && <div className="explain"><b>{diagnosticSelected === diagnosticPool[diagnosticIndex].question.answer ? "Betul!" : "Belum tepat."}</b><p>{diagnosticPool[diagnosticIndex].question.explanation}</p><button className="primary" onClick={() => void finishDiagnosticOrNext()}>{diagnosticIndex === diagnosticPool.length - 1 ? "Selesai diagnostic" : "Soalan seterusnya"} <ChevronRight /></button></div>}
      </section>
    </main>}

    {screen === "library" && <>
      {returnToChallenge && <div className="content"><button className="miniButton" onClick={() => {setReturnToChallenge(false);setLibraryResourceId(undefined);setScreen("challenge");}}>← Sambung Tahap Cabaran</button></div>}
      <LearningLibrary key={`${level.id}:${libraryResourceId ?? "all"}`} initialResourceId={libraryResourceId} levelId={level.id} allowExternalLinks={!account.focusSessionId} stage={level.stage} levelLabel={level.label} subjects={availableSubjects.map(s=>({id:s.id,name:s.name}))} profileKey={`${account.id}:${study.profile.cloudId}`} onOpenSubject={(id,unitId,taught)=>{const unit=getTopics(level.id,id).find(t=>t.unitId===unitId); if(unit) startQuiz(unit,id,practicePool(unit,level.id,id,study.attempts,study.questionHistory).unseen.length ? "new" : "review",taught); else {setSubjectId(id);setScreen("topics");}}} onAskTutor={(resourceId)=>{setTutorResourceId(resourceId);setScreen("tutor")}} />
    </>}

    {screen === "teacher-materials" && study.profile.cloudId && <StudentTeacherMaterials studentId={study.profile.cloudId} levelLabel={level.label} subjects={availableSubjects.map((item) => ({ id: item.id, name: item.name }))} onOpenLibrary={()=>openLibrary()} onManageTeacher={isParent?()=>setScreen("my-teacher"):undefined} />}

    {screen === "parent" && isParent && <main className="content">
      {study.profile.cloudId && <ChallengeParentReport key={`${study.profile.cloudId}:${level.id}`} studentId={study.profile.cloudId} />}
      <div className="head"><div><small>Laporan latihan topik</small><h2>Prestasi {study.profile.name}</h2><p>Angka di sini merangkumi latihan topik terdahulu. Keputusan exam dan markah semakan sendiri dipaparkan dalam Ulang kaji exam.</p><button className="miniButton" onClick={() => setScreen("revision")}>Lihat sesi ulang kaji exam</button></div><div className="headActions"><span className="streak"><UserRound />{level.label}</span><button className="miniButton" onClick={()=>{setCreatingNewStudent(true);setDraftName("");setDraftLevel("d1");setScreen("manage")}}><Plus/>Anak</button></div></div>
      <div className="metrics"><div><small>Soalan</small><b>{questionsDone}</b><span>direkod</span></div><div><small>Ketepatan</small><b>{accuracy}%</b><span>semua sesi</span></div><div><small>Sesi</small><b>{study.attempts.length}</b><span>selesai</span></div><div><small>Streak</small><b>{study.streak} hari</b><span>sasaran harian</span></div></div>
      <div className="masteryMap"><h3>Penguasaan topik</h3>{rankedTopics.slice(0,6).map((item)=><div className={`masteryNode ${item.band}`} key={`${item.subject.id}-${item.topic.id}`}><span>{item.subject.short}</span><div><b>{item.topic.name}</b><small>{item.band} · {item.mastery}%</small></div></div>)}</div><div className="studyPlan"><h3>Latihan seterusnya</h3>{!studyPlan.length && <p>Semua soalan topik yang tersedia sudah dijawab. Pilih topik untuk ulang kaji, atau baca nota di Library.</p>}{studyPlan.map((item)=><button key={item.day} onClick={()=>{startQuiz(item.topic, item.subject.id)}}><span>Sesi {item.day}</span><div><b>{item.subject.name} · {item.topic.name}</b><small>{item.minutes} minit · {item.band}</small></div><ChevronRight/></button>)}</div><div className="dash"><section><h3>Prestasi subjek</h3>{availableSubjects.slice(0, 8).map((item) => { const value = subjectMastery(study.attempts, study.profile.levelId, item.id); return <div className="subbar" key={item.id}><span>{item.name}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>; })}</section><section><h3>Misi hari ini</h3><article><b>{mission.questions}/10 soalan · {mission.xp} XP</b><strong>{mission.accuracy}% ketepatan</strong><p>{mission.questionsGoalMet && mission.accuracyGoalMet ? "Misi harian selesai. Hebat! Anda masih boleh sambung latihan." : "Selesaikan 10 soalan dan capai sekurang-kurangnya 80% ketepatan."}</p></article><h3>Cadangan seterusnya</h3>{weakTopic ? <article><b>{weakTopic.subject.name} · {weakTopic.topic.name}</b><strong>{weakTopic.mastery}% mastery</strong><p>{weakTopic.attempted ? `Ada ${weakTopic.remaining} soalan belum dijawab dalam topik ini.` : "Belum ada baseline untuk topik ini. Diagnostic atau latihan pertama akan mengukur tahap semasa."}</p><button className="miniButton" onClick={() => { startQuiz(weakTopic.topic, weakTopic.subject.id); }}>Buka latihan berpandu <ChevronRight /></button></article> : <article><b>Tiada soalan topik baharu</b><p>Semua soalan yang tersedia sudah dijawab. Pilih topik untuk ulang kaji atau baca nota.</p><button className="miniButton" onClick={() => setScreen("subjects")}>Pilih topik untuk ulang kaji</button></article>}</section></div>
    </main>}

    {screen === "tutor" && !profileBusy && <TutorPanel
      key={[account.id, account.role, study.profile.cloudId, level.id].join(":")}
      studentId={study.profile.cloudId} levelId={level.id} initialSubjectId={safeSubjectId}
      initialTopicId={topics.some((item) => item.id === topic?.id) ? topic?.id : undefined}
      initialResourceId={tutorResourceId}
    />}

    <StudyFooter/>
    </div>
  </div></StudySessionGate>;
}
