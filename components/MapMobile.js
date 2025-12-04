import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import places from '../data/places';
import Pano from './Pano';
import { loadGoogleMaps } from '../lib/googleMaps';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const MAP_ZOOM_LIMITS = { min: 3, max: 18 };
const RANDOM_OFFSET_DEGREES = 0.15;

const clampLat = (lat) => Math.max(-85, Math.min(85, lat));
const normalizeLng = (lng) => {
  if (!Number.isFinite(lng)) return lng;
  const normalized = ((lng + 180) % 360 + 360) % 360 - 180;
  return normalized;
};
const randomizeAround = ({ lat, lng }) => {
  const latOffset = (Math.random() - 0.5) * RANDOM_OFFSET_DEGREES * 2;
  const lngOffset = (Math.random() - 0.5) * RANDOM_OFFSET_DEGREES * 2;
  return {
    lat: clampLat(lat + latOffset),
    lng: normalizeLng(lng + lngOffset),
  };
};

export default function MapMobile() {
  const router = useRouter();
  const mapRef = useRef(null);
  const streetViewRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const streetViewInstanceRef = useRef(null);
  const streetViewServiceRef = useRef(null);
  const googleRef = useRef(null);

  const [activePlace, setActivePlace] = useState(null);
  const [isStreetViewActive, setIsStreetViewActive] = useState(false);
  const [error, setError] = useState(null);
  const [isStreetViewReady, setIsStreetViewReady] = useState(false);
  const randomizedCenterRef = useRef(null);

  const validPlaces = places
    .filter((p) => p && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng)))
    .map((p, i) => ({
      id: i,
      lat: parseFloat(p.lat),
      lng: parseFloat(p.lng),
      user: p.user || '',
      place: p.place || '',
      date: p.date || '',
      url: p.url || '',
    }));

  const pickRandomPlaceCenter = () => {
    if (!validPlaces.length) return DEFAULT_CENTER;
    const randomIndex = Math.floor(Math.random() * validPlaces.length);
    const randomized = randomizeAround(validPlaces[randomIndex]);
    randomizedCenterRef.current = randomized;
    return randomized;
  };

  const getInitialCenter = () => {
    if (typeof window === 'undefined') return DEFAULT_CENTER;
    const { lat, lng, source } = router.query;
    if (lat && lng) {
      const center = { lat: parseFloat(lat), lng: parseFloat(lng) };
      if (Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        if (!randomizedCenterRef.current) {
          randomizedCenterRef.current = randomizeAround(center);
        }
        localStorage.setItem('mapLastCenter', JSON.stringify(center));
        return randomizedCenterRef.current;
      }
    }
    if (source === 'globe') {
      return pickRandomPlaceCenter();
    }
    randomizedCenterRef.current = null;
    const saved = localStorage.getItem('mapLastCenter');
    return saved ? JSON.parse(saved) : DEFAULT_CENTER;
  };

  const getInitialHeading = (tiles) => {
    if (!tiles) return 0;
    const candidates = [tiles.centerHeading, tiles.heading, tiles.northHeading, tiles.originalHeading];
    const valid = candidates.find((value) => Number.isFinite(value));
    return Number.isFinite(valid) ? valid : 0;
  };

  const openPlaceInStreetView = useCallback(
    (place) => {
      if (!place || !googleRef.current || !streetViewServiceRef.current || !streetViewInstanceRef.current) return;
      setActivePlace(place);
      setError(null);
      const latLng = new googleRef.current.maps.LatLng(place.lat, place.lng);
      streetViewServiceRef.current.getPanorama({ location: latLng, radius: 1200 }, (result, status) => {
        if (status === googleRef.current.maps.StreetViewStatus.OK) {
          streetViewInstanceRef.current.setPano(result.location.pano);
          streetViewInstanceRef.current.setPov({
              heading: getInitialHeading(result.tiles),
            pitch: 0,
            zoom: 1,
          });
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
    let rafId;
    const waitForStreetViewNode = () => {
      if (streetViewRef.current) {
        setIsStreetViewReady(true);
        return;
      }
      rafId = requestAnimationFrame(waitForStreetViewNode);
    };
    waitForStreetViewNode();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !router.isReady || !isStreetViewReady || !streetViewRef.current) {
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const google = await loadGoogleMaps();
        if (!mounted || !mapRef.current) return;

        const center = getInitialCenter();
        const hasLatLngQuery = Boolean(router.query.lat && router.query.lng);
        const isFromGlobe = router.query.source === 'globe';
        const zoom = hasLatLngQuery || isFromGlobe ? 11 : 4;

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: 'satellite',
          disableDefaultUI: true,
          minZoom: MAP_ZOOM_LIMITS.min,
          maxZoom: MAP_ZOOM_LIMITS.max,
        });
        mapInstanceRef.current = map;

        const streetView = new google.maps.StreetViewPanorama(streetViewRef.current, {
          visible: false,
          disableDefaultUI: true,
          clickToGo: false,
          motionTracking: false,
        });
        streetViewInstanceRef.current = streetView;
        streetViewServiceRef.current = new google.maps.StreetViewService();
        googleRef.current = google;

        validPlaces.forEach((place) => {
          const marker = new google.maps.Marker({
            position: { lat: place.lat, lng: place.lng },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#ffd400',
              fillOpacity: 1,
              strokeColor: '#ffd400',
              strokeWeight: 1,
              scale: 4,
            },
          });

          marker.addListener('click', () => openPlaceInStreetView(place));
        });
      } catch (err) {
        console.error('Google Maps 초기화 실패:', err);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [router.isReady, router.query, isStreetViewReady, openPlaceInStreetView, validPlaces]);

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

