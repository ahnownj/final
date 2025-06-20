import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Loader } from '@googlemaps/js-api-loader';
import { places } from '../data/places';

const THUMBNAIL_WIDTH = 210, THUMBNAIL_HEIGHT = 100;

export default function Main() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const googleRef = useRef(null);
  const streetViewInstanceRef = useRef(null);
  const mainStreetViewInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState('');
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    const emojis = ['🌍', '🌎', '🌏'];
    let currentIndex = 0;
    
    // 초기 이모지 설정
    setCurrentEmoji(emojis[currentIndex]);
    
    // 2초마다 이모지 변경
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % 3;
      setCurrentEmoji(emojis[currentIndex]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const formatted = places
      .filter(p => p && !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng)))
      .map((p, i) => ({
        id: i,
        lat: parseFloat(p.lat).toFixed(7),
        lng: parseFloat(p.lng).toFixed(7),
        user: p.user || '',
        place: p.place || '',
        date: p.date || '',
        url: p.url || ''
      }));
    setData(formatted);
  }, []);

  useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        const google = await new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
          version: 'weekly'
        }).load();
        googleRef.current = google;
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
      }
    };
    initGoogleMaps();
  }, []);

  const createStreetView = (container) => {
    if (!googleRef.current || !container) return null;
    
    // 컨테이너를 먼저 숨김
    container.style.opacity = '0';
    
    const streetView = new googleRef.current.maps.StreetViewPanorama(container, {
      visible: false,
      disableDefaultUI: true,
      addressControl: false,
      linksControl: false,
      panControl: false,
      enableCloseButton: false,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
      showRoadLabels: false,
      clickToGo: false,
      scrollwheel: false,
      disableDoubleClickZoom: true
    });
    
    // 간단한 UI 제거 후 표시
    const removeUIAndShow = () => {
      const elementsToHide = container.querySelectorAll('.gm-style-cc, .gm-svpc, .gmnoprint, [title="Google"], a[href*="google.com"]');
      elementsToHide.forEach(el => el.style.display = 'none');
      
      // UI 제거 후 컨테이너 표시
      setTimeout(() => {
        container.style.opacity = '1';
        container.style.transition = 'opacity 0.2s ease';
      }, 50);
    };
    
    streetView.addListener('pano_changed', removeUIAndShow);
    setTimeout(removeUIAndShow, 100);
    
    return streetView;
  };

  const sort = (key) => {
    const dir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(dir);
    
    setData([...data].sort((a, b) => {
      if (key === 'date') {
        const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const parseDate = (dateStr) => {
          if (!dateStr) return { year: 0, month: 0 };
          const parts = dateStr.split(' ');
          const month = parts[0];
          const year = parseInt(parts[1]) || 0;
          const monthIndex = monthOrder.indexOf(month);
          return { year, month: monthIndex >= 0 ? monthIndex : 0 };
        };
        
        const aDate = parseDate(a[key]);
        const bDate = parseDate(b[key]);
        
        if (aDate.year !== bDate.year) {
          return dir === 'asc' ? aDate.year - bDate.year : bDate.year - aDate.year;
        }
        return dir === 'asc' ? aDate.month - bDate.month : bDate.month - aDate.month;
      } else {
        const aVal = key === 'lat' || key === 'lng' ? parseFloat(a[key]) : a[key];
        const bVal = key === 'lat' || key === 'lng' ? parseFloat(b[key]) : b[key];
        return dir === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
      }
    }));
  };

  const handleMouseEnter = (item, event) => {
    if (!isLoaded) return;
    setHoveredItem(item);
    
    const thumbnail = document.querySelector('.thumbnail');
    if (thumbnail) {
      const rowRect = event.currentTarget.getBoundingClientRect();
      const thumbnailTop = Math.max(Math.min(rowRect.bottom - THUMBNAIL_HEIGHT, window.innerHeight - THUMBNAIL_HEIGHT - 20), 20);
      thumbnail.style.top = `${thumbnailTop}px`;
      
      // 기존 컨테이너 제거하고 새로 생성
      const existingContainer = thumbnail.querySelector('.streetview-container');
      if (existingContainer) existingContainer.remove();
      
      const newContainer = document.createElement('div');
      newContainer.className = 'streetview-container';
      newContainer.style.cssText = 'width: 100%; height: 100%; opacity: 0;';
      thumbnail.appendChild(newContainer);
      
      // 새 Street View 인스턴스 생성
      streetViewInstanceRef.current = createStreetView(newContainer);
      
      if (streetViewInstanceRef.current) {
        streetViewInstanceRef.current.setOptions({
          position: { lat: parseFloat(item.lat), lng: parseFloat(item.lng) },
          pov: { heading: 90, pitch: 15, zoom: 10 }, // 썸네일
          visible: true
        });
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
    if (streetViewInstanceRef.current) streetViewInstanceRef.current.setVisible(false);
  };

  const handleRowClick = (item) => {
    if (selectedItem && selectedItem.id === item.id) {
      setSelectedItem(null);
      return;
    }
    
    setSelectedItem(item);
    
    setTimeout(() => {
      const mainContainer = document.querySelector('.main-streetview');
      if (mainContainer) {
        const existingContainer = mainContainer.querySelector('.streetview-container');
        if (existingContainer) existingContainer.remove();
        
        const newContainer = document.createElement('div');
        newContainer.className = 'streetview-container';
        newContainer.style.cssText = 'width: 100%; height: 100%; opacity: 0;';
        mainContainer.appendChild(newContainer);
        
        mainStreetViewInstanceRef.current = createStreetView(newContainer);
        
        if (mainStreetViewInstanceRef.current) {
          mainStreetViewInstanceRef.current.setOptions({
            position: { lat: parseFloat(item.lat), lng: parseFloat(item.lng) },
            pov: { heading: -90, pitch: 15, zoom: 10 }, // 메인
            visible: true
          });
        }
      }
    }, 100);
  };

  // 썸네일 표시 조건 수정: ID로 비교
  const shouldShowThumbnail = hoveredItem && (!selectedItem || hoveredItem.id !== selectedItem.id);

  return (
    <div className="container">
      <div className="site-title" onClick={() => router.push('/map')}>{currentEmoji}</div>
      
      <div className="vp-title" onClick={() => setShowAbout(!showAbout)}>+</div>
      
      {/* About 오버레이 */}
      <div className={`about-overlay ${showAbout ? 'show' : ''}`}>
        <div className="about-content">
          <div className="about-close" onClick={() => setShowAbout(false)}>×</div>
          <div className="about-text">
            <p>
              It's a strange comfort to know that, somewhere on this spinning Earth, someone else is watching the same sun setting—though we may never meet, and though our lives never intersect.
            </p>
            
            <p>
              <span className="site-name">Vanishing Points</span> is a space for encountering images of distant landscapes through the eyes of Google's Street View. It emerged from the realization that, while we each live within separate coordinates, the sun's movement—and our act of watching it—remains shared.
              Often, in those panoramic fragments, the subject is missing. There is no one in the frame—only a shadow, a glitch, a vanishing point where someone once stood. These images evoke a peculiar sense of loss and presence, as though something is watching back from behind the screen.
            </p>

            <p>
              The project is a temporary meditation on memory, absence, and the illusion of proximity. The globe, once known to us through paper maps and childhood globes, appears again in digital form—distorted, flattened, yet strangely emotional. By wandering through these virtual thresholds, we not only glimpse other landscapes, but perhaps also reconnect with someone, somewhere, who once watched the same sun.
            </p>

            <p>
              This website has been created from the 2025 Convergence Design III led by Jeanyoon Choi at <a href="https://www.karts.ac.kr/" target="_blank" className="university-link">Korea National University of Arts</a>.
            </p>
          </div>
        </div>
      </div>
      
      <div className="thumbnail-area">
        {shouldShowThumbnail && (
          <div className="thumbnail">
            <div className="streetview-container" style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>
      
      <div className="archive-area">
        <div className="header">
          <div onClick={() => sort('lat')}>LAT {sortKey === 'lat' && (sortDir === 'asc' ? '▲' : '▼')}</div>
          <div onClick={() => sort('lng')}>LNG {sortKey === 'lng' && (sortDir === 'asc' ? '▲' : '▼')}</div>
          <div onClick={() => sort('user')}>USER {sortKey === 'user' && (sortDir === 'asc' ? '▲' : '▼')}</div>
          <div onClick={() => sort('place')}>TITLE {sortKey === 'place' && (sortDir === 'asc' ? '▲' : '▼')}</div>
          <div onClick={() => sort('date')}>DATE {sortKey === 'date' && (sortDir === 'asc' ? '▲' : '▼')}</div>
        </div>
        
        <div className="rows">
          {data.map((item) => (
            <div key={item.id}>
              <div 
                className={`row ${selectedItem && selectedItem.id === item.id ? 'selected' : ''}`}
                onMouseEnter={(event) => handleMouseEnter(item, event)} 
                onMouseLeave={handleMouseLeave} 
                onClick={() => handleRowClick(item)}
              >
                <div className="coord">{item.lat}</div>
                <div className="coord">{item.lng}</div>
                <div>{item.user}</div>
                <div className="place">{item.place}</div>
                <div>{item.date}</div>
              </div>
              
              {selectedItem && selectedItem.id === item.id && (
                <div className="main-streetview-container">
                  <div 
                    className="main-streetview"
                    onDoubleClick={() => {
                      router.push(`/map?lat=${selectedItem.lat}&lng=${selectedItem.lng}`);
                    }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow-x: hidden; background: #f0f0f0; color:rgb(90, 90, 90); }
        html { color-scheme: light; }
      `}</style>
      
      <style jsx>{`
        .container {
          font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          width: 100vw;
          max-width: 100%;
          padding: 100px 10px 0 10px;
          display: flex;
        }
        
        .thumbnail-area { width: 0; position: relative; }
        .archive-area { flex: 1; min-width: 0; }
        
                  .site-title {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 28px;
            z-index: 1001;
            cursor: pointer;
          }
        
        .thumbnail {
          position: fixed;
          left: 20px;
          width: ${THUMBNAIL_WIDTH}px;
          height: ${THUMBNAIL_HEIGHT}px;
          z-index: 1000;
          background: white;
        }
        
        .main-streetview-container {
          width: 100%;
          height: 400px;
          grid-column: 1 / -1;
        }
        
        .main-streetview {
          width: 100%;
          height: 100%;
          background: #f0f0f0;
        }
        
        .header, .row {
          display: grid;
          grid-template-columns: 14% 14% 25% 25% 14%;
          gap: 10px;
          padding: 8px 12px;
          min-height: 30px;
          align-items: center;
        }
        
        .header {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .header > div { cursor: pointer; user-select: none; }
        
        .rows {
          height: calc(100vh - 80px);
          overflow-y: auto;
        }
        
        .rows::-webkit-scrollbar { display: none; }
        
        .row {
          border-bottom: 1px solid #eee;
          cursor: pointer;
        }
        
        .row:hover:not(.selected) { background-color: yellow; }
        .row.selected { background-color: white; }
        
        .coord {
          font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
        }
        
        .header > div, .row > div {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          line-height: 1.4;
          display: flex;
          align-items: center;
        }
        
        /* 선택된 행만 여러 줄 표시 */
        .row.selected > div {
          white-space: normal !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow: visible !important;
          text-overflow: unset !important;
          align-items: flex-start !important;
        }
        
        .row.selected {
          min-height: auto !important;
          align-items: flex-start !important;
        }
        
        @media (min-width: 800px) {
          .container { padding: 100px 10px 0 250px; }
          .thumbnail-area { width: 250px; margin-left: -250px; }
        }
        
        @media (max-width: 799px) {
          .thumbnail { display: none; }
        }
        
        .about-overlay {
          position: fixed;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100vh;
          z-index: 2000;
          transition: left 0.3s ease;
        }
        
        .about-overlay.show {
          left: 0;
        }
        
        .about-content {
          width: 400px;
          height: 100vh;
          background:rgb(255, 255, 255);
          padding: 100px 20px 20px 20px;
          overflow-y: auto;
          position: relative;
        }
        
        .about-close {
          position: absolute;
          top: 12px;
          right: 20px;
          font-size: 20px;
          cursor: pointer;
          color: rgb(60, 60, 60);
        }
        
        .about-text {
          font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: rgb(60, 60, 60);
        }
        
        .about-text p {
          margin: 0 0 16px 0;
        }
        
        .about-text p:last-child {
          margin-bottom: 0;
        }
        
        .about-text .site-name {
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .about-text .site-name:hover {
          color: white;
        }
        
        .about-text .university-link {
          color: rgb(60, 60, 60);
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .about-text .university-link:hover {
          color: white;
        }
        
        .vp-title {
          position: fixed;
          top: 12px;
          left: 20px;
          font-size: 20px;
          font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          color: rgb(90, 90, 90);
          z-index: 1001;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .vp-title:hover {
          color: #f0f0f0;
        }
      `}</style>
    </div>
  );
}

