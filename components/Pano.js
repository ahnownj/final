import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Note from './note';

export default function Pano({
  streetViewRef,
  streetViewInstanceRef,
  isActive,
  onClose,
  error,
  activePlace,
}) {
  const router = useRouter();
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [needsPermissionTap, setNeedsPermissionTap] = useState(false);
  const [motionError, setMotionError] = useState(null);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const orientationHandlerRef = useRef(null);
  const orientationEventsRef = useRef([]);
  const orientationWatchdogRef = useRef(null);
  const orientationActiveRef = useRef(false);

  const handleOrientation = useCallback(
    (event) => {
      orientationActiveRef.current = true;
      if (!streetViewInstanceRef?.current) return;
      const heading =
        typeof event.webkitCompassHeading === 'number'
          ? 360 - event.webkitCompassHeading
          : event.alpha ?? event.absolute ?? 0;
      const pitchRaw = event.beta ?? 0;
      const pitch = Math.max(-90, Math.min(90, pitchRaw - 90));
      streetViewInstanceRef.current.setPov({ heading, pitch, zoom: 1 });
    },
    [streetViewInstanceRef]
  );

  const clearWatchdog = useCallback(() => {
    if (orientationWatchdogRef.current) {
      clearTimeout(orientationWatchdogRef.current);
      orientationWatchdogRef.current = null;
    }
  }, []);

  const removeOrientationListeners = useCallback(() => {
    if (typeof window === 'undefined') return;
    orientationEventsRef.current.forEach((eventName) =>
      window.removeEventListener(eventName, handleOrientation, true)
    );
    orientationEventsRef.current = [];
  }, [handleOrientation]);

  const disableMotion = useCallback(() => {
    if (typeof window !== 'undefined') {
      removeOrientationListeners();
      orientationHandlerRef.current = null;
    }
    clearWatchdog();
    setMotionEnabled(false);
  }, [clearWatchdog, removeOrientationListeners]);

  const enableMotion = useCallback(async () => {
    if (typeof window === 'undefined' || !streetViewInstanceRef?.current) return;
    try {
      const hasIOSPermissionAPI =
        typeof window.DeviceOrientationEvent !== 'undefined' &&
        typeof window.DeviceOrientationEvent.requestPermission === 'function';
      if (hasIOSPermissionAPI) {
        const permission = await window.DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          setMotionError('모션 센서 접근이 거부되었습니다.');
          return;
        }
      }
      const events = ['deviceorientation'];
      if ('ondeviceorientationabsolute' in window) {
        events.push('deviceorientationabsolute');
      }
      events.forEach((eventName) => window.addEventListener(eventName, handleOrientation, true));
      orientationEventsRef.current = events;
      orientationHandlerRef.current = handleOrientation;
      orientationActiveRef.current = false;
      clearWatchdog();
      orientationWatchdogRef.current = setTimeout(() => {
        if (!orientationActiveRef.current) {
          setMotionError('이 장치는 모션 센서를 제공하지 않습니다.');
          disableMotion();
        }
      }, 2500);
      setMotionEnabled(true);
      setMotionError(null);
    } catch (err) {
      console.error('Failed to enable motion controls', err);
      setMotionError('모션 센서를 사용할 수 없습니다.');
    }
  }, [clearWatchdog, disableMotion, handleOrientation, streetViewInstanceRef]);

  const handleClose = () => {
    disableMotion();
    setIsNoteOpen(false);
    onClose();
  };

  const openWorldView = () => {
    const target = activePlace || streetViewInstanceRef?.current?.getPosition();
    if (!target) return;
    const lat = target.lat || (typeof target.lat === 'function' ? target.lat() : null);
    const lng = target.lng || (typeof target.lng === 'function' ? target.lng() : null);
    if (lat === null || lng === null) return;
    router.push(`/world?lat=${lat}&lng=${lng}`);
  };

  useEffect(() => {
    if (!isActive) {
      disableMotion();
      setIsNoteOpen(false);
      return;
    }

    if (
      typeof window !== 'undefined' &&
      typeof window.DeviceOrientationEvent !== 'undefined' &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function'
    ) {
      setNeedsPermissionTap(true);
    } else {
      setNeedsPermissionTap(false);
      enableMotion();
    }
  }, [isActive, disableMotion, enableMotion]);

  useEffect(
    () => () => {
      clearWatchdog();
      disableMotion();
    },
    [clearWatchdog, disableMotion]
  );

  return (
    <>
      <div className={`streetview-overlay ${isActive ? 'active' : ''}`}>
        <div ref={streetViewRef} className="streetview-canvas" />
        {isActive && (
          <>
            <div className="streetview-ui">
              <button className="close-button" onClick={handleClose} aria-label="Close Street View">
                ✕
              </button>
              {needsPermissionTap && !motionEnabled && (
                <button className="motion-button" onClick={enableMotion}>
                  모션 켜기
                </button>
              )}
              <button className="world-button" onClick={openWorldView} disabled={!activePlace}>
                3D
              </button>
            </div>
            <button className="note-button" onClick={() => setIsNoteOpen((prev) => !prev)}>
              💬
            </button>
            {motionError && <div className="error-banner">{motionError}</div>}
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
          left: 12px;
          display: flex;
          gap: 8px;
          z-index: 25;
          align-items: center;
        }
        .streetview-ui button {
          border: none;
          padding: 8px 14px;
          font-size: 13px;
          color: #fff;
          cursor: pointer;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 999px;
        }
        .close-button {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 18px;
          line-height: 1;
          padding: 0;
        }
        .world-button {
          border: none;
          padding: 8px 12px;
          font-size: 12px;
          color: #000;
          background: #ffd400;
          border-radius: 999px;
          cursor: pointer;
        }
        .world-button:disabled {
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
          background: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
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
      `}</style>
    </>
  );
}

