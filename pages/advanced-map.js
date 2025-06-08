import GoogleMap from '@/components/GoogleMap';
import { useGoogleMaps } from '@/components/hooks/useGoogleMaps';
import { useState } from 'react';

export default function AdvancedMapPage() {
  const {
    map,
    google,
    markers,
    addMarker,
    removeMarker,
    clearMarkers,
    panTo,
    setZoom,
    addInfoWindow,
    initializeMap
  } = useGoogleMaps();

  const [newMarkerPosition, setNewMarkerPosition] = useState({ lat: '', lng: '' });

  const seoulLocations = [
    { name: '경복궁', lat: 37.5796, lng: 126.9770 },
    { name: '남산타워', lat: 37.5512, lng: 126.9882 },
    { name: '강남역', lat: 37.4979, lng: 127.0276 },
    { name: '홍대입구', lat: 37.5563, lng: 126.9236 },
  ];

  const handleMapLoad = (mapInstance, googleInstance) => {
    initializeMap(mapInstance, googleInstance);
    console.log('고급 지도가 로드되었습니다!');
  };

  const handleAddMarker = () => {
    const lat = parseFloat(newMarkerPosition.lat);
    const lng = parseFloat(newMarkerPosition.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('올바른 위도와 경도를 입력해주세요.');
      return;
    }

    const marker = addMarker(
      { lat, lng },
      `사용자 마커 (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      {
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
      }
    );

    if (marker) {
      addInfoWindow(marker, `<div><strong>사용자가 추가한 마커</strong><br/>위치: ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>`);
      panTo({ lat, lng });
    }

    setNewMarkerPosition({ lat: '', lng: '' });
  };

  const goToLocation = (location) => {
    panTo({ lat: location.lat, lng: location.lng });
    setZoom(16);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>고급 Google Maps 데모</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>지도 컨트롤</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {seoulLocations.map((location, index) => (
            <button
              key={index}
              onClick={() => goToLocation(location)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {location.name}으로 이동
            </button>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            placeholder="위도 (lat)"
            value={newMarkerPosition.lat}
            onChange={(e) => setNewMarkerPosition(prev => ({ ...prev, lat: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <input
            type="number"
            placeholder="경도 (lng)"
            value={newMarkerPosition.lng}
            onChange={(e) => setNewMarkerPosition(prev => ({ ...prev, lng: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button
            onClick={handleAddMarker}
            style={{
              padding: '8px 16px',
              backgroundColor: '#34a853',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            마커 추가
          </button>
          <button
            onClick={clearMarkers}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ea4335',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            모든 마커 제거
          </button>
        </div>
        
        <p style={{ marginTop: '10px', color: '#666' }}>
          현재 마커 개수: {markers.length}개
        </p>
      </div>

      <GoogleMap
        center={{ lat: 37.5665, lng: 126.9780 }}
        zoom={13}
        height="600px"
        width="100%"
        onMapLoad={handleMapLoad}
      />

      <div style={{ marginTop: '20px' }}>
        <h3>사용 가능한 기능:</h3>
        <ul>
          <li>서울 주요 관광지로 빠른 이동</li>
          <li>커스텀 마커 추가 (위도/경도 입력)</li>
          <li>마커 클릭시 정보창 표시</li>
          <li>모든 마커 일괄 제거</li>
          <li>마커 개수 실시간 표시</li>
        </ul>
      </div>
    </div>
  );
} 