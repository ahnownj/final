import { useCallback, useEffect, useState } from 'react';
import Note from './note';
import useHeadTracking from './hooks/useHeadTracking';

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
  const [headPose, setHeadPose] = useState(null);
  const {
    start: startHeadTracking,
    stop: stopHeadTracking,
    status: headTrackingStatus,
    error: headTrackingError,
  } = useHeadTracking(streetViewInstanceRef, { onPose: setHeadPose });

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
    stopHeadTracking();
    setIsNoteOpen(false);
    onClose();
  };

  useEffect(() => {
    if (!isActive) {
      disableMotion();
      stopHeadTracking();
      setHeadPose(null);
      setIsNoteOpen(false);
      return;
    }
    enableMotion();
  }, [isActive, disableMotion, enableMotion, stopHeadTracking]);

  useEffect(
    () => () => {
      disableMotion();
      stopHeadTracking();
      setHeadPose(null);
    },
    [disableMotion, stopHeadTracking]
  );

  const toggleHeadTracking = () => {
    if (headTrackingStatus === 'running' || headTrackingStatus === 'starting') {
      stopHeadTracking();
      setHeadPose(null);
    } else {
      startHeadTracking();
    }
  };

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
                ✕
              </button>
              <button
                className="floating-btn floating-btn--pill headtrack-button"
                onClick={toggleHeadTracking}
                disabled={headTrackingStatus === 'starting'}
              >
                {headTrackingStatus === 'running' ? '헤드 추적 끄기' : '헤드 추적'}
              </button>
              <div className="headtrack-status-pill">
                {headTrackingStatus === 'running'
                  ? '헤드 추적: 활성'
                  : headTrackingStatus === 'starting'
                  ? '헤드 추적: 준비 중'
                  : '헤드 추적: 꺼짐'}
              </div>
            </div>
            <button
              className="floating-btn floating-btn--round note-button"
              onClick={() => setIsNoteOpen((prev) => !prev)}
            >
              💬
            </button>
            {headTrackingError && <div className="error-banner">{headTrackingError}</div>}
            {error && <div className="error-banner">{error}</div>}
            {(headTrackingStatus === 'running' || headTrackingStatus === 'starting') && (
              <div className="headtrack-visual">
                <div className="headtrack-grid">
                  <div className="headtrack-axis headtrack-axis-x" />
                  <div className="headtrack-axis headtrack-axis-y" />
                  {headPose && (
                  <div
                    className="headtrack-dot"
                    style={{
                      transform: `translate(calc(-50% + ${headPose.yaw}px), calc(-50% - ${headPose.pitch}px))`,
                    }}
                  />
                  )}
                </div>
                <span>
                  {headPose
                    ? `yaw ${headPose.yaw.toFixed(1)}° / pitch ${headPose.pitch.toFixed(1)}°`
                    : '웹캠 초기화 중...'}
                </span>
              </div>
            )}
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
          left: 12px;
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
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          line-height: 1;
          padding: 0;
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
          font-size: 18px;
          color: #fff;
          cursor: pointer;
          z-index: 25;
          background: transparent;
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
          font-size: 13px;
          z-index: 25;
          text-align: center;
        }
        .error-banner + .error-banner {
          bottom: 120px;
        }
        .headtrack-button {
          background: rgba(0, 0, 0, 0.4);
        }
        .headtrack-status-pill {
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.15);
          font-size: 12px;
          color: #fff;
        }
        .headtrack-visual {
          position: absolute;
          bottom: 28px;
          right: 28px;
          width: 160px;
          height: 120px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          pointer-events: none;
        }
        .headtrack-grid {
          position: relative;
          width: 90px;
          height: 90px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 999px;
          overflow: hidden;
        }
        .headtrack-axis {
          position: absolute;
          background: rgba(255, 255, 255, 0.2);
        }
        .headtrack-axis-x {
          left: 0;
          top: 50%;
          width: 100%;
          height: 1px;
        }
        .headtrack-axis-y {
          width: 1px;
          height: 100%;
          left: 50%;
          top: 0;
        }
        .headtrack-dot {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffd400;
          box-shadow: 0 0 8px rgba(255, 212, 0, 0.8);
          transition: transform 0.08s linear;
        }
      `}</style>
    </>
  );
}

