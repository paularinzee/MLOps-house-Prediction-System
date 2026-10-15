import { useEffect, useMemo, useRef, useState } from "react";
const API_BASE = "http://localhost:8000";
const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const AREA = { min: 1500, max: 16200, step: 100 };

const INITIAL = {
  area: 7420,
  bedrooms: 4,
  bathrooms: 2,
  stories: 2,
  parking: 2,
  mainroad: "yes",
  guestroom: "no",
  basement: "yes",
  hotwaterheating: "no",
  airconditioning: "yes",
  prefarea: "yes",
  furnishingstatus: "furnished",
};

const YES_NO = ["yes", "no"];

// Order of fields in the form
const FIELDS = [
  { key: "bedrooms", label: "Bedrooms", values: [1, 2, 3, 4, 5, 6] },
  { key: "bathrooms", label: "Bathrooms", values: [1, 2, 3, 4] },
  { key: "stories", label: "Stories", values: [1, 2, 3, 4] },
  { key: "parking", label: "Parking Spaces", values: [0, 1, 2, 3] },
  { key: "mainroad", label: "Main Road Access", values: YES_NO },
  { key: "airconditioning", label: "Air Conditioning", values: YES_NO },
  { key: "guestroom", label: "Guestroom", values: YES_NO },
  { key: "basement", label: "Basement", values: YES_NO },
  { key: "hotwaterheating", label: "Hot Water Heating", values: YES_NO },
  { key: "prefarea", label: "Preferred Area", values: YES_NO },
  {
    key: "furnishingstatus",
    label: "Furnishing Status",
    values: ["furnished", "semi-furnished", "unfurnished"],
  },
];

function StepGroup({ label, values, value, onChange }) {
  return (
    <div className="field" role="group" aria-label={label}>
      <div className="row">
        <label>{label}</label>
      </div>
      <div className="steps">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === value}
            onClick={() => onChange(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function HouseSketch({ area, stories, bedrooms, parking }) {
  const w = 100 + ((area - AREA.min) / (AREA.max - AREA.min)) * 220;
  const h = 50 + stories * 25;
  const x = 200 - w / 2;
  const y = 170 - h;
  const n = Math.min(bedrooms, 6);
  const cols = Math.min(n, 3);
  const gap = w / (cols + 1);

  return (
    <svg
      viewBox="0 0 400 190"
      role="img"
      aria-label="Sketch of the house, scaled to your inputs"
    >
      <line x1="0" y1="170" x2="400" y2="170" stroke="var(--line)" strokeWidth="2" />
      <g>
        <rect
          className="body"
          x={x}
          y={y}
          width={w}
          height={h}
          fill="var(--panel)"
          stroke="var(--ink)"
          strokeWidth="2"
        />
        <polygon
          className="roof"
          points={`${x - 10},${y} ${x + w / 2},${y - 35} ${x + w + 10},${y}`}
          fill="var(--accent)"
          stroke="var(--ink)"
          strokeWidth="2"
        />
        <rect x={x + w / 2 - 10} y={138} width="20" height="32" fill="var(--ink)" />
        {Array.from({ length: n }, (_, i) => {
          const r = Math.floor(i / 3);
          const c = i % 3;
          return (
            <rect
              key={i}
              x={x + gap * (c + 1) - 8}
              y={y + 14 + r * 28}
              width="16"
              height="16"
              fill="var(--accent-soft)"
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
          );
        })}
        {Array.from({ length: parking }, (_, g) => (
          <rect
            key={g}
            x={x + w + 4 + g * 12}
            y={145}
            width="10"
            height="25"
            fill="var(--accent)"
            opacity="0.6"
          />
        ))}
      </g>
    </svg>
  );
}

export default function HousePriceEstimator() {
  const [form, setForm] = useState(INITIAL);
  const [price, setPrice] = useState(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const seq = useRef(0);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  // Model metadata (once)
  useEffect(() => {
    fetch(`${API_BASE}/model-info`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  // Debounced prediction whenever the form changes
  useEffect(() => {
    const mine = ++seq.current;
    setStale(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          throw new Error(
            res.status === 422
              ? "Some inputs are out of valid range."
              : `Server returned status ${res.status}.`
          );
        }
        const data = await res.json();
        if (mine !== seq.current) return;
        setPrice(data.predicted_price);
        setError("");
      } catch (e) {
        if (mine !== seq.current) return;
        setError(
          e instanceof TypeError
            ? "Can't reach the API. Ensure server is running."
            : e.message
        );
      } finally {
        if (mine === seq.current) setStale(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [form]);

  const perSqft = useMemo(
    () => (price == null ? "" : `${fmt.format(price / form.area)} per sq ft`),
    [price, form.area]
  );

  return (
    <>
      <style>{CSS}</style>
      <main>
        <h1>What is this house worth?</h1>
        <p className="sub">
          Configure property details below to get a live real-time price
          estimation from the scikit-learn model.
        </p>

        <div className="grid">
          <section className="panel" aria-label="Property details">
            <div className="field">
              <div className="row">
                <label htmlFor="area">Living Area (sq ft)</label>
                <output>{form.area.toLocaleString()} sq ft</output>
              </div>
              <input
                type="range"
                id="area"
                {...AREA}
                value={form.area}
                onChange={(e) => set("area", +e.target.value)}
              />
            </div>

            {FIELDS.map((f) => (
              <StepGroup
                key={f.key}
                label={f.label}
                values={f.values}
                value={form[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </section>

          <section className="panel result" aria-live="polite" aria-label="Estimate">
            <div className="stage">
              <HouseSketch
                area={form.area}
                stories={form.stories}
                bedrooms={form.bedrooms}
                parking={form.parking}
              />
            </div>
            <div className="meta">Estimated price</div>
            <div className={`price${stale ? " stale" : ""}`}>
              {price == null ? "—" : fmt.format(price)}
            </div>
            <div className="meta">{perSqft}</div>
            {error && (
              <div className="err" role="alert">
                {error}
              </div>
            )}
            <dl>
              <dt>Model</dt>
              <dd>Gradient Boosting</dd>
              <dt>Test R²</dt>
              <dd>{info ? info.r2 : "…"}</dd>
              <dt>Typical error</dt>
              <dd>{info ? `± ${fmt.format(info.mae)}` : "…"}</dd>
            </dl>
            <p style={{ marginTop: 16 }}>
              Served by FastAPI &amp; Scikit-Learn. Try the <a href={`${API_BASE}/docs`}>API docs</a>.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}

const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Instrument+Sans:wght@400;500;600&display=swap");
:root{--ink:#14213d;--paper:#eef2f5;--panel:#fff;--line:#c9d3dc;--muted:#5b6b7c;--accent:#0e6b5c;--accent-soft:#d6ebe6;--err:#b3261e;
--display:"Bricolage Grotesque","Trebuchet MS",sans-serif;--body:"Instrument Sans",system-ui,sans-serif}
@media(prefers-color-scheme:dark){:root{--ink:#e8eef5;--paper:#0f1722;--panel:#17212f;--line:#2b3a4d;--muted:#93a4b8;--accent:#4fd1b5;--accent-soft:#143a34;--err:#ff8a80}}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:400 16px/1.5 var(--body)}
main{max-width:1040px;margin:0 auto;padding:40px 20px 56px}
h1{font:700 clamp(28px,4vw,40px)/1.1 var(--display);margin:0 0 6px;letter-spacing:-.02em}
.sub{color:var(--muted);margin:0 0 32px;max-width:52ch}
.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:20px}
@media(max-width:800px){.grid{grid-template-columns:1fr}}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px}
.field{margin-bottom:20px}.field:last-of-type{margin-bottom:0}
.row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
label{font-weight:600;font-size:14px}
output{font:700 16px var(--display);color:var(--accent)}
input[type=range]{width:100%;accent-color:var(--accent);height:28px}
.steps{display:flex;gap:6px;flex-wrap:wrap}
.steps button{min-width:40px;height:36px;padding:0 10px;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:8px;font:500 14px var(--body);cursor:pointer}
.steps button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--paper);font-weight:600}
button:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.result{display:flex;flex-direction:column}
.stage{border-bottom:1px solid var(--line);margin:-24px -24px 20px;padding:20px 24px 0;background:var(--accent-soft);border-radius:14px 14px 0 0}
svg{display:block;width:100%;height:auto}
.price{font:700 clamp(36px,5vw,52px)/1 var(--display);letter-spacing:-.03em;margin:4px 0 6px}
.price.stale{opacity:.45}
.meta{color:var(--muted);font-size:14px;min-height:21px}
.err{color:var(--err);font-weight:500;margin-top:12px}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:18px 0 0;font-size:14px;color:var(--muted)}
dd{margin:0;text-align:right;color:var(--ink)}
a{color:var(--accent)}
@media(prefers-reduced-motion:no-preference){.price{transition:opacity .2s}.roof,.body{transition:all .25s ease}}
`;
