import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import places from '../data/places';
import { GLOBE_SIZE, pushNextGlobeRoute } from './globe';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const rand = (min, max) => min + Math.random() * (max - min);
const MAX_ITEMS = 18;
const LINEAR_DAMPING = 0.985;
const ANGULAR_DAMPING = 0.965;
const COLLISION_ITERATIONS = 2;
const HOVER_SCALE = 3;
const PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23f3f3f3"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial" font-size="24">No image</text></svg>';
const createLetterCluster = (word, clusterId, color = '#ffd400', textColor = '#111') => {
  const letters = word.toUpperCase().split('');
  const count = letters.length;
  const step = 30;
  const curve = 10;
  const size = 30;
  const center = (count - 1) / 2;

  return letters.map((ch, i) => {
    const t = (i - center) / Math.max(count - 1, 1);
    const offsetX = (i - center) * step + rand(-4, 4);
    const offsetY = Math.sin(t * Math.PI) * curve + rand(-2, 2);
    return {
      id: `${clusterId}-${i}`,
      type: 'word-letter',
      label: ch,
      size,
      fontSize: 11,
      textColor,
      color,
      clusterId,
      clusterOffsetX: offsetX,
      clusterOffsetY: offsetY,
    };
  });
};
const extractImageUrl = (rawUrl) => {
  if (!rawUrl) return null;
  const tryDecode = (str) => {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      return str;
    }
  };

  // 1) !6s 구간 추출 후 디코드
  const sixMatch = rawUrl.match(/!6s([^!]+)/);
  if (sixMatch?.[1]) {
    const decoded = tryDecode(sixMatch[1]);
    const lh = decoded.match(/https:\/\/lh[1-6]?\.googleusercontent\.com\/[^\s"'()]+/i);
    if (lh?.[0]) return lh[0];
  }

  // 2) 전체 문자열에서 직접 lh3 패턴 찾기 (디코드/치환)
  const variants = [
    rawUrl,
    tryDecode(rawUrl),
    rawUrl.replace(/%2F/gi, '/').replace(/%3A/gi, ':'),
  ];
  const merged = variants.join(' ');
  const direct = merged.match(/https:\/\/lh[1-6]?\.googleusercontent\.com\/[^\s"'()]+/i);
  return direct?.[0] || null;
};
// NOTE:
// places 데이터의 `!1s...` 값은 Street View Static API의 `pano`로 쓰기엔 맞지 않는 케이스가 많아
// (200 응답이지만 "Sorry, we have no imagery here." 이미지가 내려오는 현상) pano 기반 호출은 사용하지 않습니다.
const pickRandomPlaces = (count) => {
  const withCoords = places.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  // gravity에서는 "실제 썸네일"이 중요하므로 lh3(googleusercontent) 썸네일이 있는 항목을 우선 사용
  const withThumb = withCoords.filter((p) => !!extractImageUrl(p.url));
  const pool = withThumb.length >= count ? withThumb : withCoords;
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
};

const createBodies = (nodes, metas, bounds) => {
  const clusterBases = {};
  const bodies = [];
  nodes.forEach((node, index) => {
    if (!node) return;
    const meta = metas[index] || {};
    const width = meta.width || node.offsetWidth || meta.size || 100;
    const height = meta.height || node.offsetHeight || meta.size || width;
    const size = Math.max(width, height);
    const radius = size / 2;
    const globeX = (bounds.width - width) / 2;
    const globeY = 12;
    const canRotate = !meta.isGlobe; // 글로브만 회전 금지, 나머지는 충돌/속도로 기울어짐 허용
    let x;
    let y;
    if (meta.isGlobe) {
      x = clamp(globeX, 0, Math.max(bounds.width - width, 0));
      y = clamp(globeY, 0, Math.max(bounds.height - height, 0));
    } else if (meta.clusterId) {
      if (!clusterBases[meta.clusterId]) {
        clusterBases[meta.clusterId] = {
          x: rand(24, Math.max(bounds.width - width - 24, 24)),
          y: rand(24, Math.max(bounds.height - height - 24, 24)),
        };
      }
      const base = clusterBases[meta.clusterId];
      x = clamp(base.x + (meta.clusterOffsetX || 0), 0, Math.max(bounds.width - width, 0));
      y = clamp(base.y + (meta.clusterOffsetY || 0), 0, Math.max(bounds.height - height, 0));
    } else {
      x = rand(0, Math.max(bounds.width - width, 0));
      y = rand(0, Math.max(bounds.height - height, 0));
    }
    if (!meta.isGlobe && !meta.clusterId) {
      let attempts = 0;
      while (
        attempts < 120 &&
        bodies.some((body) => {
          const dx = x + radius - (body.x + body.radius);
          const dy = y + radius - (body.y + body.radius);
          return Math.hypot(dx, dy) < radius + body.radius;
        })
      ) {
        x = rand(0, Math.max(bounds.width - width, 0));
        y = rand(0, Math.max(bounds.height - height, 0));
        attempts += 1;
      }
    }
    const angle = meta.isGlobe ? 0 : rand(-0.2, 0.2); // 초기 약간 기울임
    bodies.push({
      node,
      width,
      height,
      size,
      radius,
      x,
      y,
      canRotate,
      isGlobe: !!meta.isGlobe,
      vx: 0,
      vy: 0,
      angle,
      av: 0, // 초기 자동 회전 제거
    });
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
  } else if (body.x + body.width > bounds.width) {
    body.x = bounds.width - body.width;
    body.vx *= -0.35;
  }

  if (body.y < 0) {
    body.y = 0;
    body.vy *= -0.35;
  } else if (body.y + body.height > bounds.height) {
    body.y = bounds.height - body.height;
    body.vy *= -0.35;
  }
};

const resolveCollisions = (bodies, iterations = 4) => {
  for (let iter = 0; iter < iterations; iter += 1) {
    let adjusted = false;
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
          a.vx += impulse * nx * 0.04;
          a.vy += impulse * ny * 0.04;
          b.vx -= impulse * nx * 0.04;
          b.vy -= impulse * ny * 0.04;

          // 접선 방향 상대 속도로 회전 모멘트 부여 (빙글빙글 방지용 작은 계수)
          const tx = -ny;
          const ty = nx;
          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const tangential = relVx * tx + relVy * ty;
          const spin = tangential * 0.0008;
          if (a.canRotate && !a.isGlobe) a.av += spin;
          if (b.canRotate && !b.isGlobe) b.av -= spin;
          adjusted = true;
        }
      }
    }
    if (!adjusted) break;
  }
};

const renderBodies = (bodies) => {
  bodies.forEach((body) => {
    body.node.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) rotate(${body.angle}rad)`;
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
    const desiredCount = Math.min(MAX_ITEMS, maxItems);
    const count = Math.max(2, Math.min(desiredCount, Math.floor(Math.random() * 29) + 2));
    const selected = pickRandomPlaces(count);
    const placesWithThumbs = selected.map((place, idx) => {
      const lh3Direct = extractImageUrl(place.url);
      const streetViewLocUrl =
        key &&
        // pitch: 음수로 약간 아래(-10도) 시점을 바라보게 조정
        `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${place.lat},${place.lng}&radius=50000&fov=90&pitch=-45&key=${key}`;

      // 우선순위:
      // 1) lh3 (있으면 사용)
      // 2) StreetView (location 기반)
      const candidates = [lh3Direct, streetViewLocUrl].filter(Boolean);
      const url = candidates[0] || PLACEHOLDER;
      const fallbacks = candidates.slice(1);
      if (!fallbacks.includes(PLACEHOLDER)) fallbacks.push(PLACEHOLDER);

      return {
        id: `${place.lat}-${place.lng}-${idx}`,
        lat: place.lat,
        lng: place.lng,
        label: place.place || place.user || 'Unknown',
        size: 80 + Math.random() * 60,
        url,
        fallbacks,
      };
    });

    const yellow = '#ffd400';
    const black = '#111';
    const wordClusters = [
      ...createLetterCluster('world', 'cluster-world', yellow, black),
      ...createLetterCluster('without', 'cluster-without', yellow, black),
      ...createLetterCluster('words', 'cluster-words', yellow, black),
    ];

    setItems([
      ...wordClusters,
      { id: 'globe-home', isGlobe: true, size: GLOBE_SIZE, label: 'home' },
      ...placesWithThumbs,
    ]);
    const angle = Math.random() * Math.PI * 2;
    const magnitude = 18 + Math.random() * 18;
    gravityRef.current = { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
  }, [isMounted, key, maxItems]);

  useEffect(() => {
    const container = containerRef.current;
    const nodes = itemRefs.current.slice(0, items.length);
    if (!container || nodes.length === 0) return undefined;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let bounds = container.getBoundingClientRect();
    const bodies = createBodies(nodes, items, bounds);
    renderBodies(bodies);

    let raf = null;
    let last = performance.now();

    const step = (time) => {
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      const dragState = dragRef.current;

      bodies.forEach((body, idx) => {
        if (dragState.index === idx) {
          const nextX = clamp(dragState.targetX, 0, bounds.width - body.width);
          const nextY = clamp(dragState.targetY, 0, bounds.height - body.height);
          const dx = nextX - body.x;
          const dy = nextY - body.y;
          body.x = nextX;
          body.y = nextY;
          if (body.canRotate) {
            const dragAngle = dx === 0 && dy === 0 ? body.angle : Math.atan2(dy, dx);
            rotateToward(body, dragAngle, 0.5);
          } else {
            body.angle = 0;
          }
          body.vx = dx / Math.max(dt, 0.016);
          body.vy = dy / Math.max(dt, 0.016);
          body.av = 0; // 드래그 시 각속도 리셋
        } else {
          body.vx += gravityRef.current.x * dt;
          body.vy += gravityRef.current.y * dt;
          body.x += body.vx * dt;
          body.y += body.vy * dt;
          // 속도 감쇠로 자연스럽게 멈추도록 처리
          body.vx *= LINEAR_DAMPING;
          body.vy *= LINEAR_DAMPING;
          if (body.isGlobe) {
            body.angle = 0;
            body.av = 0;
          } else if (body.canRotate) {
            const speed = Math.hypot(body.vx, body.vy);
            const targetAngle = speed > 2 ? Math.atan2(body.vy, body.vx) : 0;
            rotateToward(body, targetAngle, 0.06);
          }
        }

        // 각속도 감쇠 및 적용
        body.av *= ANGULAR_DAMPING;
        body.av = clamp(body.av, -2.5, 2.5); // 과도한 스핀 방지
        body.angle += body.av * dt;

        applyBounds(body, bounds);
      });

      resolveCollisions(bodies, COLLISION_ITERATIONS);
      renderBodies(bodies);
      raf = requestAnimationFrame(step);
    };

    const handleResize = () => {
      bounds = container.getBoundingClientRect();
      bodies.forEach((body) => applyBounds(body, bounds));
      renderBodies(bodies);
    };

    const startLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame((time) => {
        last = time;
        step(time);
      });
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        return;
      }
      last = performance.now();
      startLoop();
    };

    if (!reduceMotion) {
      startLoop();
      document.addEventListener('visibilitychange', handleVisibility);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      if (!reduceMotion) {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [items]);

  const startDrag = (event, index, item) => {
    event.preventDefault();
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
    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerUp, { passive: false });
    window.addEventListener('pointerleave', handlePointerUp, { passive: false });
  };

  const onDragMove = (event) => {
    event.preventDefault();
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

  const handlePointerUp = (event) => {
    event?.preventDefault();
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
    window.removeEventListener('pointerleave', handlePointerUp);
    const state = dragRef.current;
    const item = state.activeItem;
    const wasMoved = state.moved;
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
    if (!wasMoved && item) {
      if (item.isGlobe) {
        pushNextGlobeRoute(router);
        return;
      }

      // 노란색 WORLD WITHOUT WORDS 글자들은 클릭 시 라우팅하지 않음
      if (item.type === 'word-letter') return;

      if (item.type !== 'word' && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
        router.push(`/map?lat=${item.lat}&lng=${item.lng}`);
      }
    }
  };

  const handleImageError = (event, fallbacks = []) => {
    const img = event?.target;
    if (!img) return;
    const index = Number(img.dataset.fbIndex || 0);
    if (index < fallbacks.length) {
      img.dataset.fbIndex = index + 1;
      img.src = fallbacks[index];
      return;
    }
    img.onerror = null;
    img.src = PLACEHOLDER;
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
          className={`gravity-card${item.isGlobe ? ' globe' : ''}${
            item.type === 'word' ? ' word' : ''
          }${item.type === 'word-letter' ? ' word-letter' : ''}`}
          style={{
            width: item.width || item.size,
            height: item.height || item.size,
            borderRadius: item.type === 'word' ? 0 : '50%',
          }}
          onPointerDown={(event) => startDrag(event, index, item)}
          onDragStart={(event) => event.preventDefault()}
        >
          {item.isGlobe ? (
            <img
              src="/Globe.jpg"
              alt="home globe"
              className="globe-icon"
              draggable={false}
              decoding="async"
            />
          ) : item.type === 'word-letter' ? (
            <span
              className="letter-label"
              style={{
                fontSize: item.fontSize || 12,
                color: item.textColor || '#111',
                backgroundColor: item.color || '#ffd400',
              }}
            >
              {item.label}
            </span>
          ) : item.url ? (
            <img
              src={item.url}
              alt={item.label || 'place thumbnail'}
              loading="lazy"
              decoding="async"
              onError={(e) => handleImageError(e, item.fallbacks)}
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
          cursor: pointer;
          overflow: hidden;
          touch-action: none;
          border-radius: 50%;
          background: transparent;
          outline: none;
          appearance: none;
          will-change: transform;
          transform: translateZ(0);
        }
        .gravity-card img,
        .letter-label {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: inherit;
        }
        .gravity-card img {
          object-fit: cover;
          transform: scale(1);
          transform-origin: center;
          transition: transform 0.45s ease;
          user-select: none;
          -webkit-user-drag: none;
        }
        .gravity-card:not(.globe):hover img {
          transform: scale(${HOVER_SCALE});
        }
        .gravity-card.globe img {
          transform: scale(1);
        }
        .globe-icon {
          object-fit: contain;
        }
        .gravity-card:focus-visible {
          outline: 1px solid #666;
          outline-offset: 2px;
        }
        .letter-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #ffd400;
          color: #111;
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 500;
          letter-spacing: 0;
          text-transform: uppercase;
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}

