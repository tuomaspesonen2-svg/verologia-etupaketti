import { useState, useMemo } from "react";

const BRAND = "#0D263F";
const ACCENT = "#2E7D6B";
const WARM = "#F5F1EC";
const RED_SOFT = "#C4584A";

// Verovapaat enimmäismäärät 2026:
// - Työmatkaetu: 3 400 €/v (yhteinen kattoraja pyöräedun kanssa)
// - Lounasetu: 8,80 €/lounas (kun työnantajan kustannus 8,80–14,00 €)
// - Liikunta- ja kulttuurietu: 400 €/v työntekijää kohden (TVL 69 §)
const COMMUTING_MAX = 3400;
const LUNCH_TAX_VALUE = 8.80;
const LUNCH_MIN = 1;
const LUNCH_MAX = 23;
const LUNCH_DEFAULT = 16;
const LUNCH_ACTIVE_MONTHS = 11; // ~5 viikon vuosiloma
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

const SALARY_MIN = 1500;
const SALARY_MAX = 20000;

// Interpoloitu marginaalivero palkan funktiona. Pisteet vastaavat
// SALARY_EXAMPLES-asteikkoa, ylin pää ekstrapoloi suomalaisen
// progressiivisen verotuksen rajat.
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

// HSL-vyöhykkeet 2026 (€/kk). Säästölippu on 30 vrk kausilipun edullisempi vaihtoehto.
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

function BenefitToggle({ active, onClick, title, meta, children }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: `2px solid ${active ? ACCENT : "rgba(13,38,63,0.1)"}`,
      padding: active ? 16 : "14px 16px",
      transition: "all 0.2s",
      opacity: active ? 1 : 0.75,
    }}>
      <button
        onClick={onClick}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          width: "100%", padding: 0, background: "transparent", border: "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        }}
      >
        <div>
          <div style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 16, fontWeight: 600, color: BRAND,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 11, color: "rgba(13,38,63,0.5)", marginTop: 2,
            textTransform: "uppercase", letterSpacing: 1, fontWeight: 600,
          }}>
            {meta}
          </div>
        </div>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: active ? ACCENT : "rgba(13,38,63,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 14, fontWeight: 700,
          transition: "all 0.2s",
        }}>
          {active ? "✓" : ""}
        </div>
      </button>
      {active && (
        <div style={{ marginTop: 14 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MiniSlider({ label, value, min, max, step, onChange, unit, hint }) {
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12, color: "rgba(13,38,63,0.65)", marginBottom: 6, fontWeight: 500,
      }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: BRAND }}>
          {fmt0(value)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step || 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: ACCENT }}
      />
      {hint && (
        <div style={{ fontSize: 10, color: "rgba(13,38,63,0.4)", marginTop: 2 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function EtupakettiLaskelma() {
  const [commutingActive, setCommutingActive] = useState(true);
  const [commutingZoneIdx, setCommutingZoneIdx] = useState(2); // ABC oletus
  const [commutingUseSaver, setCommutingUseSaver] = useState(false);

  const [lunchActive, setLunchActive] = useState(true);
  const [lunchesPerMonth, setLunchesPerMonth] = useState(LUNCH_DEFAULT);

  const [liikuntaActive, setLiikuntaActive] = useState(true);
  const [liikuntaAnnual, setLiikuntaAnnual] = useState(LIIKUNTA_DEFAULT);

  const [salaryGross, setSalaryGross] = useState(3500);
  const [employees, setEmployees] = useState(30);

  const marginalTax = getMarginalTax(salaryGross);

  const handleEmployeeInput = (raw) => {
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    const clamped = Math.max(EMPLOYEES_MIN, Math.min(EMPLOYEES_MAX, Math.round(num)));
    setEmployees(clamped);
  };

  const handleSalaryInput = (raw) => {
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    const clamped = Math.max(SALARY_MIN, Math.min(SALARY_MAX, Math.round(num)));
    setSalaryGross(clamped);
  };

  const commutingTicket = commutingUseSaver
    ? HSL_ZONES[commutingZoneIdx].saver
    : HSL_ZONES[commutingZoneIdx].monthly;
  const commutingAnnual = commutingTicket * 12;

  const calc = useMemo(() => {
    // Vuosiarvot per etu
    const commutingYearly = commutingActive ? commutingAnnual : 0;
    const lunchYearly = lunchActive ? (LUNCH_TAX_VALUE * lunchesPerMonth * LUNCH_ACTIVE_MONTHS) : 0;
    const liikuntaYearly = liikuntaActive ? liikuntaAnnual : 0;

    const totalBenefitYearly = commutingYearly + lunchYearly + liikuntaYearly;
    const totalBenefitMonthly = totalBenefitYearly / 12;

    // Kaikki kolme etua ovat täysin verovapaita (kun pysytään rajoissa).
    // Työnantaja: kustannus = etujen summa, ei sivukuluja.
    // Työntekijä: nettohyöty = etujen summa, koko summa kotiin.
    const employerCostBenefit = totalBenefitYearly;
    const employeeNetBenefit = totalBenefitYearly;

    // Palkankorotuksena samalla bruttoarvolla:
    const employerCostSalary = totalBenefitYearly * (1 + SIVUKULUT_RATE);
    const employeeNetSalary = totalBenefitYearly * (1 - marginalTax);

    const employerSavingsYear = employerCostSalary - employerCostBenefit;
    const employeeGainYear = employeeNetBenefit - employeeNetSalary;

    const totalEmployerSavingsYear = employerSavingsYear * employees;
    const totalCostBenefitYear = employerCostBenefit * employees;
    const totalCostSalaryYear = employerCostSalary * employees;

    const selectedCount = (commutingActive ? 1 : 0) + (lunchActive ? 1 : 0) + (liikuntaActive ? 1 : 0);

    return {
      commutingYearly, lunchYearly, liikuntaYearly,
      totalBenefitYearly, totalBenefitMonthly,
      employerCostBenefit, employeeNetBenefit,
      employerCostSalary, employeeNetSalary,
      employerSavingsYear, employeeGainYear,
      totalEmployerSavingsYear, totalCostBenefitYear, totalCostSalaryYear,
      selectedCount,
    };
  }, [commutingActive, commutingAnnual, lunchActive, lunchesPerMonth, liikuntaActive, liikuntaAnnual, marginalTax, employees]);

  return (
    <div style={{
      minHeight: "100vh", background: WARM,
      fontFamily: "'Inter', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BRAND} 0%, #1a3a5c 100%)`,
        color: "#fff", padding: "32px 20px 26px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30,
          width: 140, height: 140, borderRadius: "50%",
          background: "rgba(46,125,107,0.18)",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{
            fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)", marginBottom: 6,
          }}>
            Verologia · Etupaketti
          </div>
          <h1 style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 26, fontWeight: 700, margin: 0, lineHeight: 1.25,
            color: "#fff",
          }}>
            Etupaketti vai palkankorotus?
          </h1>
          <p style={{
            fontSize: 14, color: "rgba(255,255,255,0.7)",
            margin: "8px 0 0", lineHeight: 1.5,
          }}>
            Vertaile kolmen verovapaan edun yhdistelmää palkankorotukseen. Valitse mitkä otat mukaan.
          </p>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>

        {/* Benefit selectors */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: 1.2, color: "rgba(13,38,63,0.5)", marginBottom: 10,
          }}>
            Edut paketissa ({calc.selectedCount}/3)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            <BenefitToggle
              active={commutingActive}
              onClick={() => setCommutingActive(!commutingActive)}
              title="Työmatkaetu"
              meta={`Verovapaa enintään ${fmt0(COMMUTING_MAX)} €/v`}
            >
              <div>
                <div style={{
                  fontSize: 12, color: "rgba(13,38,63,0.65)",
                  marginBottom: 8, fontWeight: 500,
                }}>
                  HSL-vyöhyke
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {HSL_ZONES.map((z, i) => (
                    <button
                      key={z.label}
                      onClick={(e) => { e.stopPropagation(); setCommutingZoneIdx(i); }}
                      style={{
                        flex: 1, padding: "8px 0", fontSize: 13, fontWeight: 600,
                        border: `1.5px solid ${i === commutingZoneIdx ? ACCENT : "rgba(13,38,63,0.1)"}`,
                        borderRadius: 8,
                        background: i === commutingZoneIdx ? ACCENT : "#fff",
                        color: i === commutingZoneIdx ? "#fff" : BRAND,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 12, color: "rgba(13,38,63,0.6)",
                }}>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={commutingUseSaver}
                      onChange={(e) => setCommutingUseSaver(e.target.checked)}
                    />
                    Säästölippu ({fmt(HSL_ZONES[commutingZoneIdx].saver)} €/kk)
                  </label>
                  <span style={{ fontWeight: 700, color: BRAND }}>
                    {fmt(commutingTicket)} €/kk · {fmt(commutingAnnual)} €/v
                  </span>
                </div>
              </div>
            </BenefitToggle>

            <BenefitToggle
              active={lunchActive}
              onClick={() => setLunchActive(!lunchActive)}
              title="Lounasetu"
              meta={`Verotusarvo 8,80 €/lounas · ${LUNCH_ACTIVE_MONTHS} kk/v`}
            >
              <MiniSlider
                label="Lounaita kuukaudessa"
                value={lunchesPerMonth}
                min={LUNCH_MIN}
                max={LUNCH_MAX}
                onChange={setLunchesPerMonth}
                unit="lounasta/kk"
                hint={`Vuositason etu: ${fmt(LUNCH_TAX_VALUE * lunchesPerMonth * LUNCH_ACTIVE_MONTHS)} €. Verotus vain käytetyistä lounaista.`}
              />
            </BenefitToggle>

            <BenefitToggle
              active={liikuntaActive}
              onClick={() => setLiikuntaActive(!liikuntaActive)}
              title="Liikunta- ja kulttuurietu"
              meta={`Verovapaa enintään ${LIIKUNTA_MAX} €/v`}
            >
              <MiniSlider
                label="Etu vuodessa"
                value={liikuntaAnnual}
                min={0}
                max={LIIKUNTA_MAX}
                step={10}
                onChange={setLiikuntaAnnual}
                unit="€/v"
                hint="Kuntosalit, urheilutapahtumat, teatteri, museot, konsertit."
              />
            </BenefitToggle>

          </div>
        </div>

        {/* Salary selector */}
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 10, flexWrap: "wrap", gap: 8,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: 1.2, color: "rgba(13,38,63,0.5)",
            }}>
              Työntekijän palkkataso (marginaalivero {Math.round(marginalTax * 100)} %)
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 11, color: "rgba(13,38,63,0.5)" }}>
                Tai oma palkka:
              </span>
              <input
                type="number"
                min={SALARY_MIN}
                max={SALARY_MAX}
                step={100}
                value={salaryGross}
                onChange={(e) => handleSalaryInput(e.target.value)}
                style={{
                  width: 100, padding: "6px 10px",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  color: BRAND, background: "#fff",
                  border: `1.5px solid rgba(13,38,63,0.15)`,
                  borderRadius: 8, textAlign: "right",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: "rgba(13,38,63,0.5)" }}>€/kk</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {SALARY_EXAMPLES.map((s) => (
              <button key={s.gross} onClick={() => setSalaryGross(s.gross)} style={{
                padding: "8px 10px", fontSize: 12, fontWeight: 500,
                border: `1.5px solid ${s.gross === salaryGross ? ACCENT : "rgba(13,38,63,0.1)"}`,
                borderRadius: 8,
                background: s.gross === salaryGross ? ACCENT : "#fff",
                color: s.gross === salaryGross ? "#fff" : BRAND,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s",
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Employee count */}
        <div style={{ marginBottom: 22 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 10,
          }}>
            <div style={{
              fontSize: 13, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: 1.2, color: "rgba(13,38,63,0.5)",
            }}>
              Henkilöstön määrä
            </div>
            <input
              type="number"
              min={EMPLOYEES_MIN}
              max={EMPLOYEES_MAX}
              value={employees}
              onChange={(e) => handleEmployeeInput(e.target.value)}
              style={{
                width: 90, padding: "6px 10px",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                color: BRAND, background: "#fff",
                border: `1.5px solid rgba(13,38,63,0.15)`,
                borderRadius: 8, textAlign: "right",
                outline: "none",
              }}
            />
          </div>
          <input
            type="range"
            min={EMPLOYEES_MIN}
            max={EMPLOYEES_MAX}
            value={employees}
            onChange={(e) => setEmployees(Number(e.target.value))}
            style={{ width: "100%", accentColor: ACCENT }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 10, color: "rgba(13,38,63,0.3)",
          }}>
            <span>1</span><span>250</span><span>500</span><span>750</span><span>1000</span>
          </div>
        </div>

        {calc.selectedCount === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 14, padding: "32px 20px",
            border: "1px dashed rgba(13,38,63,0.15)",
            textAlign: "center",
            color: "rgba(13,38,63,0.5)", fontSize: 13, lineHeight: 1.5,
          }}>
            Valitse yksi tai useampi etu yltä nähdäksesi vertailun palkankorotukseen.
          </div>
        ) : (
          <>
            {/* Breakdown per benefit */}
            <div style={{
              background: "#fff", borderRadius: 14, padding: 16,
              border: "1px solid rgba(13,38,63,0.08)",
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 1.5, color: "rgba(13,38,63,0.5)", marginBottom: 14,
              }}>
                Etujen erittely / työntekijä / vuosi
              </div>

              {commutingActive && (
                <BreakdownRow label="Työmatkaetu" value={calc.commutingYearly} />
              )}
              {lunchActive && (
                <BreakdownRow label="Lounasetu" value={calc.lunchYearly} />
              )}
              {liikuntaActive && (
                <BreakdownRow label="Liikunta- ja kulttuurietu" value={calc.liikuntaYearly} />
              )}

              <div style={{
                marginTop: 10, paddingTop: 12,
                borderTop: "2px solid rgba(13,38,63,0.08)",
                display: "flex", justifyContent: "space-between",
                fontSize: 14, fontWeight: 600, color: BRAND,
              }}>
                <span>Yhteensä</span>
                <span style={{
                  fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: ACCENT,
                }}>
                  {fmt(calc.totalBenefitYearly)} €
                </span>
              </div>
            </div>

            {/* Comparison cards */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              marginBottom: 16,
            }}>
              <div style={{
                background: "#fff", borderRadius: 14, padding: 16,
                border: `1px solid rgba(196,88,74,0.2)`,
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: 1.5, color: RED_SOFT, marginBottom: 12,
                }}>
                  Palkankorotus
                </div>
                <div style={{ fontSize: 11, color: "rgba(13,38,63,0.5)", marginBottom: 4 }}>
                  Työnantaja maksaa /v
                </div>
                <div style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 22, fontWeight: 700, color: RED_SOFT, marginBottom: 12,
                }}>
                  {fmt(calc.employerCostSalary)} €
                </div>
                <div style={{ fontSize: 11, color: "rgba(13,38,63,0.5)", marginBottom: 4 }}>
                  Työntekijä saa käteen /v
                </div>
                <div style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 22, fontWeight: 700, color: BRAND,
                }}>
                  {fmt(calc.employeeNetSalary)} €
                </div>
              </div>

              <div style={{
                background: "#fff", borderRadius: 14, padding: 16,
                border: `2px solid ${ACCENT}`,
                boxShadow: "0 4px 20px rgba(46,125,107,0.1)",
              }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: 1.5, color: ACCENT, marginBottom: 12,
                }}>
                  Etupaketti ✓
                </div>
                <div style={{ fontSize: 11, color: "rgba(13,38,63,0.5)", marginBottom: 4 }}>
                  Työnantaja maksaa /v
                </div>
                <div style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 22, fontWeight: 700, color: ACCENT, marginBottom: 12,
                }}>
                  {fmt(calc.employerCostBenefit)} €
                </div>
                <div style={{ fontSize: 11, color: "rgba(13,38,63,0.5)", marginBottom: 4 }}>
                  Työntekijä saa käteen /v
                </div>
                <div style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 22, fontWeight: 700, color: BRAND,
                }}>
                  {fmt(calc.employeeNetBenefit)} €
                </div>
              </div>
            </div>

            {/* Key insight */}
            <div style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, #1a3a5c 100%)`,
              borderRadius: 14, padding: 20, color: "#fff",
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 2, color: "rgba(255,255,255,0.5)", marginBottom: 14,
              }}>
                Yhteenveto / työntekijä / vuosi
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                    Työnantaja säästää
                  </div>
                  <div style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 22, fontWeight: 700, color: "#7FDBBA",
                  }}>
                    {fmt(calc.employerSavingsYear)} €
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                    Työntekijä hyötyy
                  </div>
                  <div style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 22, fontWeight: 700, color: "#7FDBBA",
                  }}>
                    +{fmt(calc.employeeGainYear)} €
                  </div>
                </div>
              </div>

              <div style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: 14,
                fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6,
              }}>
                {calc.selectedCount === 3
                  ? "Kolmen edun yhdistelmä "
                  : calc.selectedCount === 2
                  ? "Valitsemiesi kahden edun yhdistelmä "
                  : "Valitsemasi etu "}
                tuottaa työntekijälle <strong style={{ color: "#7FDBBA" }}>
                {fmt(calc.employeeGainYear)} € enemmän</strong> vuodessa kuin sama summa palkankorotuksena.
                Samalla työnantaja <strong style={{ color: "#7FDBBA" }}>säästää {fmt(calc.employerSavingsYear)} €</strong> sivukuluissa.
              </div>
            </div>

            {/* Scale card */}
            <div style={{
              background: "#fff", borderRadius: 14, padding: 16,
              border: "1px solid rgba(13,38,63,0.08)",
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 1.5, color: "rgba(13,38,63,0.5)", marginBottom: 14,
              }}>
                Skaalattu: {employees} työntekijää / vuosi
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{
                  background: "rgba(196,88,74,0.06)", borderRadius: 10, padding: 14,
                }}>
                  <div style={{ fontSize: 11, color: "rgba(13,38,63,0.5)", marginBottom: 4 }}>
                    Palkankorotus yhteensä
                  </div>
                  <div style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 18, fontWeight: 700, color: RED_SOFT,
                  }}>
                    {fmt(calc.totalCostSalaryYear)} €
                  </div>
                </div>
                <div style={{
                  background: "rgba(46,125,107,0.06)", borderRadius: 10, padding: 14,
                }}>
                  <div style={{ fontSize: 11, color: "rgba(13,38,63,0.5)", marginBottom: 4 }}>
                    Etupaketti yhteensä
                  </div>
                  <div style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 18, fontWeight: 700, color: ACCENT,
                  }}>
                    {fmt(calc.totalCostBenefitYear)} €
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: 14, textAlign: "center",
                padding: "12px", borderRadius: 10,
                background: "rgba(46,125,107,0.08)",
              }}>
                <div style={{ fontSize: 11, color: "rgba(13,38,63,0.5)", marginBottom: 4 }}>
                  Työnantajan kokonaissäästö vuodessa
                </div>
                <div style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 26, fontWeight: 700, color: ACCENT,
                }}>
                  {fmt(calc.totalEmployerSavingsYear)} €
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer note */}
        <div style={{
          fontSize: 10, color: "rgba(13,38,63,0.35)", lineHeight: 1.6,
          padding: "0 4px",
        }}>
          Laskelma perustuu vuoden 2026 verotuskäytäntöön: työmatkaetu verovapaa enintään 3 400 €/v (yhteinen kattoraja pyöräedun kanssa), lounasetu kun työnantaja kustantaa verotusarvon 8,80 €/lounas (välittömät kustannukset 8,80–14,00 €), liikunta- ja kulttuurietu verovapaa enintään 400 €/v (TVL 69 §). Lounasetu lasketaan 11 aktiivisen kuukauden mukaan, mikä vastaa noin 5 viikon vuosilomaa. Verotus kohdistuu vain käytettyihin lounaisiin, ei automaattisesti jokaiselle työpäivälle. Työnantajan sivukulut 20,5 % (TyEL, sairausvakuutus, työttömyysvakuutus, tapaturmavakuutus, ryhmähenkivakuutus). Marginaaliveroasteet ovat viitteellisiä, todelliset verovaikutukset riippuvat yksilön tilanteesta.
          <br /><br />
          Verologia.fi — Työsuhde-etujen koulutus yrityksille
        </div>
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "8px 0",
      fontSize: 13, color: BRAND,
    }}>
      <span style={{ color: "rgba(13,38,63,0.7)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{fmt(value)} €</span>
    </div>
  );
}
