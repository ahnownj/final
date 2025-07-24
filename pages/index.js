import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Loader } from '@googlemaps/js-api-loader';
import { places } from '../data/places';
import Image from 'next/image';

const THUMBNAIL_WIDTH = 210, THUMBNAIL_HEIGHT = 100;

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const googleRef = useRef(null);
  const streetViewInstanceRef = useRef(null);
  const mainStreetViewInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

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
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_KEY,
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
    
    const streetView = new googleRef.current.maps.StreetViewPanorama(container, {
      visible: false,
      disableDefaultUI: true,
      clickToGo: false,
      scrollwheel: false,
      disableDoubleClickZoom: true
    });
    
    // Google 로고 정교한 숨김
    const removeUI = () => {
      const hideGoogleElements = () => {
        // 기존 클래스들 숨김
        const elementsToHide = container.querySelectorAll('.gm-style-cc, .gmnoprint');
        elementsToHide.forEach(el => {
          el.style.display = 'none';
        });
        
        // Google 링크 숨김
        const googleLinks = container.querySelectorAll('a[href*="google.com"]');
        googleLinks.forEach(link => {
          link.style.display = 'none';
          // 부모 컨테이너도 숨김
          let parent = link.parentElement;
          while (parent && parent !== container) {
            if (parent.textContent.trim() === 'Google') {
              parent.style.display = 'none';
              break;
            }
            parent = parent.parentElement;
          }
        });
        
        // 정확히 "Google" 텍스트만 가진 요소 숨김
        const allElements = container.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.textContent && el.textContent.trim() === 'Google' && !el.querySelector('*')) {
            el.style.display = 'none';
            // 부모 요소 체크
            if (el.parentElement && el.parentElement.children.length === 1) {
              el.parentElement.style.display = 'none';
            }
          }
        });
      };
      
      setTimeout(hideGoogleElements, 200);
      setTimeout(hideGoogleElements, 500);
      setTimeout(hideGoogleElements, 1000);
    };
    
    streetView.addListener('pano_changed', removeUI);
    setTimeout(removeUI, 100);
    
    // MutationObserver로 동적 요소 감시
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // 새로 추가된 요소가 Google 로고인지 확인
              if (node.textContent && node.textContent.includes('Google')) {
                const hideGoogleElements = () => {
                  const googleLinks = node.querySelectorAll('a[href*="google.com"]');
                  googleLinks.forEach(link => link.style.display = 'none');
                  
                  if (node.textContent.trim() === 'Google') {
                    node.style.display = 'none';
                  }
                };
                setTimeout(hideGoogleElements, 50);
              }
            }
          });
        }
      });
    });
    
    observer.observe(container, { 
      childList: true, 
      subtree: true 
    });
    
    return streetView;
  };

  const sort = (key) => {
    const dir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDir(dir);
    
    // 정렬 시 모든 미리보기창 닫기
    setSelectedItems([]);
    
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
      newContainer.style.cssText = 'width: 100%; height: 100%;';
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
    const isAlreadySelected = selectedItems.some(selectedItem => selectedItem.id === item.id);
    
    if (isAlreadySelected) {
      // 이미 선택된 아이템이면 배열에서 제거
      setSelectedItems(selectedItems.filter(selectedItem => selectedItem.id !== item.id));
      return;
    }
    
    // 선택되지 않은 아이템이면 배열에 추가
    setSelectedItems([...selectedItems, item]);
    
    setTimeout(() => {
      const mainContainer = document.querySelector(`.main-streetview-${item.id}`);
      if (mainContainer) {
        const existingContainer = mainContainer.querySelector('.streetview-container');
        if (existingContainer) existingContainer.remove();
        
        const newContainer = document.createElement('div');
        newContainer.className = 'streetview-container';
        newContainer.style.cssText = 'width: 100%; height: 100%;';
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
  const shouldShowThumbnail = hoveredItem && (!selectedItems.some(item => item.id === hoveredItem.id));

  return (
    <div className="container">

      
      <div className="vp-title" onClick={() => setShowAbout(!showAbout)}>+</div>
      
      {/* About 오버레이 */}
      <div className={`about-overlay ${showAbout ? 'show' : ''}`} onClick={() => setShowAbout(false)}>
        <div className="about-content" onClick={(e) => e.stopPropagation()}>
          <div className="about-close" onClick={() => setShowAbout(false)}>×</div>
          <div className="about-text">
            <p>
              <span className="site-name" onClick={() => { setShowAbout(false); router.reload(); }}>Vanishing Points</span> is a space for encountering images of distant landscapes through the eyes of Google's Street View. It emerged from the realization that, while we each live within separate coordinates, the sun's movement—and our act of watching it—remains shared.
              In those panoramic fragments, the subject is often missing. No one appears in the frame—only a shadow, a glitch, or a vanishing point hinting at a presence. These images evoke a peculiar sense of disappearing, as though something is watching back from behind the screen.
            </p>

            <p>
              The project is a temporary meditation on memory, absence, and the illusion of proximity. The globe, once known to us through paper maps and childhood globes, appears again in digital form—distorted, flattened, yet strangely emotional. By wandering through these virtual thresholds, we not only glimpse other landscapes but perhaps also reconnect with someone, somewhere, who once stood there.
            </p>

            <p>
                This website has been created by <a href="mailto:ahnownj@gmail.com" className="author-link">Eunjae Ahn</a> from 2025 Convergence Design III led by Jeanyoon Choi at <a href="https://www.karts.ac.kr/" target="_blank" className="university-link">Korea National University of Arts</a>.
            </p>
            
            <div className="about-image">
              <Image
                src="/img/IMG_2788 copy.JPG"
                alt="Project Image"
                width={360}
                height={240}
                style={{ width: '100%', height: 'auto', transform: 'scale(4)', transformOrigin: '58% 52%', filter: 'blur(4px)' }}
              />
            </div>
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
                className={`row ${selectedItems.some(selectedItem => selectedItem.id === item.id) ? 'selected' : ''}`}
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
              
              {selectedItems.some(selectedItem => selectedItem.id === item.id) && (
                <div className="main-streetview-container">
                  <div 
                    className={`main-streetview main-streetview-${item.id}`}
                    onDoubleClick={() => {
                      router.push(`/map?lat=${item.lat}&lng=${item.lng}`);
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
        body { margin: 0; padding: 0; overflow: hidden; background: #f0f0f0; color:rgb(90, 90, 90); }
        body::-webkit-scrollbar { display: none; }
        html { color-scheme: light; scrollbar-width: none; }
        
        /* Google UI 요소 숨김 */
        .gm-style-cc, .gmnoprint { 
          display: none !important; 
        }
        
        /* Google 로고 정교한 타겟팅 */
        .gm-style a[href*="google.com"] {
          display: none !important;
        }
        
        .gm-style a[target="_blank"][href*="google.com"] {
          display: none !important;
        }
        
        .gm-style div[style*="font-family: Roboto, sans-serif"] {
          display: none !important;
        }
        
        .gm-style div[style*="color: rgb(68, 68, 68)"][style*="font-size: 10px"] {
          display: none !important;
        }
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
          overflow: hidden;
        }
        

        
        .main-streetview-container {
          width: 100%;
          height: 400px;
          grid-column: 1 / -1;
          position: relative;
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
        
        .header > div { 
          cursor: pointer; 
          user-select: none; 
          transition: opacity 0.2s ease;
        }
        
        .header > div:hover {
          opacity: 0;
        }
        
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
          transition: left 1s ease-in-out;
        }
        
        .about-overlay.show {
          left: 0;
        }
        
        .about-content {
          width: 400px;
          height: 100vh;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          padding: 100px 20px 20px 20px;
          overflow-y: auto;
          position: relative;
          scrollbar-width: none;
        }
        
        .about-content::-webkit-scrollbar {
          display: none;
        }
        
        .about-close {
          position: absolute;
          top: 12px;
          right: 20px;
          font-size: 20px;
          cursor: pointer;
          color: rgb(60, 60, 60);
          transition: opacity 0.2s ease;
        }
        
        .about-close:hover {
          opacity: 0;
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
        
        .about-text .site-name, .about-text .university-link, .about-text .author-link {
          color: rgb(60, 60, 60);
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        
        .about-text .site-name:hover, .about-text .university-link:hover, .about-text .author-link:hover {
          opacity: 0;
        }
        
        .about-image {
          margin-top: 500px;
          width: 100%;
          height: 660px;
          overflow: hidden;
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

