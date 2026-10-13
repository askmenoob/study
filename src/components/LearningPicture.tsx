import { Ear, Eye, Hand, HandHeart, HelpCircle, Moon, Trash2, Users } from "lucide-react";
import type { LearningVisual, PictureKind } from "../../server/library/earlyLearning";

const colours = { red: "#ef5b5b", blue: "#4c8de5", yellow: "#f7c847", green: "#56ab77" };
const icons = { eye: Eye, ear: Ear, hand: Hand, thanks: HandHeart, sleep: Moon, bin: Trash2, ask: HelpCircle, share: Users };
function Drawing({ kind, colour, text }: { kind: PictureKind; colour: string; text?: string }) {
  const Icon = icons[kind as keyof typeof icons];
  if (Icon) return <Icon aria-hidden="true" viewBox="0 0 24 24" strokeWidth={1.6} stroke="#233f57" fill={colour} />;
  return <svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="#233f57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {kind === "glyph" && <><rect x="5" y="5" width="90" height="90" rx="14" fill="#fff"/><text x="50" y="54" textAnchor="middle" dominantBaseline="middle" fill="#233f57" stroke="none" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize={Math.min(58, 150 / Math.max(1, Array.from(text ?? "").length))}>{text}</text></>}
    {kind === "circle" && <circle cx="50" cy="50" r="37" fill={colour}/>}
    {kind === "square" && <rect x="16" y="16" width="68" height="68" fill={colour}/>}
    {kind === "rectangle" && <rect x="8" y="27" width="84" height="46" fill={colour}/>}
    {kind === "triangle" && <polygon points="50,10 90,85 10,85" fill={colour}/>}
    {kind === "oval" && <ellipse cx="50" cy="50" rx="42" ry="26" fill={colour}/>}
    {kind === "star" && <polygon points="50,7 61,35 92,37 68,57 76,88 50,70 24,88 32,57 8,37 39,35" fill={colour}/>}
    {kind === "ball" && <><circle cx="50" cy="50" r="38" fill={colour}/><path d="M16 34Q50 61 84 32M28 80Q54 42 38 14M64 17Q78 60 48 88" stroke="#fff"/><ellipse cx="34" cy="28" rx="10" ry="5" fill="#fff" opacity=".35" stroke="none"/></>}
    {kind === "book" && <><path d="M16 18Q31 10 50 23Q70 10 86 18V80Q67 73 50 87Q31 73 16 80Z" fill={colour}/><path d="M50 23V86M24 31L42 35M24 43L42 47M59 34L77 30M59 46L77 42" stroke="#fff"/></>}
    {kind === "fish" && <><path d="M72 37L93 24V76L72 63Q46 99 9 50Q43 2 72 37Z" fill={colour}/><circle cx="30" cy="43" r="4" fill="#233f57"/><path d="M49 35Q37 49 49 65M25 59L33 58"/></>}
    {kind === "cup" && <><path d="M68 29H79Q98 49 73 58" fill={colour}/><path d="M20 22H72L67 77Q45 89 25 77Z" fill={colour}/><ellipse cx="46" cy="23" rx="26" ry="7" fill="#f6eee2"/><path d="M31 37L34 64" stroke="#fff"/></>}
    {kind === "pencil" && <><path d="M25 76L66 12L85 25L44 88L17 97Z" fill={colour}/><path d="M25 76L44 88L17 97Z" fill="#f6d6a6"/><path d="M67 13L85 25L90 17Q80 0 73 4Z" fill="#ee9292"/></>}
    {kind === "leaf" && <><path d="M18 79Q1 12 85 14Q97 85 18 79Z" fill={colour}/><path d="M10 93L76 24M28 74L25 47M43 59L40 32M45 58L71 61"/></>}
    {kind === "plate" && <><ellipse cx="49" cy="56" rx="41" ry="31" fill="#dceef5"/><ellipse cx="49" cy="56" rx="29" ry="22" fill="#fff"/><path d="M35 60Q34 33 61 42Q74 63 56 66Z" fill="#f6dcac"/><path d="M26 60Q20 41 35 44L41 56Z" fill="#56ab77"/><path d="M72 39V16M78 39V16M84 39V16M78 38V83"/></>}
    {kind === "spill" && <><path d="M17 33L59 18L76 46L30 66Z" fill="#dceef5"/><ellipse cx="57" cy="77" rx="30" ry="12" fill="#72b8e4"/><circle cx="72" cy="62" r="5" fill="#f6c55a"/><circle cx="86" cy="49" r="5" fill="#f6c55a"/></>}
    {kind === "blocks" && <><path d="M20 31L50 14L80 31V70L50 88L20 70Z" fill={colour}/><path d="M20 31L50 49L80 31M50 49V88"/></>}
    {kind === "clearCup" && <><path d="M22 20H75L67 85H30Z" fill="#8bc8e7" fillOpacity=".18"/><ellipse cx="48" cy="20" rx="27" ry="6"/><path d="M34 32L39 69M67 33L63 71" stroke="#8bc8e7"/></>}
    {kind === "fractionStrip" && <>{Array.from({length:8},(_,i)=><rect key={i} x={6+i*11} y="36" width="11" height="28" fill={i<3?colours.blue:i<5?colours.yellow:"#fff"} strokeWidth="1.5"/>)}</>}
    {kind === "emptyBasket" && <><path d="M12 47H88L78 85H22Z" fill={colour}/><path d="M23 48Q24 2 50 8Q76 2 77 48M29 56L32 78M48 56V78M68 56L64 78"/></>}
    {kind === "basket" && <><rect x="24" y="27" width="27" height="27" rx="4" fill="#ef5b5b"/><rect x="51" y="31" width="27" height="27" rx="4" fill="#4c8de5"/><path d="M12 47H88L78 85H22Z" fill="#eec781"/><path d="M23 48Q24 2 50 8Q76 2 77 48M29 56L32 78M48 56V78M68 56L64 78"/></>}
    {kind === "wash" && <><path d="M17 19H46V34H32V45H17Z" fill="#b4cedd"/><path d="M21 51V60M30 51V60M17 7H43M30 7V18" stroke="#4c8de5"/><path d="M13 70Q20 63 40 65L64 53Q71 52 72 58L53 72L78 61Q88 61 87 68L61 86Q34 93 13 83Z" fill="#e6b994"/></>}
  </svg>;
}

export function LearningPicture({ visual, small = false }: { visual: LearningVisual; small?: boolean }) {
  const items = visual.items.flatMap((item, index) => Array.from({ length: Math.max(1,Math.min(10,item.count ?? 1)) }, (_, n) => ({ ...item, key: `${index}:${n}` })));
  return <div className={`learningPicture${small ? " learningPictureSmall" : ""}${items.length > 1 ? " learningPictureMany" : ""}`} role="img" aria-label={visual.label}>
    {items.map(item => <span key={item.key}><Drawing kind={item.kind} text={item.text} colour={colours[item.color ?? "yellow"]}/></span>)}
  </div>;
}
