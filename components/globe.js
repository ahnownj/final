import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

export const GLOBE_SIZE = 40;
const ROUTE_SEQUENCE = ['/gravity', '/', '/map'];
const EDGE_PADDING = 12;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const normalizePath = (path) => {
  if (typeof path !== 'string' || path.length === 0) return '/';
  const [clean] = path.split('?');
  return clean || '/';
};

export const getNextGlobeRoute = (path) => {
  const normalized = normalizePath(path);
  const idx = ROUTE_SEQUENCE.indexOf(normalized);
  if (idx === -1) return ROUTE_SEQUENCE[0];
  return ROUTE_SEQUENCE[(idx + 1) % ROUTE_SEQUENCE.length];
};

export const shouldHideGlobe = (path) => normalizePath(path) === '/gravity';

const randomDrift = () => {
  const angle = Math.random() * Math.PI * 2;
  const magnitude = 18 + Math.random() * 18;
  return {
    x: Math.cos(angle) * magnitude,
    y: Math.sin(angle) * magnitude,
  };
};

export default function GlobeOverlay() {
  const router = useRouter();
  const ballRef = useRef(null);
  const rafRef = useRef(null);
  const driftRef = useRef(randomDrift());
  const stateRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    moved: false,
    last: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerTime: 0,
  });

  useEffect(() => {
    driftRef.current = randomDrift();
  }, [router.asPath]);

  useEffect(() => {
    if (shouldHideGlobe(router.asPath)) return undefined;
    const node = ballRef.current;
    if (!node) return undefined;

    const state = stateRef.current;
    state.x = window.innerWidth / 2 - GLOBE_SIZE / 2;
    state.y = EDGE_PADDING;
    state.vx = 0;
    state.vy = 0;
    state.last = 0;

    const animate = (time) => {
      if (!state.last) state.last = time;
      const dt = Math.min((time - state.last) / 1000, 0.05);
      state.last = time;

      if (!state.dragging) {
        state.vx += driftRef.current.x * dt;
        state.vy += driftRef.current.y * dt;
        state.x += state.vx * dt;
        state.y += state.vy * dt;
        state.vx *= 0.98;
        state.vy *= 0.98;
      }

      const maxX = window.innerWidth - GLOBE_SIZE - EDGE_PADDING;
      const maxY = window.innerHeight - GLOBE_SIZE - EDGE_PADDING;

      if (state.x < EDGE_PADDING) {
        state.x = EDGE_PADDING;
        state.vx *= -0.6;
      } else if (state.x > maxX) {
        state.x = maxX;
        state.vx *= -0.6;
      }

      if (state.y < EDGE_PADDING) {
        state.y = EDGE_PADDING;
        state.vy *= -0.6;
      } else if (state.y > maxY) {
        state.y = maxY;
        state.vy *= -0.6;
      }

      node.style.transform = `translate(${state.x}px, ${state.y}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      const maxX = window.innerWidth - GLOBE_SIZE - EDGE_PADDING;
      const maxY = window.innerHeight - GLOBE_SIZE - EDGE_PADDING;
      state.x = clamp(state.x, EDGE_PADDING, maxX);
      state.y = clamp(state.y, EDGE_PADDING, maxY);
      if (ballRef.current) {
        ballRef.current.style.transform = `translate(${state.x}px, ${state.y}px)`;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [router.asPath]);

  const handlePointerMove = (event) => {
    const state = stateRef.current;
    if (!state.dragging || !ballRef.current) return;
    const maxX = window.innerWidth - GLOBE_SIZE - EDGE_PADDING;
    const maxY = window.innerHeight - GLOBE_SIZE - EDGE_PADDING;
    state.x = clamp(event.clientX - state.offsetX, EDGE_PADDING, maxX);
    state.y = clamp(event.clientY - state.offsetY, EDGE_PADDING, maxY);
    state.moved = true;
    const now = performance.now();
    if (state.lastPointerTime) {
      const dt = Math.max((now - state.lastPointerTime) / 1000, 0.016);
      state.vx = (event.clientX - state.lastPointerX) / dt;
      state.vy = (event.clientY - state.lastPointerY) / dt;
    }
    state.lastPointerX = event.clientX;
    state.lastPointerY = event.clientY;
    state.lastPointerTime = now;
    ballRef.current.style.transform = `translate(${state.x}px, ${state.y}px)`;
  };

  const handlePointerUp = () => {
    const state = stateRef.current;
    if (!state.dragging) return;
    window.removeEventListener('pointermove', handlePointerMove);
    state.dragging = false;
    state.lastPointerTime = 0;
    if (!state.moved) {
      router.push(getNextGlobeRoute(router.asPath));
    }
  };

  const handlePointerDown = (event) => {
    if (shouldHideGlobe(router.asPath) || !ballRef.current) return;
    const state = stateRef.current;
    state.dragging = true;
    state.moved = false;
    const rect = ballRef.current.getBoundingClientRect();
    state.offsetX = event.clientX - rect.left;
    state.offsetY = event.clientY - rect.top;
    state.vx = 0;
    state.vy = 0;
    state.lastPointerX = event.clientX;
    state.lastPointerY = event.clientY;
    state.lastPointerTime = performance.now();
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    },
    []
  );

  if (shouldHideGlobe(router.asPath)) return null;

  return (
    <>
      <button
        type="button"
        className="globe-overlay"
        ref={ballRef}
        aria-label="Navigate with globe"
        onPointerDown={handlePointerDown}
      >
        <img src="/globe.svg" alt="Globe" draggable={false} />
      </button>
      <style jsx>{`
        .globe-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: ${GLOBE_SIZE}px;
          height: ${GLOBE_SIZE}px;
          border: none;
          padding: 0;
          border-radius: 50%;
          background: transparent;
          cursor: grab;
          z-index: 1500;
        }
        .globe-overlay:active {
          cursor: grabbing;
        }
        .globe-overlay img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}

