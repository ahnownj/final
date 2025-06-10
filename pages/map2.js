import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import places from '../data/places';

export default function Map2Page() {
  const mapRef = useRef(null);
  const streetViewRef = useRef(null);
  const containerRef = useRef(null);
  const [clickedLocation, setClickedLocation] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panorama, setPanorama] = useState(null);

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
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_KEY,
        version: 'weekly'
      });
      
      const google = await loader.load();
      
      // 위성지도 생성
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 37.5665, lng: 126.9780 },
        zoom: 10,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        fullscreenControl: false
      });

      // Street View 파노라마 생성 (완전히 깨끗한 UI)
      const streetViewPanorama = new google.maps.StreetViewPanorama(
        streetViewRef.current,
        {
          visible: false,
          disableDefaultUI: true, // 모든 기본 UI 숨김
          addressControl: false,
          linksControl: false,
          panControl: false,
          enableCloseButton: false,
          fullscreenControl: false,
          zoomControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          imageDateControl: false,
          clickToGo: false,
          scrollwheel: false,
          keyboardShortcuts: false,
          showRoadLabels: false,
          disableDoubleClickZoom: true
        }
      );

      setPanorama(streetViewPanorama);

      // places 마커 생성
      places.forEach(place => {
        const marker = new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          map,
          title: place.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: 'yellow',
            fillOpacity: 1,
            strokeColor: 'yellow',
            strokeWeight: 1
          }
        });
        
        // 마커 클릭 시 Street View 직접 로드
        marker.addListener('click', () => {
          const randomHeading = Math.random() * 360;
          
          streetViewPanorama.setOptions({
            position: { lat: place.lat, lng: place.lng },
            pov: { 
              heading: randomHeading, 
              pitch: 0 
            },
            visible: true
          });
          
          setClickedLocation(`${place.title} - 위도: ${place.lat.toFixed(4)}, 경도: ${place.lng.toFixed(4)}`);
        });
      });
    };
    
    initMap();
  }, []);

  return (
    <>
      <div ref={containerRef} className="container">
        <div className="streetview-section">
          {clickedLocation && (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <div ref={streetViewRef} style={{ width: '100%', height: '100%' }}></div>
            </div>
          )}
        </div>
        
        <div className="map-section">
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {isFullscreen ? '⤡' : '⤢'}
          </button>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
        </div>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          width: 100vw;
          height: 100vh;
          position: relative;
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
      `}</style>

      <style jsx global>{`
        /* Google 로고 및 키보드 단축키 텍스트 숨기기 */
        .gm-style-cc {
          display: none !important;
        }
        
        .gmnoprint {
          display: none !important;
        }
        
        .gm-style .gm-style-cc {
          display: none !important;
        }
        
        .gm-style a[href*="google.com/maps"] {
          display: none !important;
        }
        
        .gm-style div[style*="font-family"] {
          display: none !important;
        }
      `}</style>
    </>
  );
}
    