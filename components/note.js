import { useState, useEffect, useRef } from 'react';

export const NOTE_EVENT_NAME = 'vp-note-updated';

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

export default function Note({ place, isOpen, onClose }) {
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const textareaRef = useRef(null);
  const storageKey = getNoteStorageKey(place?.id);

  // 저장된 메모 로드
  useEffect(() => {
    if (!place) return;
    const saved = getSavedNote(place.id);
    if (saved) {
      setNote(saved.text || '');
      setAuthor(saved.author || '');
      setTimestamp(saved.timestamp || '');
    } else {
      setNote('');
      setAuthor('');
      setTimestamp('');
    }
    setStatusMessage('');
  }, [storageKey, place]);

  const persistNote = (textValue, authorValue) => {
    if (!storageKey || typeof window === 'undefined') return null;
    const now = new Date();
    const dateTime = now.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const data = {
      text: textValue.trim(),
      author: authorValue.trim(),
      timestamp: dateTime,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
    setTimestamp(dateTime);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(NOTE_EVENT_NAME, {
          detail: { placeId: place.id, data },
        })
      );
    }
    return data;
  };

  const handleSave = () => {
    const trimmedNote = note.trim();
    const trimmedAuthor = author.trim();
    if (!trimmedNote || !trimmedAuthor) {
      setStatusMessage('작성자명과 메모를 모두 입력해주세요.');
      return;
    }
    persistNote(trimmedNote, trimmedAuthor);
    setStatusMessage('저장되었습니다.');
  };

  const handleNoteChange = (e) => {
    setNote(e.target.value);
    if (statusMessage) setStatusMessage('');
  };

  const handleAuthorChange = (e) => {
    setAuthor(e.target.value);
    if (statusMessage) setStatusMessage('');
  };

  // 메모장 열릴 때 포커스
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !place) return null;

  return (
    <>
      <div className="note-backdrop" onClick={onClose} />
      <div className="note-box" onClick={(e) => e.stopPropagation()}>
        {timestamp && <div className="note-timestamp">{timestamp}</div>}
        <input
          className="note-input"
          type="text"
          value={author}
          onChange={handleAuthorChange}
          placeholder="작성자명"
        />
        <textarea
          ref={textareaRef}
          className="note-textarea"
          value={note}
          onChange={handleNoteChange}
          placeholder="메모를 입력하세요..."
        />
        <button className="note-save" onClick={handleSave}>
          저장
        </button>
        {statusMessage && <div className="note-status">{statusMessage}</div>}
      </div>

      <style jsx>{`
        .note-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
        }
        .note-box {
          position: fixed;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          width: 260px;
          max-height: 70vh;
          background: rgba(255, 255, 255, 0.97);
          border-radius: 10px;
          padding: 14px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .note-timestamp {
          font-size: 11px;
          color: #666;
          padding-bottom: 6px;
          border-bottom: 1px solid #eee;
        }
        .note-input {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
        }
        .note-textarea {
          width: 100%;
          flex: 1;
          min-height: 140px;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 10px;
          resize: none;
          font-size: 14px;
          outline: none;
          background: #fff;
          color: #333;
        }
        .note-save {
          border: none;
          border-radius: 999px;
          background: #000;
          color: #fff;
          padding: 10px 0;
          font-size: 13px;
          cursor: pointer;
        }
        .note-status {
          font-size: 12px;
          color: #666;
        }
        @media (max-width: 768px) {
          .note-box {
            width: 220px;
            right: 8px;
          }
        }
      `}</style>
    </>
  );
}







