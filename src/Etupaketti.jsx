import { useState, useMemo, useRef, useEffect } from "react";
/* Verologia-laskuri – sivuston design-järjestelmä
   Fontit: Bricolage Grotesque (otsikot/numerot) + Inter (leipä) */
const NAVY = "#0D263F";
const NAVY_2 = "#0A1E33";
const ACCENT = "#3C72AB";
const ACCENT_SOFT = "#DCE6F1";
const GREEN = "#1F8A5B";
const GREEN_SOFT = "#7FDBBA";
const GREEN_PANEL = "#E3F2EA";
const RED = "#C4584A";
const SAND = "#F3F2EC";
const INK = "#14202E";
const MUTED = "#5A6675";
const LINE = "#E4E0D6";
const WHITE = "#FFFFFF";
const HEAD = "'Bricolage Grotesque', system-ui, sans-serif";
const BODY = "'Inter', system-ui, sans-serif";
const SHADOW_SM = "0 10px 30px -16px rgba(28,40,30,.22)";
// Verovapaat enimmäismäärät 2026:
// - Työmatkaetu: 3 400 €/v (yhteinen kattoraja pyöräedun kanssa)
// - Lounasetu (lounaskortti): työntekijän omavastuu 75 % aterian hinnasta, väh. 8,80 €;
//   työnantajan VEROVAPAA osuus = loppuosa, enintään 25 % (aterian enimmäishinta 14,00 €)
// - Liikunta- ja kulttuurietu: 400 €/v työntekijää kohden (TVL 69 §)
const COMMUTING_MAX = 3400;
const LUNCH_EMPLOYEE_MIN_SHARE = 8.80;
const LUNCH_PRICE_MIN = 8.80;
const LUNCH_PRICE_MAX = 14.00;
const LUNCH_PRICE_DEFAULT = 12.00;
const LUNCH_MIN = 1;
const LUNCH_MAX = 23;
const LUNCH_DEFAULT = 16;
const LUNCH_ACTIVE_MONTHS = 11;
const LIIKUNTA_MAX = 400;
const LIIKUNTA_DEFAULT = 400;
const SALARY_EXAMPLES = [
{ label: "2 500 €/kk", gross: 2500 },
{ label: "3 000 €/kk", gross: 3000 },
{ label: "3 500 €/kk", gross: 3500 },
{ label: "4 000 €/kk", gross: 4000 },
{ label: "4 500 €/kk", gross: 4500 },
{ label: "5 000 €/kk", gross: 5000 },
];
const SALARY_MAX = 20000;
function getMarginalTax(salary) {
const points = [
[2500, 0.30], [3000, 0.35], [3500, 0.40],
[4000, 0.43], [4500, 0.45], [5000, 0.47],
[7000, 0.50], [10000, 0.53], [15000, 0.55],
];
if (salary <= points[0][0]) return points[0][1];
if (salary >= points[points.length - 1][0]) return points[points.length - 1][1];
for (let i = 0; i < points.length - 1; i++) {
const [x1, y1] = points[i];
const [x2, y2] = points[i + 1];
if (salary >= x1 && salary <= x2) {
const t = (salary - x1) / (x2 - x1);
return y1 + t * (y2 - y1);
}
}
return points[points.length - 1][1];
}
const HSL_ZONES = [
{ label: "AB", monthly: 73.9, saver: 61.6 },
{ label: "BC", monthly: 73.9, saver: 61.6 },
{ label: "ABC", monthly: 98.7, saver: 82.4 },
{ label: "ABCD", monthly: 121.8, saver: 101.5 },
];
const SIVUKULUT_RATE = 0.205;
const EMPLOYEES_MIN = 1;
const EMPLOYEES_MAX = 1000;
function fmt(n) {
return n.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt0(n) {
return n.toLocaleString("fi-FI", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
const sliderCSS = `
.vl-range{ -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:999px;
  background:${LINE}; outline:none; }
.vl-range::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:22px; height:22px;
  border-radius:50%; background:${ACCENT}; cursor:pointer; border:3px solid #fff;
  box-shadow:0 2px 6px rgba(13,38,63,.25); }
.vl-range::-moz-range-thumb{ width:22px; height:22px; border-radius:50%; background:${ACCENT};
  cursor:pointer; border:3px solid #fff; box-shadow:0 2px 6px rgba(13,38,63,.25); }
@media(max-width:760px){ div[style*="minmax(0"]{grid-template-columns:1fr !important} div[style*="minmax(0"]>div{text-align:center !important} }
`;
function Eyebrow({ children, light = false, color }) {
return (
<div style={{
fontFamily: BODY, fontWeight: 700, fontSize: 12,
letterSpacing: ".15em", textTransform: "uppercase",
color: color || (light ? "rgba(255,255,255,0.55)" : ACCENT),
}}>
{children}
</div>
);
}
function FieldLabel({ children, right }) {
return (
<div style={{
display: "flex", justifyContent: "space-between", alignItems: "baseline",
marginBottom: 10, gap: 12, flexWrap: "wrap",
}}>
<div style={{
fontFamily: BODY, fontSize: 12, fontWeight: 700,
letterSpacing: ".12em", textTransform: "uppercase", color: MUTED,
}}>
{children}
</div>
{right}
</div>
);
}
function BenefitToggle({ active, onClick, title, meta, children }) {
return (
<div style={{
background: WHITE, borderRadius: 12,
border: `2px solid ${active ? ACCENT : LINE}`,
padding: active ? 18 : "16px 18px",
transition: "all 0.2s", opacity: active ? 1 : 0.78,
boxShadow: active ? SHADOW_SM : "none",
}}>
<button onClick={onClick} style={{
display: "flex", justifyContent: "space-between", alignItems: "center",
width: "100%", padding: 0, background: "transparent", border: "none",
cursor: "pointer", fontFamily: "inherit", textAlign: "left",
}}>
<div>
<div style={{ fontFamily: HEAD, fontSize: 17, fontWeight: 700, color: NAVY, letterSpacing: "-.01em" }}>
{title}
</div>
<div style={{ fontFamily: BODY, fontSize: 11, color: MUTED, marginTop: 3,
textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 600 }}>
{meta}
</div>
</div>
<div style={{
width: 26, height: 26, borderRadius: 7,
background: active ? ACCENT : "rgba(13,38,63,0.08)",
display: "flex", alignItems: "center", justifyContent: "center",
color: "#fff", fontSize: 15, fontWeight: 700, transition: "all 0.2s",
}}>
{active ? "✓" : ""}
</div>
</button>
{active && <div style={{ marginTop: 16 }}>{children}</div>}
</div>
);
}
function MiniSlider({ label, value, min, max, step, onChange, unit, hint, valueLabel }) {
return (
<div>
<div style={{
display: "flex", justifyContent: "space-between", alignItems: "center",
fontFamily: BODY, fontSize: 12.5, color: MUTED, marginBottom: 7, fontWeight: 500,
}}>
<span>{label}</span>
<span style={{ fontFamily: HEAD, fontWeight: 700, color: NAVY }}>
{valueLabel != null ? valueLabel : `${fmt0(value)} ${unit}`}
</span>
</div>
<input className="vl-range" type="range"
min={min} max={max} step={step || 1}
value={value} onChange={(e) => onChange(Number(e.target.value))} />
{hint && (
<div style={{ fontFamily: BODY, fontSize: 11, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>
{hint}
</div>
)}
</div>
);
}
const wmCSS = `
@keyframes vlFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes vlFloat2 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(10px) scale(1.06); } }
`;
/* Sivuston heron vesileima sellaisenaan: taustaa tummempi ympyralevy (#091b2e),
   jonka paalla VL-kirjaimet taustan varilla (#0d263f). Sama SVG-polku kuin herossa. */
const VLMark = ({ size = 180, disc = "#091b2e", letters = "#0d263f", style = {}, anim }) => (
<svg viewBox="0 0 430.05344 430.05344" aria-hidden="true" style={{ position: "absolute", width: size, height: size, pointerEvents: "none", animation: anim, ...style }}>
<g transform="translate(4.9265717,87.016003)">
<circle cx="215.80415" cy="122.5465" r="147.40907" fill={disc} />
<path d="M 83.725772 61.425403 L 184.39374 200.02697 L 233.59296 199.96837 L 233.59296 83.49181 L 237.56171 83.49181 L 237.56171 199.94884 L 339.63983 199.84728 L 339.63983 177.23204 L 262.76288 177.23204 L 260.68476 175.71056 L 260.32929 61.46056 L 237.87226 61.46056 L 237.87226 61.425403 L 210.85663 61.425403 L 210.85663 168.67345 L 133.04023 61.425403 L 83.725772 61.425403 z" fill={letters} />
</g>
</svg>
);
const GOLD = "#D4A33C";
const EMBEDDED = typeof window !== "undefined" && window.self !== window.top;
function CtaCard({ title, text, onContact, primary = "Ota yhteyttä →" }) {
return (
<div style={{
background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_2} 100%)`, borderRadius: 16, padding: "24px 22px",
color: "#fff", margin: "4px 0 16px", textAlign: "center", position: "relative", overflow: "hidden",
boxShadow: "0 20px 44px -22px rgba(13,38,63,.55)",
}}>
<VLMark size={240} style={{ bottom: -80, left: -60, opacity: 0.9 }} anim="vlFloat2 10s ease-in-out infinite" />
<div style={{ position: "relative", zIndex: 1 }}>
<div style={{ fontFamily: HEAD, fontSize: 20, fontWeight: 800, letterSpacing: "-.015em", lineHeight: 1.25 }}>{title}</div>
<p style={{ fontFamily: BODY, fontSize: 13.5, color: "rgba(255,255,255,0.78)", margin: "10px auto 0", maxWidth: 480, lineHeight: 1.6 }}>{text}</p>
<div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
<button onClick={onContact} style={{
padding: "13px 28px", fontFamily: BODY, fontSize: 14, fontWeight: 700, borderRadius: 12,
border: "none", background: `linear-gradient(135deg, ${GOLD} 0%, #C08F2B 100%)`, color: NAVY, cursor: "pointer",
boxShadow: "0 8px 20px -10px rgba(212,163,60,.6)",
}}>{primary}</button>
<a href="https://verologia.fi/tyosuhde-edut/" target={EMBEDDED ? "_top" : "_blank"} rel="noopener" style={{
display: "inline-flex", alignItems: "center", padding: "13px 22px", fontFamily: BODY, fontSize: 13.5, fontWeight: 600,
borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.35)", color: "#fff", textDecoration: "none",
}}>Työsuhde-etukoulutus</a>
</div>
</div>
</div>
);
}
function ContactModal({ open, onClose, source, defaultMessage }) {
const [nimi, setNimi] = useState("");
const [email, setEmail] = useState("");
const [org, setOrg] = useState("");
const [viesti, setViesti] = useState("");
const [consent, setConsent] = useState(false);
const [status, setStatus] = useState("idle");
const cardRef = useRef(null);
useEffect(() => {
if (!open) return;
setStatus("idle");
setViesti(defaultMessage || "");
const t = setTimeout(() => { try { if (cardRef.current) cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { /* noop */ } }, 80);
const onKey = (e) => { if (e.key === "Escape") onClose(); };
window.addEventListener("keydown", onKey);
return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
}, [open]);
if (!open) return null;
const narrowModal = typeof window !== "undefined" && window.innerWidth < 700;
const emailOk = /.+@.+\..+/.test(email);
const canSend = nimi.trim() && emailOk && org.trim() && consent && status !== "sending";
const submit = async (e) => {
e.preventDefault();
if (!canSend) return;
setStatus("sending");
try {
const r = await fetch("https://verologia.fi/wp-json/verologia/v1/laskuri-yhteydenotto", { method: "POST", body: JSON.stringify({ nimi, email, organisaatio: org, viesti, lahde: source }) });
setStatus(r.ok ? "done" : "error");
} catch (err) { setStatus("error"); }
};
const field = { width: "100%", boxSizing: "border-box", padding: "11px 13px", fontFamily: BODY, fontSize: 14, color: NAVY, background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 10, outline: "none", marginBottom: 14 };
const labelS = { display: "block", fontFamily: BODY, fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 6 };
return (
<div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(6,15,26,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto" }}>
<div ref={cardRef} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, width: "100%", margin: "24px 0", borderRadius: 16, overflow: "hidden", display: "grid", gridTemplateColumns: narrowModal ? "1fr" : "1fr 1.2fr", background: "#fff", boxShadow: "0 30px 80px -20px rgba(6,15,26,.6)", position: "relative" }}>
<button onClick={onClose} aria-label="Sulje" style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", border: "none", background: "#fff", boxShadow: "0 4px 14px rgba(6,15,26,.18)", fontFamily: BODY, fontSize: 16, fontWeight: 700, color: NAVY, cursor: "pointer", zIndex: 2 }}>✕</button>
{!narrowModal && (
<div style={{ background: NAVY, color: "#fff", padding: "28px 24px", position: "relative", overflow: "hidden" }}>
<VLMark size={260} style={{ bottom: -80, left: -70, opacity: 0.9 }} />
<div style={{ position: "relative", zIndex: 1 }}>
<div style={{ fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#7FDBBA", marginBottom: 10 }}>Maksuton kartoitus</div>
<div style={{ fontFamily: HEAD, fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-.02em" }}>Viedään laskurin tulos käytäntöön</div>
<p style={{ fontFamily: BODY, fontSize: 13.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: "12px 0 18px" }}>Kartoitamme veloituksetta, miten työsuhde-edut kannattaa toteuttaa teillä. Laskurisi tulos liitetään viestiin valmiiksi.</p>
{["Räätälöity ehdotus organisaatiollenne", "Ilman sitoumuksia", "Vastaamme yleensä saman arkipäivän aikana"].map((b) => (
<div key={b} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontFamily: BODY, fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 8, lineHeight: 1.5 }}>
<span style={{ color: "#7FDBBA", fontWeight: 800 }}>✓</span>{b}
</div>
))}
</div>
</div>
)}
<div style={{ padding: "28px 24px" }}>
{status === "done" ? (
<div style={{ textAlign: "center", padding: "40px 10px" }}>
<div style={{ fontFamily: HEAD, fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 10 }}>Kiitos yhteydenotosta!</div>
<p style={{ fontFamily: BODY, fontSize: 14, color: MUTED, lineHeight: 1.6 }}>Viestisi on perillä. Vastaamme yleensä saman arkipäivän aikana.</p>
<button onClick={onClose} style={{ marginTop: 18, padding: "12px 26px", fontFamily: BODY, fontSize: 14, fontWeight: 700, borderRadius: 12, border: "none", background: NAVY, color: "#fff", cursor: "pointer" }}>Sulje</button>
</div>
) : (
<form onSubmit={submit}>
<div style={{ fontFamily: HEAD, fontSize: 21, fontWeight: 800, color: NAVY, letterSpacing: "-.015em", marginBottom: 4, paddingRight: 36 }}>Pyydä maksuton kartoitus</div>
<p style={{ fontFamily: BODY, fontSize: 13, color: MUTED, margin: "0 0 16px" }}>Jätä yhteystietosi, niin otamme sinuun yhteyttä.</p>
<label style={labelS}>Nimi *</label>
<input style={field} value={nimi} onChange={(e) => setNimi(e.target.value)} />
<label style={labelS}>Sähköposti *</label>
<input style={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<label style={labelS}>Organisaatio *</label>
<input style={field} value={org} onChange={(e) => setOrg(e.target.value)} />
<label style={labelS}>Viesti (vapaaehtoinen)</label>
<textarea style={{ ...field, minHeight: 84, resize: "vertical" }} value={viesti} onChange={(e) => setViesti(e.target.value)} />
<label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontFamily: BODY, fontSize: 12.5, color: MUTED, lineHeight: 1.5, marginBottom: 14, cursor: "pointer" }}>
<input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, accentColor: ACCENT }} />
<span>Hyväksyn, että tietojani käsitellään yhteydenottoa varten <a href="https://verologia.fi/tietosuojaseloste/" target="_blank" rel="noopener" style={{ color: NAVY, fontWeight: 600 }}>tietosuojaselosteen</a> mukaisesti.</span>
</label>
{status === "error" && (
<div style={{ fontFamily: BODY, fontSize: 12.5, color: RED, fontWeight: 600, marginBottom: 10 }}>Lähetys ei onnistunut. Yritä hetken kuluttua uudelleen.</div>
)}
<button type="submit" disabled={!canSend} style={{ width: "100%", padding: "14px 0", fontFamily: BODY, fontSize: 15, fontWeight: 700, borderRadius: 12, border: "none", background: canSend ? NAVY : "#9AA6B4", color: "#fff", cursor: canSend ? "pointer" : "default" }}>
{status === "sending" ? "Lähetetään…" : "Pyydä kartoitus"}
</button>
<p style={{ fontFamily: BODY, fontSize: 11.5, color: MUTED, lineHeight: 1.55, margin: "12px 0 0", textAlign: "center" }}>Lähettämällä hyväksyt, että otamme sinuun yhteyttä kartoitusta varten. Emme luovuta tietojasi kolmansille osapuolille.</p>
</form>
)}
</div>
</div>
</div>
);
}

export default function EtupakettiLaskelma() {
const [commutingActive, setCommutingActive] = useState(true);
const [commutingZoneIdx, setCommutingZoneIdx] = useState(2);
const [commutingUseSaver, setCommutingUseSaver] = useState(false);
const [lunchActive, setLunchActive] = useState(true);
const [lunchesPerMonth, setLunchesPerMonth] = useState(LUNCH_DEFAULT);
const [lunchMealPrice, setLunchMealPrice] = useState(LUNCH_PRICE_DEFAULT);
const [liikuntaActive, setLiikuntaActive] = useState(true);
const [liikuntaAnnual, setLiikuntaAnnual] = useState(LIIKUNTA_DEFAULT);
const [salaryGross, setSalaryGross] = useState(3500);
const [employees, setEmployees] = useState(30);
const [contactOpen, setContactOpen] = useState(false);
const marginalTax = getMarginalTax(salaryGross);
const lunchOmavastuu = Math.max(0.75 * lunchMealPrice, LUNCH_EMPLOYEE_MIN_SHARE);
const lunchEmployerPerMeal = Math.max(0, lunchMealPrice - lunchOmavastuu);
const handleEmployeeInput = (raw) => {
const num = Number(raw);
if (Number.isNaN(num)) return;
setEmployees(Math.max(EMPLOYEES_MIN, Math.min(EMPLOYEES_MAX, Math.round(num))));
};
const handleSalaryInput = (raw) => {
if (raw === "") { setSalaryGross(0); return; }
const num = Number(raw);
if (Number.isNaN(num)) return;
setSalaryGross(Math.min(SALARY_MAX, Math.max(0, Math.round(num))));
};
const commutingTicket = commutingUseSaver ? HSL_ZONES[commutingZoneIdx].saver : HSL_ZONES[commutingZoneIdx].monthly;
const commutingAnnual = commutingTicket * 12;
const calc = useMemo(() => {
const commutingYearly = commutingActive ? commutingAnnual : 0;
const lunchYearly = lunchActive ? (lunchEmployerPerMeal * lunchesPerMonth * LUNCH_ACTIVE_MONTHS) : 0;
const liikuntaYearly = liikuntaActive ? liikuntaAnnual : 0;
const totalBenefitYearly = commutingYearly + lunchYearly + liikuntaYearly;
const employerCostBenefit = totalBenefitYearly;
const employeeNetBenefit = totalBenefitYearly;
const employerCostSalary = totalBenefitYearly * (1 + SIVUKULUT_RATE);
const employeeNetSalary = totalBenefitYearly * (1 - marginalTax);
const employerSavingsYear = employerCostSalary - employerCostBenefit;
const employeeGainYear = employeeNetBenefit - employeeNetSalary;
const totalEmployerSavingsYear = employerSavingsYear * employees;
const totalCostBenefitYear = employerCostBenefit * employees;
const totalCostSalaryYear = employerCostSalary * employees;
const selectedCount = (commutingActive ? 1 : 0) + (lunchActive ? 1 : 0) + (liikuntaActive ? 1 : 0);
return {
commutingYearly, lunchYearly, liikuntaYearly, totalBenefitYearly,
employerCostBenefit, employeeNetBenefit, employerCostSalary, employeeNetSalary,
employerSavingsYear, employeeGainYear,
totalEmployerSavingsYear, totalCostBenefitYear, totalCostSalaryYear, selectedCount,
};
}, [commutingActive, commutingAnnual, lunchActive, lunchesPerMonth, lunchEmployerPerMeal, liikuntaActive, liikuntaAnnual, marginalTax, employees]);
const card = { background: WHITE, borderRadius: 12, padding: 18, border: `1px solid ${LINE}`, boxShadow: SHADOW_SM };
const rootRef = useRef(null);
const [narrow, setNarrow] = useState(false);
useEffect(() => {
const el = rootRef.current;
if (!el || typeof ResizeObserver === "undefined") return;
const ro = new ResizeObserver((entries) => { setNarrow(entries[0].contentRect.width < 560); });
ro.observe(el);
return () => ro.disconnect();
}, []);
/* Upotus (iframe): ilmoitetaan sisallon korkeus emosivulle ({vlH: px}). */
useEffect(() => {
if (!EMBEDDED) return;
const post = () => {
const el = rootRef.current;
if (!el) return;
try { window.parent.postMessage({ vlH: el.scrollHeight }, "*"); } catch (e) { /* noop */ }
};
post();
const t = setTimeout(post, 400);
const ro2 = typeof ResizeObserver !== "undefined" ? new ResizeObserver(post) : null;
if (ro2 && rootRef.current) ro2.observe(rootRef.current);
return () => { clearTimeout(t); if (ro2) ro2.disconnect(); };
}, []);
const cols2 = narrow ? "1fr" : "minmax(0,1fr) minmax(0,1fr)";
const ctr = narrow ? "center" : "left";
return (
<div ref={rootRef} style={{ minHeight: EMBEDDED ? "auto" : "100vh", background: WHITE, fontFamily: BODY, color: INK }}>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>{sliderCSS + wmCSS}</style>
{/* Header */}
<div style={{
background: NAVY,
color: "#fff", padding: "34px 20px 28px", position: "relative", overflow: "hidden", textAlign: "center",
}}>
<div style={{ position: "absolute", top: -100, right: -140, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(60,114,171,.20), rgba(0,0,0,0) 68%)", pointerEvents: "none" }} />
<VLMark size="clamp(340px, 44vw, 560px)" style={{ top: -90, left: -120, opacity: 0.9 }} anim="vlFloat 9s ease-in-out infinite" />
<VLMark size="clamp(204px, 26vw, 336px)" style={{ top: -30, right: -80, opacity: 0.9 }} anim="vlFloat2 11s ease-in-out infinite" />
<div style={{ position: "relative", zIndex: 1 }}>
<Eyebrow light>Verologia · Etupaketti</Eyebrow>
<h1 style={{ fontFamily: HEAD, fontSize: 28, fontWeight: 800, margin: "10px 0 0", lineHeight: 1.05, letterSpacing: "-.028em", color: "#fff" }}>
Etupaketti vai palkankorotus?
</h1>
<p style={{ fontFamily: BODY, fontSize: 14.5, color: "rgba(255,255,255,0.72)", margin: "10px auto 0", lineHeight: 1.55, maxWidth: 540 }}>
Vertaile kolmen verovapaan edun yhdistelmää palkankorotukseen. Valitse mitkä otat mukaan.
</p>
</div>
</div>
<div style={{ padding: "20px 16px 100px", maxWidth: 720, margin: "0 auto" }}>
{/* Benefit selectors */}
<div style={{ marginBottom: 18 }}>
<div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>
Edut paketissa ({calc.selectedCount}/3)
</div>
<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
<BenefitToggle active={commutingActive} onClick={() => setCommutingActive(!commutingActive)}
title="Työmatkaetu" meta={`Verovapaa enintään ${fmt0(COMMUTING_MAX)} €/v`}>
<div>
<div style={{ fontFamily: BODY, fontSize: 12.5, color: MUTED, marginBottom: 8, fontWeight: 500 }}>HSL-vyöhyke</div>
<div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
{HSL_ZONES.map((z, i) => (
<button key={z.label} onClick={(e) => { e.stopPropagation(); setCommutingZoneIdx(i); }} style={{
flex: 1, padding: "9px 0", fontFamily: BODY, fontSize: 13, fontWeight: 600,
border: `1.5px solid ${i === commutingZoneIdx ? ACCENT : LINE}`, borderRadius: 8,
background: i === commutingZoneIdx ? ACCENT : WHITE, color: i === commutingZoneIdx ? "#fff" : NAVY,
cursor: "pointer", transition: "all 0.15s",
}}>{z.label}</button>
))}
</div>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: BODY, fontSize: 12.5, color: MUTED }}>
<label onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
<input type="checkbox" checked={commutingUseSaver} onChange={(e) => setCommutingUseSaver(e.target.checked)} style={{ accentColor: ACCENT }} />
Säästölippu ({fmt(HSL_ZONES[commutingZoneIdx].saver)} €/kk)
</label>
<span style={{ fontFamily: HEAD, fontWeight: 700, color: NAVY }}>{fmt(commutingTicket)} €/kk · {fmt(commutingAnnual)} €/v</span>
</div>
</div>
</BenefitToggle>
<BenefitToggle active={lunchActive} onClick={() => setLunchActive(!lunchActive)}
title="Lounasetu" meta={`Työnantajan osuus ${fmt(lunchEmployerPerMeal)} €/lounas · ${LUNCH_ACTIVE_MONTHS} kk/v`}>
<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
<MiniSlider label="Aterian hinta" value={lunchMealPrice} min={LUNCH_PRICE_MIN} max={LUNCH_PRICE_MAX} step={0.10}
onChange={setLunchMealPrice} valueLabel={`${fmt(lunchMealPrice)} €`}
hint={`Omavastuu 75 % (väh. 8,80 €) = ${fmt(lunchOmavastuu)} €. Työnantajan verovapaa osuus ${fmt(lunchEmployerPerMeal)} €/lounas.`} />
<MiniSlider label="Lounaita kuukaudessa" value={lunchesPerMonth} min={LUNCH_MIN} max={LUNCH_MAX}
onChange={setLunchesPerMonth} unit="lounasta/kk"
hint={`Vuositason etu: ${fmt(lunchEmployerPerMeal * lunchesPerMonth * LUNCH_ACTIVE_MONTHS)} €. Ravintoetua voi käyttää kerran työssäolopäivää kohden.`} />
</div>
</BenefitToggle>
<BenefitToggle active={liikuntaActive} onClick={() => setLiikuntaActive(!liikuntaActive)}
title="Liikunta- ja kulttuurietu" meta={`Verovapaa enintään ${LIIKUNTA_MAX} €/v`}>
<MiniSlider label="Etu vuodessa" value={liikuntaAnnual} min={0} max={LIIKUNTA_MAX} step={10}
onChange={setLiikuntaAnnual} unit="€/v" hint="Kuntosalit, urheilutapahtumat, teatteri, museot, konsertit." />
</BenefitToggle>
</div>
</div>
{/* Salary */}
<div style={{ ...card, marginBottom: 12 }}>
<FieldLabel right={
<span style={{ display: "flex", alignItems: "center", gap: 6 }}>
<span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>Tai oma palkka:</span>
<input type="number" max={SALARY_MAX} step={100} value={salaryGross === 0 ? "" : salaryGross}
onChange={(e) => handleSalaryInput(e.target.value)} style={{
width: 100, padding: "6px 10px", fontFamily: HEAD, fontSize: 14, fontWeight: 700,
color: NAVY, background: WHITE, border: `1.5px solid ${LINE}`, borderRadius: 8, textAlign: "right", outline: "none",
}} />
<span style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>€/kk</span>
</span>
}>
Palkkataso (marginaalivero {Math.round(marginalTax * 100)} %)
</FieldLabel>
<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
{SALARY_EXAMPLES.map((s) => (
<button key={s.gross} onClick={() => setSalaryGross(s.gross)} style={{
padding: "9px 13px", fontFamily: BODY, fontSize: 13, fontWeight: 600,
border: `1.5px solid ${s.gross === salaryGross ? ACCENT : LINE}`, borderRadius: 999,
background: s.gross === salaryGross ? ACCENT : WHITE, color: s.gross === salaryGross ? "#fff" : NAVY,
cursor: "pointer", transition: "all 0.18s",
}}>{s.label}</button>
))}
</div>
</div>
{/* Employees */}
<div style={{ ...card, marginBottom: 16 }}>
<FieldLabel right={
<input type="number" min={EMPLOYEES_MIN} max={EMPLOYEES_MAX} value={employees}
onChange={(e) => handleEmployeeInput(e.target.value)} style={{
width: 92, padding: "7px 10px", fontFamily: HEAD, fontSize: 15, fontWeight: 700,
color: NAVY, background: WHITE, border: `1.5px solid ${LINE}`, borderRadius: 8, textAlign: "right", outline: "none",
}} />
}>
Henkilöstön määrä
</FieldLabel>
<input className="vl-range" type="range" min={EMPLOYEES_MIN} max={EMPLOYEES_MAX} value={employees}
onChange={(e) => setEmployees(Number(e.target.value))} />
<div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(13,38,63,0.4)", marginTop: 6 }}>
<span>1</span><span>250</span><span>500</span><span>750</span><span>1000</span>
</div>
</div>
{calc.selectedCount === 0 ? (
<div style={{ ...card, textAlign: "center", color: MUTED, fontSize: 13, lineHeight: 1.5, borderStyle: "dashed" }}>
Valitse yksi tai useampi etu yltä nähdäksesi vertailun palkankorotukseen.
</div>
) : (
<>
{/* Breakdown */}
<div style={{ ...card, marginBottom: 16 }}>
<Eyebrow color={MUTED}>Etujen erittely / työntekijä / vuosi</Eyebrow>
<div style={{ marginTop: 14 }}>
{commutingActive && <BreakdownRow label="Työmatkaetu" value={calc.commutingYearly} />}
{lunchActive && <BreakdownRow label="Lounasetu (työnantajan osuus)" value={calc.lunchYearly} />}
{liikuntaActive && <BreakdownRow label="Liikunta- ja kulttuurietu" value={calc.liikuntaYearly} />}
<div style={{
marginTop: 10, paddingTop: 12, borderTop: `2px solid ${LINE}`,
display: "flex", justifyContent: "space-between", fontFamily: BODY, fontSize: 14, fontWeight: 600, color: NAVY,
}}>
<span>Yhteensä</span>
<span style={{ fontFamily: HEAD, fontWeight: 800, color: GREEN, letterSpacing: "-.02em" }}>{fmt(calc.totalBenefitYearly)} €</span>
</div>
</div>
</div>
{/* Comparison cards */}
<div style={{ display: "grid", gridTemplateColumns: cols2, textAlign: ctr, gap: 12, marginBottom: 16 }}>
<div style={{ ...card, background: SAND, boxShadow: "none" }}>
<Eyebrow color={MUTED}>Palkankorotus</Eyebrow>
<div style={{ fontSize: 12, color: MUTED, margin: "14px 0 4px" }}>Työnantaja maksaa /v</div>
<div style={{ fontFamily: HEAD, fontSize: 23, fontWeight: 800, color: INK, letterSpacing: "-.02em" }}>{fmt(calc.employerCostSalary)} €</div>
<div style={{ fontSize: 12, color: MUTED, margin: "14px 0 4px" }}>Työntekijä saa käteen /v</div>
<div style={{ fontFamily: HEAD, fontSize: 23, fontWeight: 800, color: NAVY, letterSpacing: "-.02em" }}>{fmt(calc.employeeNetSalary)} €</div>
</div>
<div style={{ ...card, border: `2px solid ${ACCENT}`, boxShadow: "0 10px 30px -14px rgba(60,114,171,0.4)" }}>
<Eyebrow>Etupaketti ✓</Eyebrow>
<div style={{ fontSize: 12, color: MUTED, margin: "14px 0 4px" }}>Työnantaja maksaa /v</div>
<div style={{ fontFamily: HEAD, fontSize: 23, fontWeight: 800, color: ACCENT, letterSpacing: "-.02em" }}>{fmt(calc.employerCostBenefit)} €</div>
<div style={{ fontSize: 12, color: MUTED, margin: "14px 0 4px" }}>Työntekijä saa käteen /v</div>
<div style={{ fontFamily: HEAD, fontSize: 23, fontWeight: 800, color: NAVY, letterSpacing: "-.02em" }}>{fmt(calc.employeeNetBenefit)} €</div>
</div>
</div>
{/* Summary */}
<div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_2} 100%)`, borderRadius: 12, padding: 22, color: "#fff", marginBottom: 16, position: "relative", overflow: "hidden" }}>
<VLMark size={260} style={{ top: -70, right: -60, opacity: 0.9 }} anim="vlFloat 8s ease-in-out infinite" />
<div style={{ position: "relative", zIndex: 1 }}>
<Eyebrow light>Yhteenveto / työntekijä / vuosi</Eyebrow>
<div style={{ display: "grid", gridTemplateColumns: cols2, textAlign: ctr, gap: 16, margin: "16px 0" }}>
<div>
<div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>Työnantaja säästää</div>
<div style={{ fontFamily: HEAD, fontSize: 23, fontWeight: 800, color: GREEN_SOFT, letterSpacing: "-.02em" }}>{fmt(calc.employerSavingsYear)} €</div>
</div>
<div>
<div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>Työntekijä hyötyy</div>
<div style={{ fontFamily: HEAD, fontSize: 23, fontWeight: 800, color: GREEN_SOFT, letterSpacing: "-.02em" }}>+{fmt(calc.employeeGainYear)} €</div>
</div>
</div>
<div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14, fontSize: 13.5, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
{calc.selectedCount === 3 ? "Kolmen edun yhdistelmä " : calc.selectedCount === 2 ? "Valitsemiesi kahden edun yhdistelmä " : "Valitsemasi etu "}
tuottaa työntekijälle <strong style={{ color: GREEN_SOFT }}>{fmt(calc.employeeGainYear)} € enemmän</strong> vuodessa kuin sama summa palkankorotuksena.
Samalla työnantaja <strong style={{ color: GREEN_SOFT }}>säästää {fmt(calc.employerSavingsYear)} €</strong> sivukuluissa.
</div>
</div>
</div>
{/* Scale */}
<div style={{ ...card, marginBottom: 16 }}>
<Eyebrow color={MUTED}>Skaalattu: {employees} työntekijää / vuosi</Eyebrow>
<div style={{ display: "grid", gridTemplateColumns: cols2, textAlign: ctr, gap: 12, marginTop: 14 }}>
<div style={{ background: SAND, borderRadius: 10, padding: 14 }}>
<div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Palkankorotus yhteensä</div>
<div style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 800, color: RED, letterSpacing: "-.02em" }}>{fmt(calc.totalCostSalaryYear)} €</div>
</div>
<div style={{ background: GREEN_PANEL, borderRadius: 10, padding: 14 }}>
<div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Etupaketti yhteensä</div>
<div style={{ fontFamily: HEAD, fontSize: 18, fontWeight: 800, color: GREEN, letterSpacing: "-.02em" }}>{fmt(calc.totalCostBenefitYear)} €</div>
</div>
</div>
<div style={{ marginTop: 14, textAlign: "center", padding: 14, borderRadius: 10, background: NAVY }}>
<div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Työnantajan kokonaissäästö vuodessa</div>
<div style={{ fontFamily: HEAD, fontSize: 28, fontWeight: 800, color: GREEN_SOFT, letterSpacing: "-.02em" }}>{fmt(calc.totalEmployerSavingsYear)} €</div>
</div>
</div>
<CtaCard
onContact={() => setContactOpen(true)}
title="Haluatko tämän etupaketin käyttöön?"
text={<>Etupaketti säästäisi yrityksellesi arviolta <strong style={{ color: GREEN_SOFT }}>{fmt(calc.totalEmployerSavingsYear)} € vuodessa</strong> sivukuluissa palkankorotukseen verrattuna, ja jokainen työntekijä hyötyy <strong style={{ color: GREEN_SOFT }}>{fmt(calc.employeeGainYear)} € vuodessa</strong>. Ota yhteyttä, niin autamme suunnittelemaan käyttöönoton ja viestinnän henkilöstölle.</>}
/>
</>
)}
<ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="etupakettilaskuri" defaultMessage={`Laskurin tulos (etupakettilaskuri): ${[commutingActive && "työmatkaetu", lunchActive && "lounasetu", liikuntaActive && "liikunta- ja kulttuurietu"].filter(Boolean).join(", ") || "ei etuja valittuna"}, etu yhteensä ${fmt(calc.totalBenefitYearly)} €/v per työntekijä. Etupaketti säästäisi yrityksellemme arviolta ${fmt(calc.totalEmployerSavingsYear)} € vuodessa palkankorotukseen verrattuna (${employees} työntekijää).`} />
{/* Footer note */}
<div style={{ fontSize: 11, color: MUTED, lineHeight: 1.65, padding: "0 4px" }}>
Laskelma perustuu vuoden 2026 verotuskäytäntöön: työmatkaetu verovapaa enintään 3 400 €/v (yhteinen kattoraja pyöräedun kanssa); lounasetu (lounaskortti), jossa työntekijän omavastuu on 75 % aterian hinnasta (väh. 8,80 €/ateria) ja työnantajan verovapaa osuus loppuosa, enintään 25 % (aterian enimmäishinta 14,00 €); liikunta- ja kulttuurietu verovapaa enintään 400 €/v (TVL 69 §). Lounasetu lasketaan 11 aktiivisen kuukauden mukaan ja vain käytetyistä lounaista. Lounasedun erittelyssä näytetään työnantajan verovapaa osuus, joka on työntekijän todellinen veroton hyöty (omavastuun maksaa työntekijä itse). Työnantajan sivukulut 20,5 % (TyEL, sairausvakuutus, työttömyysvakuutus, tapaturmavakuutus, ryhmähenkivakuutus). Marginaaliveroasteet ovat viitteellisiä, todelliset verovaikutukset riippuvat yksilön tilanteesta.
<br /><br />
<span style={{ fontFamily: HEAD, fontWeight: 700, color: NAVY }}>Verologia.fi</span> — Työsuhde-etujen koulutus yrityksille
</div>
</div>
</div>
);
}
function BreakdownRow({ label, value }) {
return (
<div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontFamily: BODY, fontSize: 13, color: INK }}>
<span style={{ color: MUTED }}>{label}</span>
<span style={{ fontFamily: HEAD, fontWeight: 700, color: NAVY }}>{fmt(value)} €</span>
</div>
);
}
