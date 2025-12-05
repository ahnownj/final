import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import places from '../data/places';
import Pano from './Pano';
import { loadGoogleMaps } from '../lib/googleMaps';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const MAP_ZOOM_LIMITS = { min: 1, max: 18 };
const RANDOM_OFFSET_DEGREES = 0.18;
const DETAIL_ZOOM = 6;
const OVERVIEW_ZOOM = 2;
const ZOOM_DURATION = 4000;
const DRIFT_INTERVAL = 180;
const DRIFT_STEP = { x: 1, y: 1 };
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
  const driftTimerRef = useRef(null);
  const zoomCancelRef = useRef(null);
  const streetViewOpenRef = useRef(false);
  const markerRefs = useRef([]);

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

  const animateZoom = useCallback((targetZoom, onComplete) => {
    const map = mapInstanceRef.current;
    if (!map || !Number.isFinite(targetZoom)) return;
    if (zoomCancelRef.current) {
      zoomCancelRef.current();
      zoomCancelRef.current = null;
    }
    const startZoom = map.getZoom() ?? MAP_ZOOM_LIMITS.min;
    if (Math.abs(startZoom - targetZoom) < 0.05) {
      onComplete?.();
      return;
    }
    const startTime = performance.now();
    const duration = ZOOM_DURATION;
    let rafId = null;
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 2.5);
      map.setZoom(startZoom + (targetZoom - startZoom) * ease);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        map.setZoom(targetZoom);
        zoomCancelRef.current = null;
        onComplete?.();
      }
    };
    rafId = requestAnimationFrame(step);
    zoomCancelRef.current = () => {
      if (rafId) cancelAnimationFrame(rafId);
      zoomCancelRef.current = null;
    };
  }, []);

  const stopDrift = useCallback(() => {
    if (driftTimerRef.current) {
      clearInterval(driftTimerRef.current);
      driftTimerRef.current = null;
    }
  }, []);

  const startDrift = useCallback(() => {
    stopDrift();
    if (!mapInstanceRef.current) return;
    driftTimerRef.current = window.setInterval(() => {
      if (!streetViewOpenRef.current) {
        mapInstanceRef.current?.panBy(DRIFT_STEP.x, DRIFT_STEP.y);
      }
    }, DRIFT_INTERVAL);
  }, [stopDrift]);

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

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current || !streetViewRef.current) return;

        const center = getInitialCenter();
        const hasExplicitCoords = Boolean(router.query.lat && router.query.lng);
        const fromGlobe = router.query.source === 'globe';
        const saved = typeof window !== 'undefined' && localStorage.getItem('mapLastCenter');
        const targetZoom = hasExplicitCoords || fromGlobe || saved ? DETAIL_ZOOM : OVERVIEW_ZOOM;
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: OVERVIEW_ZOOM,
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
            strokeWeight: 1,
            scale: 0.0001,
          };
          const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map,
            icon,
            visible: false,
          });
          marker.__icon = icon;
          marker.addListener('click', () => openPlaceInStreetView(place));
          return marker;
        });

        const updateMarkers = () => {
          const zoom = map.getZoom() ?? OVERVIEW_ZOOM;
          const factor = Math.max(
            0,
            Math.min(1, (zoom - MARKER_APPEAR_ZOOM) / (MARKER_FULL_ZOOM - MARKER_APPEAR_ZOOM))
          );
          markerRefs.current.forEach((marker) => {
            marker.setVisible(factor > 0);
            marker.setIcon({ ...marker.__icon, scale: Math.max(0.6, MARKER_BASE_SCALE * factor) });
          });
        };
        updateMarkers();
        const zoomListener = map.addListener('zoom_changed', updateMarkers);

        animateZoom(targetZoom, startDrift);

        cleanup = () => {
          zoomListener.remove();
          markerRefs.current.forEach((marker) => marker.setMap(null));
          markerRefs.current = [];
          stopDrift();
          if (zoomCancelRef.current) {
            zoomCancelRef.current();
            zoomCancelRef.current = null;
          }
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
    animateZoom,
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
      `}</style>
    </>
  );
}
