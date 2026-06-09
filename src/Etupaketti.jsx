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
const cols2 = narrow ? "1fr" : "minmax(0,1fr) minmax(0,1fr)";
const ctr = narrow ? "center" : "left";

return (
<div ref={rootRef} style={{ minHeight: "100vh", background: WHITE, fontFamily: BODY, color: INK }}>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>{sliderCSS}</style>

{/* Header */}
<div style={{
background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_2} 100%)`,
color: "#fff", padding: "34px 20px 28px", position: "relative", overflow: "hidden", textAlign: "center",
}}>
<div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(60,114,171,0.22)" }} />
<div style={{ position: "relative" }}>
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
<div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_2} 100%)`, borderRadius: 12, padding: 22, color: "#fff", marginBottom: 16 }}>
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
</>
)}

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
