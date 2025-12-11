import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMaps';

export default function GoogleMap({
  center = { lat: 37.5665, lng: 126.978 },
  zoom = 15,
  height = '400px',
  width = '100%',
  markers = [],
  onMapLoad = null,
}) {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let blinkTimer = null;
    let createdMarkers = [];

    const initMap = async () => {
      try {
        setError(null);
        setIsLoading(true);

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
          throw new Error('Google Maps API 키가 설정되지 않았거나 기본값입니다.');
        }

        const google = await loadGoogleMaps();
        if (!mapRef.current || !isMounted) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });

        createdMarkers = markers.map((marker) => {
          const markerInstance = new google.maps.Marker({
            position: marker.position,
            map: mapInstance,
            title: marker.title || '',
            ...(marker.options || {}),
          });
          markerInstance.__baseOpacity =
            typeof marker.options?.opacity === 'number' ? marker.options.opacity : 1;
          return markerInstance;
        });

        if (createdMarkers.length) {
          let dim = false;
          blinkTimer = window.setInterval(() => {
            dim = !dim;
            createdMarkers.forEach((marker) => {
              const baseOpacity = marker.__baseOpacity ?? 1;
              marker.setOpacity(dim ? baseOpacity * 0.3 : baseOpacity);
            });
          }, 1000);
        }

        if (onMapLoad) {
          onMapLoad(mapInstance, google);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Google Maps 로드 오류:', err);
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (blinkTimer) {
        window.clearInterval(blinkTimer);
      }
      createdMarkers.forEach((marker) => marker.setMap(null));
    };
  }, [center.lat, center.lng, markers, onMapLoad, zoom]);

  if (error) {
    return (
      <div
        style={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #ccc',
          backgroundColor: '#f5f5f5',
          color: '#666',
        }}
      >
        오류: {error}
      </div>
    );
  }

  return (
    <div className="google-map-wrapper" style={{ height, width, position: 'relative' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
          }}
        >
          지도 로딩 중...
        </div>
      )}
      <div
        ref={mapRef}
        className="google-map-canvas"
        style={{
          height: '100%',
          width: '100%',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
        }}
      />
      <style jsx global>{`
        .google-map-wrapper :global(.gm-style-cc),
        .google-map-wrapper :global(.gm-style-cc *),
        .google-map-wrapper :global(.gmnoprint),
        .google-map-wrapper :global(.gmnoprint *) {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

