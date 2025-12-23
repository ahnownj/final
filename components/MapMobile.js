import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import places from '../data/places';
import Pano from './Pano';
import { loadGoogleMaps } from '../lib/googleMaps';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const MAP_ZOOM_LIMITS = { min: 1, max: 18 };
const RANDOM_OFFSET_DEGREES = 0.18;
const DETAIL_ZOOM = 10;
const OVERVIEW_ZOOM = 2;
// 드리프트를 초당 픽셀 속도로 부드럽게 이동
const DRIFT_SPEED_PX_PER_SEC = 8; // 조금 더 천천히
const DRIFT_IDLE_DELAY = 6000; // 사용자 상호작용 후 드리프트 재개까지 대기
const MARKER_APPEAR_ZOOM = 6;
const MARKER_FULL_ZOOM = 12;
const MARKER_BASE_SCALE = 4;

const clampLat = (lat) => Math.max(-85, Math.min(85, lat));
const normalizeLng = (lng) => (((lng + 180) % 360 + 360) % 360) - 180;
const jitter = (value) => value + (Math.random() - 0.5) * RANDOM_OFFSET_DEGREES * 2;

export default function MapMobile() {
  const router = useRouter();
  const mapRef = useRef(null);
  const streetViewRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const streetViewInstanceRef = useRef(null);
  const streetViewServiceRef = useRef(null);
  const googleRef = useRef(null);
  const driftRafRef = useRef(null);
  const driftAccumRef = useRef({ x: 0, y: 0 });
  const driftLastTsRef = useRef(0);
  const driftResumeTimerRef = useRef(null);
  const streetViewOpenRef = useRef(false);
  const markerRefs = useRef([]);
  const blinkOpacityRef = useRef(1);
  const lastZoomRef = useRef(null);
  const lastBlinkRef = useRef(1);

  const [activePlace, setActivePlace] = useState(null);
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const [error, setError] = useState(null);

  const validPlaces = useMemo(
    () =>
      places
        .filter((p) => p && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng)))
        .map((p, i) => ({
          id: i,
          lat: parseFloat(p.lat),
          lng: parseFloat(p.lng),
          user: p.user || '',
          place: p.place || '',
          date: p.date || '',
          url: p.url || '',
        })),
    []
  );

  const pickRandomCenter = useCallback(() => {
    if (!validPlaces.length) return DEFAULT_CENTER;
    const sample = validPlaces[Math.floor(Math.random() * validPlaces.length)];
    return { lat: clampLat(jitter(sample.lat)), lng: normalizeLng(jitter(sample.lng)) };
  }, [validPlaces]);

  const getInitialCenter = useCallback(() => {
    if (typeof window === 'undefined') return DEFAULT_CENTER;
    const { lat, lng, source } = router.query;
    if (lat && lng) {
      const parsed = { lat: parseFloat(lat), lng: parseFloat(lng) };
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
        localStorage.setItem('mapLastCenter', JSON.stringify(parsed));
        return { lat: clampLat(jitter(parsed.lat)), lng: normalizeLng(jitter(parsed.lng)) };
      }
    }
    if (source === 'globe') {
      return pickRandomCenter();
    }
    const cached = localStorage.getItem('mapLastCenter');
    if (cached) {
      try {
        const saved = JSON.parse(cached);
        return { lat: clampLat(saved.lat), lng: normalizeLng(saved.lng) };
      } catch (_) {
        return DEFAULT_CENTER;
      }
    }
    return DEFAULT_CENTER;
  }, [router.query, pickRandomCenter]);

  const stopDrift = useCallback(() => {
    if (driftRafRef.current) {
      cancelAnimationFrame(driftRafRef.current);
      driftRafRef.current = null;
    }
    driftLastTsRef.current = 0;
    driftAccumRef.current = { x: 0, y: 0 };
    if (driftResumeTimerRef.current) {
      clearTimeout(driftResumeTimerRef.current);
      driftResumeTimerRef.current = null;
    }
  }, []);

  const startDrift = useCallback(() => {
    stopDrift();
    if (!mapInstanceRef.current || streetViewOpenRef.current) return;

    const loop = (ts) => {
      if (streetViewOpenRef.current || !mapInstanceRef.current) {
        driftRafRef.current = null;
        return;
      }
      if (!driftLastTsRef.current) {
        driftLastTsRef.current = ts;
        driftRafRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.max(0, ts - driftLastTsRef.current) / 1000; // seconds
      driftLastTsRef.current = ts;

      // 누적 이동량을 소수로 쌓고, 1px 이상일 때만 panBy
      const delta = DRIFT_SPEED_PX_PER_SEC * dt;
      driftAccumRef.current.x += delta;
      driftAccumRef.current.y += delta;

      const moveX = Math.trunc(driftAccumRef.current.x);
      const moveY = Math.trunc(driftAccumRef.current.y);
      if (moveX !== 0 || moveY !== 0) {
        driftAccumRef.current.x -= moveX;
        driftAccumRef.current.y -= moveY;
        mapInstanceRef.current?.panBy(moveX, moveY);
      }

      driftRafRef.current = requestAnimationFrame(loop);
    };

    driftRafRef.current = requestAnimationFrame(loop);
  }, [stopDrift]);

  const handleUserInteraction = useCallback(() => {
    stopDrift();
    if (driftResumeTimerRef.current) {
      clearTimeout(driftResumeTimerRef.current);
    }
    driftResumeTimerRef.current = window.setTimeout(() => {
      driftResumeTimerRef.current = null;
      startDrift();
    }, DRIFT_IDLE_DELAY);
  }, [startDrift, stopDrift]);

  const openPlaceInStreetView = useCallback(
    (place) => {
      if (
        !place ||
        !googleRef.current ||
        !streetViewServiceRef.current ||
        !streetViewInstanceRef.current
      ) {
        return;
      }
      setActivePlace(place);
      setError(null);
      const latLng = new googleRef.current.maps.LatLng(place.lat, place.lng);
      streetViewServiceRef.current.getPanorama({ location: latLng, radius: 1200 }, (result, status) => {
        if (status === googleRef.current.maps.StreetViewStatus.OK) {
          streetViewInstanceRef.current.setPano(result.location.pano);
          streetViewInstanceRef.current.setPov({ heading: 0, pitch: 0, zoom: 1 });
          streetViewInstanceRef.current.setVisible(true);
          setIsStreetViewActive(true);
        } else {
          setError('해당 위치의 스트리트뷰 이미지를 찾을 수 없습니다.');
          streetViewInstanceRef.current.setVisible(false);
          setIsStreetViewActive(false);
        }
      });
    },
    []
  );

  useEffect(() => {
    streetViewOpenRef.current = isStreetViewActive;
    if (isStreetViewActive) {
      stopDrift();
    } else {
      startDrift();
    }
  }, [isStreetViewActive, startDrift, stopDrift]);

  useEffect(() => {
    if (!router.isReady || !mapRef.current || !streetViewRef.current) return;
    let cancelled = false;
    let cleanup = () => {};
    let blinkTimer = null;
    let zoomUpdateFrame = null;

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current || !streetViewRef.current) return;

        const center = getInitialCenter();
        const hasExplicitCoords = Boolean(router.query.lat && router.query.lng);
        const fromGlobe = router.query.source === 'globe';
        const saved = typeof window !== 'undefined' && localStorage.getItem('mapLastCenter');
        const targetZoom = hasExplicitCoords || fromGlobe || saved ? DETAIL_ZOOM : OVERVIEW_ZOOM;
        const getVisibilityFactor = (zoomValue) =>
          Math.max(0, Math.min(1, (zoomValue - MARKER_APPEAR_ZOOM) / (MARKER_FULL_ZOOM - MARKER_APPEAR_ZOOM)));
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: targetZoom,
          mapTypeId: 'satellite',
          disableDefaultUI: true,
          minZoom: MAP_ZOOM_LIMITS.min,
          maxZoom: MAP_ZOOM_LIMITS.max,
          draggable: true,
          scrollwheel: true,
          gestureHandling: 'greedy',
        });
        mapInstanceRef.current = map;
        googleRef.current = google;

        const streetView = new google.maps.StreetViewPanorama(streetViewRef.current, {
          visible: false,
          disableDefaultUI: true,
          clickToGo: false,
          motionTracking: true,
          motionTrackingControl: false,
        });
        streetViewInstanceRef.current = streetView;
        streetViewServiceRef.current = new google.maps.StreetViewService();

        markerRefs.current.forEach((marker) => marker.setMap(null));
        markerRefs.current = validPlaces.map((place) => {
          const icon = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#ffd400',
            fillOpacity: 1,
            strokeColor: '#ffd400',
            strokeOpacity: 1,
            strokeWeight: 1,
            scale: Math.max(0.6, MARKER_BASE_SCALE * getVisibilityFactor(targetZoom)),
          };
          const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map,
            icon,
            visible: getVisibilityFactor(targetZoom) > 0,
          });
          marker.__iconBase = icon;
          marker.__lastScale = icon.scale;
          marker.__lastOpacity = 1;
          marker.setOpacity(blinkOpacityRef.current);
          marker.addListener('click', () => openPlaceInStreetView(place));
          return marker;
        });

        const updateMarkers = ({ force = false } = {}) => {
          const zoom = map.getZoom() ?? OVERVIEW_ZOOM;
          const factor = getVisibilityFactor(zoom);
          const shouldShow = factor > 0;
          const scale = Math.max(0.6, MARKER_BASE_SCALE * factor);
          const blinkOpacity = blinkOpacityRef.current;
          const zoomChanged = lastZoomRef.current !== zoom;
          const blinkChanged = lastBlinkRef.current !== blinkOpacity;

          if (!force && !zoomChanged && !blinkChanged) return;

          lastZoomRef.current = zoom;
          lastBlinkRef.current = blinkOpacity;

          markerRefs.current.forEach((marker) => {
            if (!shouldShow) {
              if (marker.getVisible()) marker.setVisible(false);
              return;
            }

            if (!marker.getVisible()) marker.setVisible(true);

            if (marker.__lastScale !== scale) {
              marker.__lastScale = scale;
              marker.setIcon({ ...marker.__iconBase, scale });
            }

            if (marker.__lastOpacity !== blinkOpacity) {
              marker.__lastOpacity = blinkOpacity;
              marker.setOpacity(blinkOpacity);
            }
          });
        };
        lastZoomRef.current = targetZoom;
        lastBlinkRef.current = blinkOpacityRef.current;
        updateMarkers({ force: true });

        const zoomListener = map.addListener('zoom_changed', () => {
          if (zoomUpdateFrame) return;
          zoomUpdateFrame = window.requestAnimationFrame(() => {
            zoomUpdateFrame = null;
            updateMarkers({ force: true });
          });
          handleUserInteraction();
        });
        const dragListener = map.addListener('dragstart', handleUserInteraction);
        const clickListener = map.addListener('click', handleUserInteraction);

        const BLINK_PERIOD = 2400;
        const BLINK_INTERVAL = 240;
        blinkTimer = window.setInterval(() => {
          const progress = (Date.now() % BLINK_PERIOD) / BLINK_PERIOD;
          blinkOpacityRef.current = 0.55 + 0.45 * Math.sin(progress * Math.PI * 2);
          updateMarkers();
        }, BLINK_INTERVAL);

        startDrift();

        cleanup = () => {
          zoomListener.remove();
          dragListener.remove();
          clickListener.remove();
          if (zoomUpdateFrame) {
            window.cancelAnimationFrame(zoomUpdateFrame);
          }
          if (blinkTimer) {
            window.clearInterval(blinkTimer);
          }
          markerRefs.current.forEach((marker) => marker.setMap(null));
          markerRefs.current = [];
          stopDrift();
          mapInstanceRef.current = null;
        };
      })
      .catch((err) => console.error('Google Maps 초기화 실패:', err));

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [
    router.isReady,
    router.query,
    getInitialCenter,
    validPlaces,
    startDrift,
    stopDrift,
    openPlaceInStreetView,
  ]);

  const closeStreetView = () => {
    setIsStreetViewActive(false);
    setActivePlace(null);
    setError(null);
    if (streetViewInstanceRef.current) {
      streetViewInstanceRef.current.setVisible(false);
    }
  };

  return (
    <>
      <div className="map-mobile">
        <div ref={mapRef} className="map-canvas" />
        <Pano
          streetViewRef={streetViewRef}
          streetViewInstanceRef={streetViewInstanceRef}
          isActive={isStreetViewActive}
          onClose={closeStreetView}
          error={error}
          activePlace={activePlace}
        />
      </div>

      <style jsx>{`
        .map-mobile {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #000;
        }
        .map-canvas {
          width: 100%;
          height: 100%;
        }
        :global(.map-canvas .gm-style-cc),
        :global(.map-canvas .gm-style-cc *),
        :global(.map-canvas .gmnoprint),
        :global(.map-canvas .gmnoprint *) {
          display: none !important;
        }
      `}</style>
    </>
  );
}
