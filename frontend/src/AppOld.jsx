import { useState, useEffect } from 'react';
import './App.css';

const API_BASE = "http://localhost:8000";

export default function App() {
  const [state, setState] = useState({
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
    furnishingstatus: "furnished"
  });

  const [prediction, setPrediction] = useState(null);
  const [meta, setMeta] = useState({ r2: "...", mae: "..." });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  // Fetch model metadata on mount
  useEffect(() => {
    fetch(`${API_BASE}/model-info`)
      .then(r => r.json())
      .then(m => setMeta({ r2: m.r2, mae: "± " + fmt.format(m.mae) }))
      .catch(() => {});
  }, []);

  // Fetch prediction whenever state changes
  useEffect(() => {
    const controller = new AbortController();
    const fetchPrediction = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
          signal: controller.signal
        });
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const data = await res.json();
        setPrediction(data.predicted_price);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError("Can't reach the API. Ensure FastAPI is running.");
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPrediction, 200); // debounce
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state]);

  const handleChange = (key, val) => {
    setState(prev => ({ ...prev, [key]: val }));
  };

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 20px 56px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>What is this house worth?</h1>
      <p style={{ color: '#5b6b7c', marginBottom: 32 }}>React frontend talking live to your FastAPI &amp; Scikit-Learn MLOps pipeline.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        
        {/* Controls Panel */}
        <section style={{ background: '#fff', border: '1px solid #c9d3dc', borderRadius: 14, padding: 24 }}>
          
          {/* Area Slider */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontWeight: 600 }}>Living Area (sq ft)</label>
              <span style={{ fontWeight: 700, color: '#0e6b5c' }}>{state.area.toLocaleString()} sq ft</span>
            </div>
            <input 
              type="range" min="1500" max="16200" step="100" value={state.area}
              onChange={e => handleChange('area', +e.target.value)}
              style={{ width: '100%', accentColor: '#0e6b5c' }}
            />
          </div>

          {/* Helper to render group buttons */}
          {[
            { key: 'bedrooms', label: 'Bedrooms', values: [1, 2, 3, 4, 5, 6] },
            { key: 'bathrooms', label: 'Bathrooms', values: [1, 2, 3, 4] },
            { key: 'stories', label: 'Stories', values: [1, 2, 3, 4] },
            { key: 'parking', label: 'Parking Spaces', values: [0, 1, 2, 3] },
            { key: 'mainroad', label: 'Main Road', values: ['yes', 'no'] },
            { key: 'airconditioning', label: 'Air Conditioning', values: ['yes', 'no'] },
            { key: 'furnishingstatus', label: 'Furnishing', values: ['furnished', 'semi-furnished', 'unfurnished'] }
          ].map(group => (
            <div key={group.key} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{group.label}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {group.values.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleChange(group.key, val)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #c9d3dc',
                      background: state[group.key] === val ? '#0e6b5c' : 'transparent',
                      color: state[group.key] === val ? '#fff' : '#14213d',
                      fontWeight: state[group.key] === val ? 600 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Results Panel */}
        <section style={{ background: '#fff', border: '1px solid #c9d3dc', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#5b6b7c', fontSize: 14 }}>Estimated price</div>
            <div style={{ fontSize: 'clamp(36px, 5vw, 52px)', fontWeight: 700, margin: '4px 0 6px', opacity: loading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
              {prediction !== null ? fmt.format(prediction) : '—'}
            </div>
            <div style={{ color: '#5b6b7c', fontSize: 14 }}>
              {prediction !== null ? `${fmt.format(prediction / state.area)} per sq ft` : ''}
            </div>

            {error && <div style={{ color: '#b3261e', fontWeight: 500, marginTop: 12 }}>{error}</div>}
          </div>

          <div style={{ borderTop: '1px solid #c9d3dc', marginTop: 24, paddingTop: 16 }}>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', margin: 0, fontSize: 14, color: '#5b6b7c' }}>
              <dt>Model</dt><dd style={{ margin: 0, textAlign: 'right', color: '#14213d' }}>Gradient Boosting</dd>
              <dt>Test R²</dt><dd style={{ margin: 0, textAlign: 'right', color: '#14213d' }}>{meta.r2}</dd>
              <dt>Typical error</dt><dd style={{ margin: 0, textAlign: 'right', color: '#14213d' }}>{meta.mae}</dd>
            </dl>
          </div>
        </section>

      </div>
    </main>
  );
}