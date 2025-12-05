import { useCallback, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeHeading = (value) => ((value % 360) + 360) % 360;

const loadModules = (() => {
  let loaderPromise = null;
  return () => {
    if (!loaderPromise) {
      loaderPromise = (async () => {
        const tf = await import('@tensorflow/tfjs-core');
        await Promise.all([
          import('@tensorflow/tfjs-backend-webgl'),
          import('@tensorflow/tfjs-backend-cpu'),
          import('@tensorflow/tfjs-converter'),
        ]);
        try {
          await tf.setBackend('webgl');
        } catch (err) {
          console.warn('WebGL backend unavailable, falling back to CPU', err);
          await tf.setBackend('cpu');
        }
        await tf.ready();
        const faceModule = await import('@tensorflow-models/face-landmarks-detection');
        return faceModule;
      })();
    }
    return loaderPromise;
  };
})();

export default function useHeadTracking(streetViewInstanceRef, { onPose } = {}) {
  const detectorRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const isLoopRunningRef = useRef(false);
  const basePovRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | starting | running
  const [error, setError] = useState(null);
  const waitForPano = useCallback(
    () =>
      new Promise((resolve, reject) => {
        const start = performance.now();
        const check = () => {
          if (streetViewInstanceRef?.current) {
            resolve(streetViewInstanceRef.current);
            return;
          }
          if (performance.now() - start > 3000) {
            reject(new Error('스트리트뷰 인스턴스를 찾을 수 없습니다.'));
            return;
          }
          requestAnimationFrame(check);
        };
        check();
      }),
    [streetViewInstanceRef]
  );

  const stop = useCallback(() => {
    isLoopRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    basePovRef.current = null;
    onPose?.(null);
    const pano = streetViewInstanceRef?.current;
    pano?.setMotionTracking?.(true);
    pano?.setMotionTrackingEnabled?.(true);
    setStatus('idle');
  }, [streetViewInstanceRef, onPose]);

  const updatePov = useCallback(
    (face) => {
      const pano = streetViewInstanceRef?.current;
      if (!pano || !face?.keypoints) return;
      if (!basePovRef.current) {
        basePovRef.current = pano.getPov();
      }
      const points = face.keypoints;
      const leftCheek = points[234];
      const rightCheek = points[454];
      const forehead = points[10];
      const chin = points[152];
      if (!leftCheek || !rightCheek || !forehead || !chin) return;
      const yaw = clamp((rightCheek.z - leftCheek.z) * 90, -50, 50);
      const pitchAdj = clamp((forehead.y - chin.y) * -200, -40, 40);
      const { heading, pitch } = basePovRef.current;
      const nextHeading = normalizeHeading(heading + yaw);
      const nextPitch = clamp(pitch + pitchAdj, -60, 60);
      pano.setPov({
        heading: normalizeHeading(heading + yaw),
        pitch: nextPitch,
        zoom: 1,
      });
      onPose?.({ yaw, pitch: nextPitch, heading: nextHeading });
    },
    [streetViewInstanceRef, onPose]
  );

  const renderLoop = useCallback(async () => {
    if (!isLoopRunningRef.current || !detectorRef.current || !videoRef.current) return;
    try {
      if (videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(renderLoop);
        return;
      }
      const faces = await detectorRef.current.estimateFaces(videoRef.current, { flipHorizontal: true });
      if (faces?.length) {
        updatePov(faces[0]);
      }
    } catch (loopError) {
      console.warn('Head tracking loop error', loopError);
    }
    if (!isLoopRunningRef.current) return;
    rafRef.current = requestAnimationFrame(renderLoop);
  }, [updatePov]);

  const start = useCallback(async () => {
    if (!streetViewInstanceRef?.current) return;
    const isSecure =
      typeof window === 'undefined'
        ? false
        : window.isSecureContext || window.location.hostname === 'localhost';
    if (!isSecure) {
      setError('헤드 추적은 HTTPS(또는 localhost)에서만 사용할 수 있습니다.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('이 브라우저는 웹캠을 지원하지 않습니다.');
      return;
    }
    try {
      setError(null);
      setStatus('starting');
      const faceModule = await loadModules();
      const { createDetector, SupportedModels } = faceModule;
      if (!detectorRef.current) {
        detectorRef.current = await createDetector(SupportedModels.MediaPipeFaceMesh, {
          runtime: 'tfjs',
          refineLandmarks: false,
          maxFaces: 1,
        });
      }
      const pano = await waitForPano();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      pano.setMotionTracking?.(false);
      pano.setMotionTrackingEnabled?.(false);
      basePovRef.current = null;

      isLoopRunningRef.current = true;
      setStatus('running');
      rafRef.current = requestAnimationFrame(renderLoop);
    } catch (err) {
      console.error('Head tracking failed', err);
      setError('웹캠을 사용할 수 없습니다.');
      stop();
    }
  }, [renderLoop, stop, streetViewInstanceRef, waitForPano]);

  return {
    start,
    stop,
    status,
    error,
  };
}

