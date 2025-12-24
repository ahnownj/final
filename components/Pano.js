import { useCallback, useEffect, useState } from 'react';
import Note from './note';

const requestPermission = async (fn) => {
  if (typeof fn !== 'function') return true;
  const result = await fn();
  if (result !== 'granted') throw new Error('permission denied');
  return true;
};

export default function Pano({
  streetViewRef,
  streetViewInstanceRef,
  isActive,
  onClose,
  error,
  activePlace,
}) {
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  const disableMotion = useCallback(() => {
    const pano = streetViewInstanceRef?.current;
    pano?.setMotionTracking?.(false);
    pano?.setMotionTrackingEnabled?.(false);
  }, [streetViewInstanceRef]);

  const enableMotion = useCallback(async () => {
    if (typeof window === 'undefined' || !streetViewInstanceRef?.current) return;
    if (!window.isSecureContext) {
      return;
    }
    if (typeof window.DeviceOrientationEvent === 'undefined') {
      return;
    }

    try {
      await requestPermission(window.DeviceOrientationEvent.requestPermission);
      await requestPermission(window.DeviceMotionEvent?.requestPermission);
    } catch (err) {
      return;
    }

    const pano = streetViewInstanceRef.current;
    pano.setMotionTracking?.(true);
    pano.setMotionTrackingEnabled?.(true);
    pano.setMotionTrackingControl?.(false);
  }, [streetViewInstanceRef]);

  const handleClose = () => {
    disableMotion();
    setIsNoteOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!isActive) {
      disableMotion();
      setIsNoteOpen(false);
      return;
    }
    enableMotion();
  }, [isActive, disableMotion, enableMotion]);

  useEffect(
    () => () => {
      disableMotion();
    },
    [disableMotion]
  );

  return (
    <>
      <div className={`streetview-overlay ${isActive ? 'active' : ''}`}>
        <div ref={streetViewRef} className="streetview-canvas" />
        {isActive && (
          <>
            <div className="streetview-ui">
              <button
                className="floating-btn floating-btn--round close-button"
                onClick={handleClose}
                aria-label="Close Street View"
              >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M5 12h14M5 12l6-6M5 12l6 6" />
              </svg>
              </button>
            </div>
            <button
              className="floating-btn floating-btn--round note-button"
              onClick={() => setIsNoteOpen((prev) => !prev)}
            >
              +
            </button>
            {error && <div className="error-banner">{error}</div>}
          </>
        )}
      </div>

      <Note place={activePlace} isOpen={isNoteOpen} onClose={() => setIsNoteOpen(false)} />
      <style jsx>{`
        .streetview-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          background: #000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .streetview-overlay.active {
          opacity: 1;
          pointer-events: auto;
        }
        .streetview-canvas {
          width: 100%;
          height: 100%;
        }
        .streetview-ui {
          position: absolute;
          top: 12px;
          left: 9px;
          display: flex;
          gap: 8px;
          z-index: 25;
          align-items: center;
        }
        .floating-btn {
          border: none;
          background: transparent;
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease;
        }
        .floating-btn--pill {
          padding: 6px 12px;
          font-size: 13px;
          border-radius: 999px;
        }
        .floating-btn--round {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          font-size: 20px;
          line-height: 1;
          padding: 0;
        }
        .close-button {
          width: 35px;
          height: 35px;
          font-size: 20px;
        }
        .floating-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .note-button {
          position: absolute;
          top: 12px;
          right: 12px;
          border: none;
          padding: 8px 12px;
          font-size: 21px;
          color: #fff;
          cursor: pointer;
          z-index: 25;
          background: transparent;
          transition: color 0.2s ease;
        }
        .note-button:hover {
          color: #ffd400;
        }
        .error-banner {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.75);
          color: #fff;
          padding: 12px 18px;
          border-radius: 999px;
          font-size: 14px;
          z-index: 25;
          text-align: center;
        }
        .error-banner + .error-banner {
          bottom: 120px;
        }
        :global(.streetview-canvas .gm-style-cc),
        :global(.streetview-canvas .gm-style-cc *),
        :global(.streetview-canvas .gmnoprint),
        :global(.streetview-canvas .gmnoprint *) {
          display: none !important;
        }
        :global(.streetview-canvas img[alt='Google']),
        :global(.streetview-canvas a[aria-label='Google']),
        :global(.streetview-canvas a[href*='//maps.google.com/maps']) {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `}</style>
    </>
  );
}

