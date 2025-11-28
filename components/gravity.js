import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import places from '../data/places';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const rand = (min, max) => min + Math.random() * (max - min);

const pickRandomPlaces = (count) => {
  const filtered = places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  for (let i = filtered.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  return filtered.slice(0, count);
};

const createBodies = (nodes, bounds) => {
  const bodies = [];
  nodes.forEach((node) => {
    if (!node) return;
    const size = node.offsetWidth || 100;
    const radius = size / 2;
    let x = rand(0, Math.max(bounds.width - size, 0));
    let y = rand(0, Math.max(bounds.height - size, 0));
    let attempts = 0;
    while (
      attempts < 80 &&
      bodies.some((body) => {
        const dx = x + radius - (body.x + body.radius);
        const dy = y + radius - (body.y + body.radius);
        return Math.hypot(dx, dy) < radius + body.radius + 4;
      })
    ) {
      x = rand(0, Math.max(bounds.width - size, 0));
      y = rand(0, Math.max(bounds.height - size, 0));
      attempts += 1;
    }
    bodies.push({ node, size, radius, x, y, vx: 0, vy: 0, angle: 0 });
  });
  return bodies;
};

const rotateToward = (body, target, rate = 0.2) => {
  if (!Number.isFinite(target)) return;
  body.angle += (target - body.angle) * rate;
};

const applyBounds = (body, bounds) => {
  if (body.x < 0) {
    body.x = 0;
    body.vx *= -0.35;
  } else if (body.x + body.size > bounds.width) {
    body.x = bounds.width - body.size;
    body.vx *= -0.35;
  }

  if (body.y < 0) {
    body.y = 0;
    body.vy *= -0.35;
  } else if (body.y + body.size > bounds.height) {
    body.y = bounds.height - body.size;
    body.vy *= -0.35;
  }
};

const resolveCollisions = (bodies) => {
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = a.x + a.radius - (b.x + b.radius);
      const dy = a.y + a.radius - (b.y + b.radius);
      const distance = Math.hypot(dx, dy) || 0.0001;
      const overlap = a.radius + b.radius - distance;
      if (overlap > 0) {
        const nx = dx / distance;
        const ny = dy / distance;
        const shift = overlap / 2;
        a.x += nx * shift;
        a.y += ny * shift;
        b.x -= nx * shift;
        b.y -= ny * shift;

        const impulse = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        a.vx += impulse * nx * 0.05;
        a.vy += impulse * ny * 0.05;
        b.vx -= impulse * nx * 0.05;
        b.vy -= impulse * ny * 0.05;
      }
    }
  }
};

const renderBodies = (bodies) => {
  bodies.forEach((body) => {
    body.node.style.transform = `translate(${body.x}px, ${body.y}px) rotate(${body.angle}rad)`;
  });
};

export default function GravityField({ maxItems = 30 }) {
  const router = useRouter();
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const dragRef = useRef({
    index: null,
    offsetX: 0,
    offsetY: 0,
    targetX: 0,
    targetY: 0,
    moved: false,
    startX: 0,
    startY: 0,
    activeItem: null,
  });
  const gravityRef = useRef({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const [items, setItems] = useState([]);
  const key = process.env.NEXT_PUBLIC_GOOGLE_KEY;

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    const count = Math.max(2, Math.min(maxItems, Math.floor(Math.random() * 29) + 2));
    const selected = pickRandomPlaces(count);
    setItems(
      selected.map((place, idx) => ({
        id: `${place.lat}-${place.lng}-${idx}`,
        lat: place.lat,
        lng: place.lng,
        label: place.place || place.user || 'Unknown',
        size: 80 + Math.random() * 60,
        url: key
          ? `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${place.lat},${place.lng}&fov=90&key=${key}`
          : null,
      }))
    );
    const angle = Math.random() * Math.PI * 2;
    const magnitude = 18 + Math.random() * 18;
    gravityRef.current = { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
  }, [isMounted, key, maxItems]);

  useEffect(() => {
    const container = containerRef.current;
    const nodes = itemRefs.current.slice(0, items.length);
    if (!container || nodes.length === 0) return undefined;

    let bounds = container.getBoundingClientRect();
    const bodies = createBodies(nodes, bounds);
    renderBodies(bodies);

    let raf = null;
    let last = performance.now();

    const step = (time) => {
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      const dragState = dragRef.current;

      bodies.forEach((body, idx) => {
        if (dragState.index === idx) {
          const nextX = clamp(dragState.targetX, 0, bounds.width - body.size);
          const nextY = clamp(dragState.targetY, 0, bounds.height - body.size);
          const dx = nextX - body.x;
          const dy = nextY - body.y;
          body.x = nextX;
          body.y = nextY;
          const dragAngle = dx === 0 && dy === 0 ? null : Math.atan2(dy, dx);
          rotateToward(body, dragAngle, 0.5);
          body.vx = dx / Math.max(dt, 0.016);
          body.vy = dy / Math.max(dt, 0.016);
        } else {
          body.vx += gravityRef.current.x * dt;
          body.vy += gravityRef.current.y * dt;
          body.x += body.vx * dt;
          body.y += body.vy * dt;
          rotateToward(body, 0, 0.1);
        }
        applyBounds(body, bounds);
      });

      resolveCollisions(bodies);
      renderBodies(bodies);
      raf = requestAnimationFrame(step);
    };

    const handleResize = () => {
      bounds = container.getBoundingClientRect();
    };

    raf = requestAnimationFrame((time) => {
      last = time;
      step(time);
    });
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, [items]);

  const startDrag = (event, index, item) => {
    const node = itemRefs.current[index];
    if (!node || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      index,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      targetX: rect.left - bounds.left,
      targetY: rect.top - bounds.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      activeItem: item,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  };

  const onDragMove = (event) => {
    const state = dragRef.current;
    if (state.index === null || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    state.targetX = event.clientX - bounds.left - state.offsetX;
    state.targetY = event.clientY - bounds.top - state.offsetY;
    if (!state.moved) {
      const moved = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
      if (moved > 6) state.moved = true;
    }
  };

  const handlePointerUp = () => {
    window.removeEventListener('pointermove', onDragMove);
    const state = dragRef.current;
    const shouldNavigate = !state.moved && state.activeItem;
    const item = state.activeItem;
    dragRef.current = {
      index: null,
      offsetX: 0,
      offsetY: 0,
      targetX: 0,
      targetY: 0,
      moved: false,
      startX: 0,
      startY: 0,
      activeItem: null,
    };
    if (shouldNavigate && item) {
      router.push(`/map?lat=${item.lat}&lng=${item.lng}`);
    }
  };

  const handleImageError = (index) => {
    const node = itemRefs.current[index];
    if (node) node.style.display = 'none';
  };

  if (!isMounted) return null;

  return (
    <div className="gravity-field" ref={containerRef}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          className="gravity-card"
          style={{ width: item.size, height: item.size }}
          onPointerDown={(event) => startDrag(event, index, item)}
          onDragStart={(event) => event.preventDefault()}
        >
          {item.url ? (
            <img
              src={item.url}
              alt={item.label || 'place thumbnail'}
              loading="lazy"
              onError={() => handleImageError(index)}
            />
          ) : (
            <span>{item.label}</span>
          )}
        </button>
      ))}

      <style jsx>{`
        .gravity-field {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }
        .gravity-card {
          position: absolute;
          border: none;
          padding: 0;
          background: transparent;
          cursor: pointer;
          overflow: hidden;
          touch-action: none;
          border-radius: 50%;
        }
        .gravity-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          border-radius: inherit;
        }
        .gravity-card span {
          display: block;
          width: 100%;
          height: 100%;
          background: #efefef;
          color: #111;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: inherit;
        }
        .gravity-card:focus-visible {
          outline: 1px solid #666;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

