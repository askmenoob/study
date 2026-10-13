import {
  Atom, BookMarked, BookOpen, BriefcaseBusiness, Calculator, ChartNoAxesCombined,
  Dna, Dumbbell, Flame, FlaskConical, Globe2, HeartHandshake, Landmark, Languages,
  Leaf, MessageCircle, Monitor, Palette, PenLine, Scale, Sigma, Sprout,
  type LucideIcon,
} from "lucide-react";
import "./LearnerGraphics.css";

type GraphicTone = "indigo" | "teal" | "amber" | "coral" | "violet" | "blue";
type SubjectIllustration = { icon: LucideIcon; tone: GraphicTone };

const subjectIllustrations: Record<string, SubjectIllustration> = {
  bm: { icon: PenLine, tone: "indigo" },
  en: { icon: MessageCircle, tone: "blue" },
  math: { icon: Calculator, tone: "amber" },
  science: { icon: FlaskConical, tone: "teal" },
  history: { icon: Landmark, tone: "coral" },
  geo: { icon: Globe2, tone: "blue" },
  islam: { icon: BookOpen, tone: "teal" },
  moral: { icon: HeartHandshake, tone: "violet" },
  pa: { icon: Globe2, tone: "indigo" },
  bc: { icon: Languages, tone: "coral" },
  bt: { icon: Languages, tone: "amber" },
  ba: { icon: Languages, tone: "teal" },
  lit_en: { icon: BookMarked, tone: "blue" },
  kmk: { icon: PenLine, tone: "violet" },
  syariah: { icon: Scale, tone: "teal" },
  usuluddin: { icon: BookMarked, tone: "indigo" },
  tahfiz: { icon: BookOpen, tone: "teal" },
  economics: { icon: ChartNoAxesCombined, tone: "amber" },
  business: { icon: BriefcaseBusiness, tone: "coral" },
  accounting: { icon: Calculator, tone: "blue" },
  mgmt_math: { icon: ChartNoAxesCombined, tone: "violet" },
  stpm_math: { icon: Sigma, tone: "indigo" },
  ict: { icon: Monitor, tone: "blue" },
  physics: { icon: Atom, tone: "violet" },
  chemistry: { icon: FlaskConical, tone: "coral" },
  biology: { icon: Dna, tone: "teal" },
  sports_science: { icon: Dumbbell, tone: "amber" },
  visual_art: { icon: Palette, tone: "coral" },
};

const fallbackIllustration: SubjectIllustration = { icon: BookOpen, tone: "indigo" };

export function SubjectGraphic({ subjectId }: { subjectId: string }) {
  const { icon: Icon, tone } = Object.hasOwn(subjectIllustrations, subjectId)
    ? subjectIllustrations[subjectId]
    : fallbackIllustration;
  return <span className={`subjectGraphic subjectGraphic--${tone}`} aria-hidden="true">
    <span className="subjectGraphicShape" />
    <Icon className="subjectGraphicIcon" strokeWidth={1.8} aria-hidden="true" />
  </span>;
}

export function LearningWelcome({ name, levelLabel, secondary, streak }: {
  name: string;
  levelLabel: string;
  secondary: boolean;
  streak: number;
}) {
  const StreakIcon = streak > 0 ? Flame : Sprout;
  return <section className={`learnerWelcome${secondary ? " learnerWelcome--secondary" : ""}`} aria-label="Selamat datang">
    <div className="learnerWelcomeCopy">
      <p className="learnerWelcomeIdentity">Hai, {name} <span aria-hidden="true">·</span> {levelLabel}</p>
      <h2>{secondary ? "Langkah kecil, kemajuan besar." : "Jom teroka sesuatu hari ini!"}</h2>
      <p className="learnerWelcomeDescription">{secondary
        ? "Pilih satu subjek dan bina kefahaman, satu topik pada satu masa."
        : "Ada banyak perkara menarik untuk dipelajari. Pilih subjek dan jom cuba!"}</p>
      <div className="learnerWelcomeStreak">
        <StreakIcon size={17} aria-hidden="true" />
        <span>{streak > 0 ? `${streak} hari belajar` : "Jom belajar hari ini"}</span>
      </div>
    </div>
    <img className="learnerWelcomeArt" src="/focus-books.webp" alt="" width={960} height={640} decoding="async" />
    <Leaf className="learnerWelcomeLeaf" size={22} aria-hidden="true" />
  </section>;
}
