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
  const [motionError, setMotionError] = useState(null);
  const [hasMotionCapability, setHasMotionCapability] = useState(true);

  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const orientationHandlerRef = useRef(null);
  const sensorTimeoutRef = useRef(null);
  const lastPovRef = useRef({ heading: 0, pitch: 0 });

  const clampPitch = (value) => Math.max(-90, Math.min(90, value));
  const normalizeHeading = (value) => ((value % 360) + 360) % 360;

  const clearSensorTimeout = useCallback(() => {
    if (sensorTimeoutRef.current) {
      clearTimeout(sensorTimeoutRef.current);
      sensorTimeoutRef.current = null;
    }
  }, []);

  const handleOrientation = useCallback(
    (event) => {
      if (!streetViewInstanceRef?.current) return;
      clearSensorTimeout();

      const webkitHeading = Number.isFinite(event.webkitCompassHeading)
        ? event.webkitCompassHeading
        : null;
      const alphaHeading = Number.isFinite(event.alpha) ? event.alpha : null;
      const heading = normalizeHeading(
        webkitHeading ?? alphaHeading ?? lastPovRef.current.heading
      );

      const beta = Number.isFinite(event.beta) ? event.beta : lastPovRef.current.pitch + 90;
      const pitch = clampPitch(beta - 90);

      lastPovRef.current = { heading, pitch };
      streetViewInstanceRef.current.setPov({ heading, pitch, zoom: 1 });
    },
    [clearSensorTimeout, streetViewInstanceRef]
  );

  const disableMotion = useCallback(() => {
    if (typeof window !== 'undefined' && orientationHandlerRef.current) {
      window.removeEventListener('deviceorientation', orientationHandlerRef.current, true);
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', orientationHandlerRef.current, true);
      }
      orientationHandlerRef.current = null;
    }
    clearSensorTimeout();
    setMotionEnabled(false);
  }, [clearSensorTimeout]);

  const enableMotion = useCallback(async () => {
    if (typeof window === 'undefined' || !streetViewInstanceRef?.current) return;
    try {
      if (!window.isSecureContext) {
        setMotionError('모션 센서는 HTTPS(또는 localhost) 환경에서만 동작합니다.');
        setHasMotionCapability(false);
        return;
      }
      if (typeof window.DeviceOrientationEvent === 'undefined') {
        setMotionError('이 장치는 모션 센서를 제공하지 않습니다.');
        setHasMotionCapability(false);
        return;
      }

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

      window.addEventListener('deviceorientation', handleOrientation, true);
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      }

      orientationHandlerRef.current = handleOrientation;
      clearSensorTimeout();
      sensorTimeoutRef.current = window.setTimeout(() => {
        sensorTimeoutRef.current = null;
        disableMotion();
        setHasMotionCapability(false);
        setMotionError('이 기기에서는 모션 센서 데이터를 받을 수 없습니다.');
      }, 2500);
      setMotionEnabled(true);
      setHasMotionCapability(true);
      setMotionError(null);
    } catch (err) {
      console.error('Failed to enable motion controls', err);
      setMotionError('모션 센서를 사용할 수 없습니다.');
    }
  }, [clearSensorTimeout, disableMotion, handleOrientation, streetViewInstanceRef]);

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
    if (typeof window !== 'undefined') {
      const supported = typeof window.DeviceOrientationEvent !== 'undefined';
      setHasMotionCapability(supported);
      if (!supported) {
        setMotionError('이 장치는 모션 센서를 제공하지 않습니다.');
      }
    }
  }, [isActive, disableMotion]);

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
                ✕
              </button>
              {!motionEnabled && hasMotionCapability && (
                <button className="floating-btn floating-btn--pill motion-button" onClick={enableMotion}>
                  모션 켜기
                </button>
              )}
              <button
                className="floating-btn floating-btn--pill world-button"
                onClick={openWorldView}
                disabled={!activePlace}
              >
                3D
              </button>
            </div>
            <button
              className="floating-btn floating-btn--round note-button"
              onClick={() => setIsNoteOpen((prev) => !prev)}
            >
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
      `}</style>
    </>
  );
}

