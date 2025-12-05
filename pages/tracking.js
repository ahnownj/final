import { useState } from 'react';
import dynamic from 'next/dynamic';

const TrackingCanvas = dynamic(() => import('../components/tracking'), { ssr: false });

const INITIAL = {
  cellSize: 24,
  trail: 0.08,
  brightnessPower: 1.6,
  color: '#ffd400',
  mirror: true,
};

export default function TrackingPage() {
  const [params, setParams] = useState(INITIAL);

  const handleChange = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setParams((prev) => ({ ...prev, [key]: parseValue(key, value) }));
  };

  const reset = () => setParams(INITIAL);

  return (
    <div className="tracking-page">
      <h1>Tracking Playground</h1>
      <TrackingCanvas {...params} />
      <div className="controls">
        <label>
          Cell Size
          <input
            type="range"
            min="8"
            max="48"
            value={params.cellSize}
            onChange={handleChange('cellSize')}
          />
          <span>{params.cellSize}px</span>
        </label>
        <label>
          Trail
          <input
            type="range"
            min="0.01"
            max="0.3"
            step="0.01"
            value={params.trail}
            onChange={handleChange('trail')}
          />
          <span>{params.trail.toFixed(2)}</span>
        </label>
        <label>
          Brightness
          <input
            type="range"
            min="0.8"
            max="3"
            step="0.1"
            value={params.brightnessPower}
            onChange={handleChange('brightnessPower')}
          />
          <span>{params.brightnessPower.toFixed(1)}</span>
        </label>
        <label>
          Color
          <input type="color" value={params.color} onChange={handleChange('color')} />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={params.mirror}
            onChange={handleChange('mirror')}
          />
          Mirror
        </label>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>

      <style jsx>{`
        .tracking-page {
          padding: 40px 16px 80px;
          color: #f0f0f0;
          background: #111;
          min-height: 100vh;
          font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        h1 {
          text-align: center;
          letter-spacing: 0.2em;
          font-size: 18px;
          margin-bottom: 24px;
        }
        .controls {
          max-width: 640px;
          margin: 24px auto 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          background: rgba(255, 255, 255, 0.05);
          padding: 16px;
          border-radius: 16px;
        }
        label {
          display: flex;
          flex-direction: column;
          font-size: 12px;
          gap: 4px;
        }
        label span {
          font-size: 11px;
          opacity: 0.7;
        }
        input[type='range'] {
          width: 100%;
        }
        .checkbox {
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }
        button {
          border: none;
          background: #ffd400;
          color: #111;
          padding: 10px 14px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
}

const parseValue = (key, value) => {
  switch (key) {
    case 'cellSize':
      return parseInt(value, 10);
    case 'trail':
    case 'brightnessPower':
      return parseFloat(value);
    case 'mirror':
      return Boolean(value);
    default:
      return value;
  }
};

