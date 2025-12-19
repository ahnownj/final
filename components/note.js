import { useState, useEffect, useRef } from 'react';
import { fetchNoteForPlace, saveNoteForPlace } from '../lib/notesApi';

export const NOTE_EVENT_NAME = 'vp-note-updated';
const HEADER_NAME = 'Write down your name here...';

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
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return null;
    if (parsed.body) return parsed;
    if (parsed.text) {
      return {
        body: extractBodyFromSaved(parsed.text),
        author: parsed.author,
        timestamp: parsed.timestamp,
      };
    }
    return parsed;
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
  `${name} ${dateTimeLabel} Currently in timezone ${timezoneLabel}.`;

const buildDefaultBody = () =>
  'It seems to me that I will always be happy in the place where I am not.';

const extractBodyFromSaved = (savedText) => {
  if (!savedText || typeof savedText !== 'string') return '';
  const lines = savedText.split('\n');
  if (lines.length === 0) return '';
  lines.shift(); // remove header
  while (lines.length && lines[0] === '') lines.shift(); // remove leading blanks
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
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);
  const textareaRef = useRef(null);
  const saveTimerRef = useRef(null);
  const storageKey = getNoteStorageKey(place?.id);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!place) return;
      const remote = await fetchNoteForPlace(place.id);
      if (!active) return;
      if (remote) {
        setName(remote.author || HEADER_NAME);
        setBody(remote.body || '');
        return;
      }
      const saved = getSavedNote(place.id);
      if (saved) {
        const parsedName = saved.author || extractNameFromSaved(saved.text, saved.author);
        const parsedBody = saved.body || extractBodyFromSaved(saved.text || '');
        setName(parsedName || HEADER_NAME);
        setBody(parsedBody || buildDefaultBody());
        return;
      }
      setName(HEADER_NAME);
      setBody(buildDefaultBody());
    };
    load();
    return () => {
      active = false;
    };
  }, [storageKey, place]);

  useEffect(() => {
    const tick = () => setHeaderMeta(buildTimeMeta());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const persistNote = (bodyValue, nameValue) => {
    if (!storageKey || typeof window === 'undefined' || !place) return null;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const safeName = (nameValue || HEADER_NAME).trim() || HEADER_NAME;
    const meta = buildTimeMeta();
    const headerLine = buildHeaderLine({ ...meta, name: safeName });
    const data = {
      text: `${headerLine}\n\n${bodyValue}`,
      body: bodyValue,
      author: safeName,
      timestamp: `${meta.dateTimeLabel} (${meta.timezoneLabel})`,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      await saveNoteForPlace({
        placeId: place.id,
        author: safeName,
        body: bodyValue,
      });
      setSaving(false);
    }, 350);
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
    if (nameRef.current) {
      nameRef.current.style.height = 'auto';
      nameRef.current.style.height = `${nameRef.current.scrollHeight}px`;
    }
  };

  if (!isOpen || !place) return null;

  return (
    <div className="note-overlay" onClick={onClose}>
      <div className="note-surface" onClick={(e) => e.stopPropagation()}>
        <div className="note-close" onClick={onClose} aria-label="close">×</div>
        <div className="note-header">
          <div className="note-name-row">
            <textarea
              className="note-name-input"
              ref={nameRef}
              value={name}
              onChange={handleNameChange}
              rows={1}
              wrap="soft"
              onFocus={() => {
                if (name === HEADER_NAME) {
                  setName('');
                  if (nameRef.current) {
                    nameRef.current.style.height = 'auto';
                    nameRef.current.style.height = `${nameRef.current.scrollHeight}px`;
                  }
                }
              }}
              onClick={() => {
                if (name === HEADER_NAME) {
                  setName('');
                  if (nameRef.current) {
                    nameRef.current.style.height = 'auto';
                    nameRef.current.style.height = `${nameRef.current.scrollHeight}px`;
                  }
                }
              }}
              spellCheck={false}
            />
          </div>
          <div className="note-time-row">
            <span className="note-date-wrap">
              <span className="note-dot" aria-hidden />
              <span className="note-date">{headerMeta.dateTimeLabel}</span>
            </span>
            <span className="note-rest">Currently in timezone {headerMeta.timezoneLabel}.</span>
          </div>
        </div>
        <div className="note-gap" aria-hidden />
        <textarea
          ref={textareaRef}
          className="note-textarea"
          value={body}
          onChange={handleNoteChange}
          onFocus={() => {
            if (body === buildDefaultBody()) {
              setBody('');
            }
          }}
          onClick={() => {
            if (body === buildDefaultBody()) {
              setBody('');
            }
          }}
          spellCheck={false}
        />
      </div>

      <style jsx>{`
        .note-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(255, 255, 255, 0.32); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); display: flex; align-items: stretch; justify-content: center; }
        .note-surface {
          position: relative;
          flex: 1;
          max-width: 1400px;
          padding: 8vh 6vw;
          display: flex;
          flex-direction: column;
          overflow: auto;
        }
        .note-close { position: absolute; top: 12px; right: 20px; font-size: 24px; cursor: pointer; color: #000; transition: opacity 0.2s ease; line-height: 1; user-select: none; }
        .note-close:hover {
          opacity: 0;
        }
        .note-header,
        .note-textarea { font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 30px; font-weight: 400; color: #0f0f0f; }
        .note-header { line-height: 1.2; display: flex; flex-direction: column; gap: 12px; max-width: 100%; }
        .note-name-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; line-height: 1.2; }
        .note-time-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.2em; line-height: 1.2; white-space: normal; word-break: normal; max-width: 100%; }
        .note-date-wrap { display: inline-flex; align-items: center; gap: 0.2em; white-space: nowrap; vertical-align: middle; }
        .note-date { line-height: 1.2; }
        .note-rest { line-height: 1.2; white-space: normal; word-break: break-word; }
        .note-dot { width: 0.34em; height: 0.34em; border-radius: 50%; background: #ff2d55; display: inline-block; flex-shrink: 0; animation: note-dot-blink 2.2s linear infinite; vertical-align: middle; margin-right: 0.14em; position: relative; top: 1pt; }
        .note-name-input {
          border: none;
          outline: none;
          background: transparent;
          color: #0f0f0f;
          font: inherit;
          padding: 0;
          margin: 0;
          width: 100%;
          min-height: 1.1em;
          line-height: 1.2;
          resize: none;
          overflow: hidden;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .note-name-input::selection,
        .note-header span::selection,
        .note-textarea::selection {
          background: #ffd400;
          color: #000;
        }
        .note-gap { height: 1.2em; flex-shrink: 0; }
        .note-textarea {
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #ffd400;
          caret-color: #0f0f0f;
          line-height: 1.22;
          resize: none;
          white-space: pre-wrap;
          overflow: auto;
          overflow-wrap: anywhere;
          padding: 0;
        }
        .note-textarea::-webkit-scrollbar { width: 6px; }
        .note-textarea::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); border-radius: 999px; }
        @keyframes note-dot-blink {
          0% { opacity: 0; transform: scale(0.9); }
          40% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 45, 85, 0.0); }
          70% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 45, 85, 0.0); }
          100% { opacity: 0; transform: scale(0.9); box-shadow: 0 0 0 0 rgba(255, 45, 85, 0.0); }
        }
        /* Mobile narrow (e.g., 414px-class devices) */
        @media (max-width: 430px) {
          .note-surface {
            padding: 6vh 5vw;
          }
          .note-header,
          .note-textarea { font-size: 28px; line-height: 1.22; }
        }
      `}</style>
    </div>
  );
}







