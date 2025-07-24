import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Loader } from '@googlemaps/js-api-loader';
import places from '../data/places';

export default function Map2Page() {
  const router = useRouter();
  const mapRef = useRef(null);
  const streetViewRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isFlashlight, setIsFlashlight] = useState(true);
  const [currentPlace, setCurrentPlace] = useState(null);
  const [currentEmoji, setCurrentEmoji] = useState('');

  // 회전하는 지구본 이모지
  useEffect(() => {
    const emojis = ['🌍', '🌎', '🌏'];
    let currentIndex = 0;
    
    setCurrentEmoji(emojis[currentIndex]);
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % 3;
      setCurrentEmoji(emojis[currentIndex]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // 지구본 클릭 핸들러
  const handleGlobeClick = () => {
    if (router.pathname === '/') {
      router.push('/map');
    } else if (router.pathname === '/map') {
      router.push('/');
    }
  };


  // URL 파라미터에서 좌표를 가져오거나 서울 중심 좌표 사용
  const getInitialCenter = () => {
    const { lat, lng } = router.query;
    if (lat && lng) {
      const baseLat = parseFloat(lat);
      const baseLng = parseFloat(lng);
      
      // 랜덤 오프셋 생성 (대략 ±0.06도, 약 6km 정도 범위)
      const latOffset = (Math.random() - 0.5) * 0.12;
      const lngOffset = (Math.random() - 0.5) * 0.12;
      
      return { 
        lat: baseLat + latOffset, 
        lng: baseLng + lngOffset 
      };
    }
    return { lat: 37.5665, lng: 126.9780 }; // 서울 중심
  };

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
    // router.query가 준비될 때까지 기다림
    if (!router.isReady) return;
    
    const initMap = async () => {
      const center = getInitialCenter();
      
            // API 키 검증
      if (!process.env.NEXT_PUBLIC_GOOGLE_KEY) {
        console.error('Google Maps API key is missing');
        return;
      }
      
      try {
        // Google Maps API 중복 로딩 방지
        let google;
        if (window.google && window.google.maps) {
          google = window.google;
        } else {
          google = await new Loader({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_KEY,
            version: 'weekly',
            libraries: ['places'] // 필요한 라이브러리 명시
          }).load();
        }
        

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
      
      // 위성지도 - URL 파라미터가 있으면 더 높은 줌 레벨 사용
      const initialZoom = router.query.lat && router.query.lng ? 13 : 10;
      const map = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: initialZoom,
        minZoom: 10,
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
      
      // Street View 데이터가 없으면 자동으로 숨기기
      streetView.addListener('status_changed', () => {
        if (streetView.getStatus() !== 'OK') {
          streetView.setVisible(false);
        }
      });
      
      // 유효한 좌표를 가진 places만 필터링
      const validPlaces = places.filter(place => 
        place && 
        place.lat !== undefined && 
        place.lng !== undefined && 
        !isNaN(parseFloat(place.lat)) && 
        !isNaN(parseFloat(place.lng))
      );
      

      
      // 마커 생성 및 클릭 이벤트
      validPlaces.forEach((place, index) => {

        
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
          setCurrentPlace({ ...place, lat, lng });
          
          streetView.setOptions({
            position: { lat: lat, lng: lng },
            pov: { heading: Math.random() * 360, pitch: 0 },
            visible: true
          });
        });
      });

      // 전체화면 변경 이벤트
      document.addEventListener('fullscreenchange', () => {
        setIsFullscreen(!!document.fullscreenElement);
      });
    };
    
    initMap();
  }, [router.isReady, router.query]);

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
        {/* 지구본 (전체화면 모드에서도 보이도록) */}
        <div className="site-title" onClick={handleGlobeClick}>
          {currentEmoji}
        </div>
        
        <div className="streetview-section">
          <div
            ref={streetViewRef}
            style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
            onDoubleClick={() => {
              if (currentPlace && currentPlace.url) {
                window.open(currentPlace.url, '_blank');
              }
            }}
          ></div>
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
          position: relative;
        }
        
        .site-title {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 28px;
          z-index: 1001;
          cursor: pointer;
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

      `}</style>

      <style jsx global>{`
        .gm-style-cc, .gmnoprint, .gm-style a[href*="google.com/maps"], .gm-style div[style*="font-family"] {
          display: none !important;
        }
      `}</style>
    </>
  );
}
    
    