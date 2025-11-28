import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMaps';

const GoogleMap = ({ 
  center = { lat: 37.5665, lng: 126.9780 }, // 서울 기본 좌표
  zoom = 15,
  height = '400px',
  width = '100%',
  markers = [],
  onMapLoad = null
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
        console.log('API Key exists:', !!apiKey);
        console.log('API Key length:', apiKey?.length || 0);

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
          throw new Error('Google Maps API 키가 설정되지 않았거나 기본값입니다.');
        }

        console.log('Google Maps 로딩 시작...');
        const google = await loadGoogleMaps();
        console.log('Google Maps 로딩 완료!');
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: center,
            zoom: zoom,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
          });

          setMap(mapInstance);

          // 마커 추가
          markers.forEach(marker => {
            new google.maps.Marker({
              position: marker.position,
              map: mapInstance,
              title: marker.title || '',
              ...(marker.options || {})
            });
          });

          // 지도 로드 완료 콜백
          if (onMapLoad) {
            onMapLoad(mapInstance, google);
          }

          setIsLoading(false);
        }
      } catch (err) {
        console.error('Google Maps 로드 오류:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initMap();
  }, [center.lat, center.lng, zoom, markers.length]);

  if (error) {
    return (
      <div style={{ 
        height, 
        width, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid #ccc',
        backgroundColor: '#f5f5f5',
        color: '#666'
      }}>
        오류: {error}
      </div>
    );
  }

  return (
    <div style={{ height, width, position: 'relative' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000
        }}>
          지도 로딩 중...
        </div>
      )}
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease'
        }} 
      />
    </div>
  );
};

export default GoogleMap; 