import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Pano from '../components/Pano';
import places from '../data/places';
import { loadGoogleMaps } from '../lib/googleMaps';

const normalizePlace = (place, idFallback = null) => {
  if (!place) return null;
  const lat = parseFloat(place.lat);
  const lng = parseFloat(place.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: typeof place.id === 'number' ? place.id : idFallback,
    lat,
    lng,
    user: place.user || '',
    place: place.place || '',
    date: place.date || '',
    url: place.url || '',
  };
};

export default function PanoPage() {
  const router = useRouter();
  const streetViewRef = useRef(null);
  const streetViewInstanceRef = useRef(null);
  const streetViewServiceRef = useRef(null);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [activePlace, setActivePlace] = useState(null);

  const fallbackPlace = useMemo(() => normalizePlace(places?.[0], 0), []);

  const targetPlace = useMemo(() => {
    const { id, lat, lng, user, place, date, url } = router.query;
    const parsedId = Number.isFinite(Number(id)) ? Number(id) : null;

    if (Number.isInteger(parsedId) && places?.[parsedId]) {
      return normalizePlace({ ...places[parsedId], id: parsedId });
    }

    if (lat && lng) {
      return normalizePlace(
        { lat, lng, user, place, date, url },
        parsedId ?? null
      );
    }

    return null;
  }, [router.query]);

  useEffect(() => {
    if (!router.isReady || !streetViewRef.current) return undefined;
    let cancelled = false;
    let panorama = null;

    const place = targetPlace || fallbackPlace;
    if (!place) {
      setError('표시할 위치가 없습니다.');
      setIsActive(true);
      return undefined;
    }

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !streetViewRef.current) return;
        const service = new google.maps.StreetViewService();
        const panoInstance = new google.maps.StreetViewPanorama(streetViewRef.current, {
          visible: false,
          disableDefaultUI: true,
          clickToGo: false,
          motionTracking: true,
          motionTrackingControl: false,
        });

        streetViewServiceRef.current = service;
        streetViewInstanceRef.current = panoInstance;
        panorama = panoInstance;
        setIsActive(true);

        const latLng = new google.maps.LatLng(place.lat, place.lng);
        service.getPanorama({ location: latLng, radius: 1200 }, (result, status) => {
          if (cancelled) return;
          setActivePlace(place);
          if (status === google.maps.StreetViewStatus.OK) {
            panoInstance.setPano(result.location.pano);
            panoInstance.setPov({ heading: 0, pitch: 0, zoom: 1 });
            panoInstance.setVisible(true);
            setError(null);
          } else {
            panoInstance.setVisible(false);
            setError('해당 위치의 스트리트뷰 이미지를 찾을 수 없습니다.');
          }
        });
      })
      .catch(() => setError('Google Maps 로딩 실패'));

    return () => {
      cancelled = true;
      panorama?.setVisible(false);
    };
  }, [router.isReady, targetPlace, fallbackPlace]);

  const handleClose = () => {
    router.push('/list');
  };

  return (
    <>
      <div className="pano-page">
        <Pano
          streetViewRef={streetViewRef}
          streetViewInstanceRef={streetViewInstanceRef}
          isActive={isActive}
          onClose={handleClose}
          error={error}
          activePlace={activePlace}
        />
      </div>

      <style jsx>{`
        .pano-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: #000;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}

