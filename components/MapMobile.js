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
  const [currentEmoji, setCurrentEmoji] = useState('🌍');
  const [error, setError] = useState(null);
  const [isStreetViewReady, setIsStreetViewReady] = useState(false);
  const randomizedCenterRef = useRef(null);

  // 초기 중심점
  const getInitialCenter = () => {
    if (typeof window === 'undefined') return DEFAULT_CENTER;
    const { lat, lng } = router.query;
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
    randomizedCenterRef.current = null;
    const saved = localStorage.getItem('mapLastCenter');
    return saved ? JSON.parse(saved) : DEFAULT_CENTER;
  };

  // 유효한 places 필터링
  const validPlaces = places.filter(
    (p) => p && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng))
  ).map((p, i) => ({
    id: i,
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lng),
    user: p.user || '',
    place: p.place || '',
    date: p.date || '',
    url: p.url || '',
  }));

  const openPlaceInStreetView = useCallback(
    (place) => {
      if (!place || !googleRef.current || !streetViewServiceRef.current || !streetViewInstanceRef.current) return;
      setActivePlace(place);
      setError(null);
      const latLng = new googleRef.current.maps.LatLng(place.lat, place.lng);
      streetViewServiceRef.current.getPanorama(
        { location: latLng, radius: 1200 },
        (result, status) => {
          if (status === googleRef.current.maps.StreetViewStatus.OK) {
            streetViewInstanceRef.current.setPano(result.location.pano);
            streetViewInstanceRef.current.setPov({
              heading: result.tiles?.heading || 0,
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
        }
      );
    },
    []
  );

  // 이모지 회전
  useEffect(() => {
    const emojis = ['🌍', '🌎', '🌏'];
    let idx = 0;
    const interval = setInterval(() => {
      setCurrentEmoji(emojis[(idx = (idx + 1) % emojis.length)]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

  // Google Maps 초기화
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
        const zoom = router.query.lat && router.query.lng ? 11 : 4;

        // 지도 생성
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: 'satellite',
          disableDefaultUI: true,
          minZoom: MAP_ZOOM_LIMITS.min,
          maxZoom: MAP_ZOOM_LIMITS.max,
        });
        mapInstanceRef.current = map;

        // Street View 생성
        const streetView = new google.maps.StreetViewPanorama(streetViewRef.current, {
          visible: false,
          disableDefaultUI: true,
          clickToGo: false,
          motionTracking: false,
        });
        streetViewInstanceRef.current = streetView;
        streetViewServiceRef.current = new google.maps.StreetViewService();
        googleRef.current = google;

        // 마커 생성
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

          const handleMarkerInteraction = () => openPlaceInStreetView(place);
          marker.addListener('click', handleMarkerInteraction);

        });
      } catch (err) {
        console.error('Google Maps 초기화 실패:', err);
      }
    };

    init();
    return () => { mounted = false; };
  }, [router.isReady, router.query, isStreetViewReady]);

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
        <div className="site-title" onClick={() => router.push('/')}>
          {currentEmoji}
        </div>

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
        .site-title {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 28px;
          color: #fff;
          z-index: 10;
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
