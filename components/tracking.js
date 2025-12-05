import { useEffect, useRef, useState } from 'react';

const DEFAULTS = {
  cellSize: 24,
  trail: 0.08,
  color: '#ffd400',
  brightnessPower: 1.6,
  mirror: true,
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export default function TrackingCanvas(props = {}) {
  const options = { ...DEFAULTS, ...props };
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('이 브라우저는 웹캠을 지원하지 않습니다.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        if (cancelled) return;
        videoRef.current = video;

        sampleCanvasRef.current = document.createElement('canvas');
        renderFrame();
      } catch (err) {
        console.error('웹캠 초기화 실패:', err);
        setError('웹캠을 사용할 수 없습니다.');
      }
    };

    const renderFrame = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const sampleCanvas = sampleCanvasRef.current;
      if (!canvas || !video || !sampleCanvas) return;

      const ctx = canvas.getContext('2d');
      const sampleCtx = sampleCanvas.getContext('2d');
      const { cellSize, trail, brightnessPower, mirror, color } = options;

      const cols = Math.max(4, Math.floor(canvas.width / cellSize));
      const rows = Math.max(4, Math.floor(canvas.height / cellSize));
      sampleCanvas.width = cols;
      sampleCanvas.height = rows;

      ctx.fillStyle = `rgba(0,0,0,${trail})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      sampleCtx.save();
      if (mirror) {
        sampleCtx.translate(cols, 0);
        sampleCtx.scale(-1, 1);
      }
      sampleCtx.drawImage(video, 0, 0, cols, rows);
      sampleCtx.restore();

      const pixels = sampleCtx.getImageData(0, 0, cols, rows).data;
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const idx = (y * cols + x) * 4;
          const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / (3 * 255);
          const energy = Math.pow(clamp01(brightness), brightnessPower);
          if (energy < 0.05) continue;

          const radius = energy * cellSize * 0.85;
          const alpha = clamp01(energy + 0.2);
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(color, alpha);
          ctx.arc(
            x * cellSize + cellSize / 2,
            y * cellSize + cellSize / 2,
            radius,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [options.cellSize, options.trail, options.brightnessPower, options.color, options.mirror]);

  return (
    <div className="tracking-root">
      <canvas ref={canvasRef} width={640} height={480} />
      {error && <p className="error">{error}</p>}
      <style jsx>{`
        .tracking-root {
          width: min(640px, 100%);
          margin: 0 auto;
        }
        canvas {
          width: 100%;
          height: auto;
          display: block;
          background: #000;
        }
        .error {
          margin-top: 12px;
          text-align: center;
          color: #ff6b6b;
        }
      `}</style>
    </div>
  );
}

const hexToRgba = (hex, alpha = 1) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

