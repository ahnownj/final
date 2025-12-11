import { useState, useEffect, useRef } from 'react';

export const NOTE_EVENT_NAME = 'vp-note-updated';
const HEADER_NAME = 'Name';

export const getNoteStorageKey = (placeId) => {
  if (placeId === null || placeId === undefined) return null;
  return `note_${placeId}`;
};

export const getSavedNote = (placeId) => {
  if (typeof window === 'undefined') return null;
  const key = getNoteStorageKey(placeId);
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('메모 데이터를 불러오지 못했습니다.', err);
    return null;
  }
};

const buildTimeMeta = () => {
  const now = new Date();
  const dateTimeLabel = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const minutePart = minutes ? `:${String(minutes).padStart(2, '0')}` : '';
  const timezoneLabel = `GMT${sign}${hours}${minutePart}`;
  return { dateTimeLabel, timezoneLabel };
};

const buildHeaderLine = ({ dateTimeLabel, timezoneLabel, name }) =>
  `${name}, ${dateTimeLabel} - Currently in timezone ${timezoneLabel}.`;

const buildDefaultBody = () =>
  'It seems to me that I will always be happy in the place where I am not.';

const extractBodyFromSaved = (savedText) => {
  if (!savedText || typeof savedText !== 'string') return '';
  const lines = savedText.split('\n');
  if (lines.length === 0) return '';
  lines.shift(); // remove header
  while (lines[0] === '') lines.shift(); // remove leading blanks
  return lines.join('\n');
};

const extractNameFromSaved = (savedText, savedAuthor) => {
  if (savedAuthor) return savedAuthor;
  if (!savedText || typeof savedText !== 'string') return HEADER_NAME;
  const firstLine = savedText.split('\n')[0] || '';
  const candidate = firstLine.split(',')[0]?.trim();
  return candidate || HEADER_NAME;
};

export default function Note({ place, isOpen, onClose }) {
  const [name, setName] = useState(HEADER_NAME);
  const [body, setBody] = useState('');
  const [headerMeta, setHeaderMeta] = useState(buildTimeMeta());
  const textareaRef = useRef(null);
  const caretPositionedRef = useRef(false);
  const storageKey = getNoteStorageKey(place?.id);

  useEffect(() => {
    if (!place) return;
    const saved = getSavedNote(place.id);
    if (saved && typeof saved.text === 'string') {
      const parsedBody = extractBodyFromSaved(saved.text);
      const parsedName = extractNameFromSaved(saved.text, saved.author);
      setName(parsedName || HEADER_NAME);
      setBody(parsedBody || buildDefaultBody());
      return;
    }
    setName(HEADER_NAME);
    setBody(buildDefaultBody());
  }, [storageKey, place]);

  useEffect(() => {
    const tick = () => setHeaderMeta(buildTimeMeta());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const persistNote = (bodyValue, nameValue) => {
    if (!storageKey || typeof window === 'undefined' || !place) return null;
    const safeName = (nameValue || HEADER_NAME).trim() || HEADER_NAME;
    const meta = buildTimeMeta();
    const headerLine = buildHeaderLine({ ...meta, name: safeName });
    const data = {
      text: `${headerLine}\n\n${bodyValue}`,
      author: safeName,
      timestamp: `${meta.dateTimeLabel} (${meta.timezoneLabel})`,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent(NOTE_EVENT_NAME, {
        detail: { placeId: place.id, data },
      })
    );
    return data;
  };

  const handleNoteChange = (e) => {
    const value = e.target.value;
    setBody(value);
    persistNote(value, name);
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    persistNote(body, value);
  };

  useEffect(() => {
    if (!isOpen) {
      caretPositionedRef.current = false;
      return;
    }
    if (caretPositionedRef.current || !textareaRef.current) return;
    const timer = setTimeout(() => {
      const el = textareaRef.current;
      const len = el.value.length;
      el.focus();
      el.setSelectionRange(len, len);
      caretPositionedRef.current = true;
    }, 120);
    return () => clearTimeout(timer);
  }, [isOpen, body]);

  if (!isOpen || !place) return null;

  return (
    <div className="note-overlay" onClick={onClose}>
      <div className="note-surface" onClick={(e) => e.stopPropagation()}>
        <div className="note-close" onClick={onClose} aria-label="close">
          ×
        </div>
        <div className="note-plus">+</div>
        <div className="note-header">
          <input
            className="note-name-input"
            value={name}
            onChange={handleNameChange}
            spellCheck={false}
          />
          <span>, {headerMeta.dateTimeLabel} - Currently in timezone {headerMeta.timezoneLabel}.</span>
        </div>
        <div className="note-gap" aria-hidden />
        <textarea
          ref={textareaRef}
          className="note-textarea"
          value={body}
          onChange={handleNoteChange}
          spellCheck={false}
        />
      </div>

      <style jsx>{`
        .note-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.32);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          display: flex;
          align-items: stretch;
          justify-content: center;
        }
        .note-surface {
          position: relative;
          flex: 1;
          max-width: 1400px;
          padding: 8vh 6vw;
          display: flex;
          flex-direction: column;
          overflow: auto;
        }
        .note-close {
          position: absolute;
          top: 12px;
          right: 20px;
          font-size: 24px;
          cursor: pointer;
          color: #000;
          transition: opacity 0.2s ease;
          line-height: 1;
          user-select: none;
        }
        .note-close:hover {
          opacity: 0;
        }
        .note-plus {
          position: absolute;
          top: 12px;
          left: 20px;
          font-size: 20px;
          font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #000;
          z-index: 1001;
          cursor: default;
          user-select: none;
        }
        .note-header {
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1;
          font-weight: 400;
          color: #0f0f0f;
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
          overflow-wrap: anywhere;
          max-width: 100%;
        }
        .note-name-input {
          border: none;
          outline: none;
          background: transparent;
          color: #ffd400;
          font: inherit;
          padding: 0;
          margin: 0;
          width: auto;
          min-width: 60px;
        }
        .note-name-input::selection,
        .note-header span::selection,
        .note-textarea::selection {
          background: #ffd400;
          color: #000;
        }
        .note-gap {
          height: 1.2em;
          flex-shrink: 0;
        }
        .note-textarea {
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #0f0f0f;
          caret-color: #0f0f0f;
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.08;
          font-weight: 400;
          resize: none;
          white-space: pre-wrap;
          overflow: auto;
          overflow-wrap: anywhere;
          padding: 0;
        }
        .note-textarea::-webkit-scrollbar {
          width: 6px;
        }
        .note-textarea::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 999px;
        }
        @media (max-width: 768px) {
          .note-surface {
            padding: 6vh 5vw;
          }
          .note-header {
            font-size: clamp(26px, 7vw, 42px);
          }
          .note-textarea {
            font-size: clamp(26px, 7vw, 42px);
          }
        }
      `}</style>
    </div>
  );
}







