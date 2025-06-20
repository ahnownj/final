import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import places from '../data/places';

export default function Map2Page() {
  const mapRef = useRef(null);
  const streetViewRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFlashlight, setIsFlashlight] = useState(true);
  const [showStreetInfo, setShowStreetInfo] = useState(false);
  const [currentPlace, setCurrentPlace] = useState(null);

  // 랜덤 center 생성 함수 (한국 범위)
  const getRandomLatLng = () => ({
    lat: 33.0 + Math.random() * (38.5 - 33.0),
    lng: 124.5 + Math.random() * (131.9 - 124.5)
  });
  const [center, setCenter] = useState(getRandomLatLng());

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const initMap = async () => {
      // 디버깅: API 키 확인
      console.log('Google API Key:', process.env.NEXT_PUBLIC_GOOGLE_KEY ? 'EXISTS' : 'MISSING');
      console.log('API Key Length:', process.env.NEXT_PUBLIC_GOOGLE_KEY?.length || 0);
      console.log('API Key Preview:', process.env.NEXT_PUBLIC_GOOGLE_KEY?.substring(0, 10) + '...' || 'UNDEFINED');
      console.log('All ENV vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')));
      console.log('Center coordinates:', center);
      
      // API 키 검증
      if (!process.env.NEXT_PUBLIC_GOOGLE_KEY) {
        console.error('Google Maps API key is missing');
        return;
      }
      
      try {
        const google = await new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_KEY,
          version: 'weekly',
          libraries: ['places'] // 필요한 라이브러리 명시
        }).load();
        
        console.log('Google Maps API loaded successfully');
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
        // 에러 시 사용자에게 알림
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f0f0f0; color: #666; font-family: Arial;">
              <div style="text-align: center;">
                <h3>지도를 불러올 수 없습니다</h3>
                <p>Google Maps API 설정을 확인해주세요</p>
              </div>
            </div>
          `;
        }
        return;
      }
      
      // 위성지도
      const map = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: 14,
        minZoom: 6,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        restriction: {
          latLngBounds: { north: 85, south: -85, west: -180, east: 180 },
          strictBounds: true
        }
      });
      
      // 스트리트뷰
      const streetView = new google.maps.StreetViewPanorama(streetViewRef.current, {
        visible: false,
        disableDefaultUI: true
      });
      
      // 유효한 좌표를 가진 places만 필터링
      const validPlaces = places.filter(place => 
        place && 
        place.lat !== undefined && 
        place.lng !== undefined && 
        !isNaN(parseFloat(place.lat)) && 
        !isNaN(parseFloat(place.lng))
      );
      
      console.log('Total places:', places.length);
      console.log('Valid places:', validPlaces.length);
      
      // 마커 생성 및 클릭 이벤트
      validPlaces.forEach((place, index) => {
        // 디버깅: 각 place의 좌표 확인
        console.log(`Place ${index}:`, {
          lat: place.lat,
          lng: place.lng,
          latType: typeof place.lat,
          lngType: typeof place.lng
        });
        
        // 좌표값 검증 및 변환
        const lat = typeof place.lat === 'number' ? place.lat : parseFloat(place.lat);
        const lng = typeof place.lng === 'number' ? place.lng : parseFloat(place.lng);
        
        // 유효한 좌표인지 확인
        if (isNaN(lat) || isNaN(lng)) {
          console.error(`Invalid coordinates for place ${index}:`, { lat: place.lat, lng: place.lng });
          return; // 이 마커는 건너뛰기
        }
        
        const marker = new google.maps.Marker({
          position: { lat: lat, lng: lng },
          map,
          title: place.place || place.user,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: 'yellow',
            fillOpacity: 1,
            strokeColor: 'yellow',
            strokeWeight: 1
          }
        });
        
        marker.addListener('click', () => {
          streetView.setOptions({
            position: { lat: lat, lng: lng },
            pov: { heading: Math.random() * 360, pitch: 0 },
            visible: true
          });
          setCurrentPlace(place);
          setShowStreetInfo(false); // 정보 오버레이 숨김
        });
      });

      // 전체화면 변경 이벤트
      document.addEventListener('fullscreenchange', () => {
        setIsFullscreen(!!document.fullscreenElement);
      });
    };
    
    initMap();
  }, [center]);

  // 마우스 위치 추적
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 더블클릭 시 손전등 효과 토글
  const handleDoubleClick = () => setIsFlashlight(v => !v);

  return (
    <>
      <div ref={containerRef} className="container">
        <div className="streetview-section">
          <div
            ref={streetViewRef}
            style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
            onDoubleClick={() => setShowStreetInfo(v => !v)}
          ></div>
          {showStreetInfo && currentPlace && (
            <div className="streetview-info-overlay">
              <div>{currentPlace.place || ''}</div>
              <div>{currentPlace.country || ''}</div>
              <div>{currentPlace.user || ''}</div>
              <div>{currentPlace.date || ''}</div>
            </div>
          )}
        </div>
        
        <div className="map-section" onDoubleClick={handleDoubleClick}>
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {isFullscreen ? '⤡' : '⤢'}
          </button>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
          {/* 손전등 오버레이 */}
          {isFlashlight && (
            <div
              className="flashlight-overlay"
              style={{
                maskImage: `radial-gradient(circle 100px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent 100px, black 100px)`,
                WebkitMaskImage: `radial-gradient(circle 100px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, transparent 100px, black 100px)`
              }}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          width: 100vw;
          height: 100vh;

        }
        
        .fullscreen-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 1000;
          width: 35px;
          height: 35px;
          background: yellow;
          border: none;
          border-radius: 35px;
          font-size: 28px;
          color: black;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .fullscreen-btn:hover {
          background: #ffeb3b;
        }
        
        .streetview-section,
        .map-section {
          width: 50%;
          height: 100vh;
          position: relative;
        }
        
        @media (max-width: 768px) {
          .container {
            flex-direction: column;
          }
          .streetview-section,
          .map-section {
            width: 100vw;
            height: 50vh;
          }
        }
        .flashlight-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          pointer-events: none;
          z-index: 100;
        }
        .streetview-info-overlay {
          position: absolute;
          left: 50%;
          top: 47%;
          transform: translateX(-50%);
          z-index: 2001;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 9pt;
          color: black;
          font-family: 'Neue Haas Grotesk', 'Arial', sans-serif;
          font-weight: 400;
          text-align: center;
          background: #ffeb3b;
          border-radius: 0px;
          padding: 1px 3px;
        }
        .streetview-info-overlay div {
          margin: 0px;
        }
      `}</style>

      <style jsx global>{`
        .gm-style-cc, .gmnoprint, .gm-style a[href*="google.com/maps"], .gm-style div[style*="font-family"] {
          display: none !important;
        }
      `}</style>
    </>
  );
}
    
    