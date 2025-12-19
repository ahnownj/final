import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { places } from '../data/places';
import Image from 'next/image';
import { loadGoogleMaps } from '../lib/googleMaps';
import { getSavedNote, NOTE_EVENT_NAME } from '../components/note';
import { fetchNoteForPlace } from '../lib/notesApi';

const THUMBNAIL_WIDTH = 210, THUMBNAIL_HEIGHT = 100;

const extractNoteBody = (text) => {
  if (!text || typeof text !== 'string') return '';
  const lines = text.split('\n');
  if (!lines.length) return '';
  lines.shift(); // drop header line
  while (lines.length && lines[0] === '') lines.shift(); // drop leading blanks
  return lines.join('\n');
};

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
        const google = await loadGoogleMaps();
        googleRef.current = google;
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
      }
    };
    initGoogleMaps();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const touch =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(touch);
    return undefined;
  }, []);

  useEffect(() => {
    let active = true;
    const loadNote = async () => {
      if (!selectedItem) {
        setSelectedNote(null);
        return;
      }
      const remote = await fetchNoteForPlace(selectedItem.id);
      if (!active) return;
      if (remote) {
        setSelectedNote({
          body: remote.body || '',
          author: remote.author || '익명',
          timestamp: formatTimestamp(remote.updated_at),
        });
        return;
      }
      const saved = getSavedNote(selectedItem.id);
      if (saved) {
        setSelectedNote({
          body: saved.body || extractNoteBody(saved.text || ''),
          author: saved.author || '익명',
          timestamp: saved.timestamp || '',
        });
        return;
      }
      setSelectedNote(null);
    };
    loadNote();
    return () => {
      active = false;
    };
  }, [selectedItem]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleNoteUpdate = (event) => {
      if (!selectedItem) return;
      if (event.detail?.placeId === selectedItem.id) {
        setSelectedNote(event.detail.data);
      }
    };
    window.addEventListener(NOTE_EVENT_NAME, handleNoteUpdate);
    return () => window.removeEventListener(NOTE_EVENT_NAME, handleNoteUpdate);
  }, [selectedItem]);

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
    setSelectedItem(null);
    setSelectedNote(null);
    if (mainStreetViewInstanceRef.current) {
      mainStreetViewInstanceRef.current.setVisible(false);
    }
    
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

  useEffect(() => {
    if (!isLoaded) return;
    const container = document.querySelector('.thumbnail .streetview-container');
    if (!container || streetViewInstanceRef.current) return;

    streetViewInstanceRef.current = createStreetView(container);

    if (streetViewInstanceRef.current) {
      const initialTarget = data[0] || places.find(p => !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng))) || {};
      const initialLat = parseFloat(initialTarget?.lat) || 37.5665;
      const initialLng = parseFloat(initialTarget?.lng) || 126.9780;
      streetViewInstanceRef.current.setOptions({
        position: { lat: initialLat, lng: initialLng },
        pov: { heading: 90, pitch: 15, zoom: 10 },
        visible: false
      });
    }
  }, [isLoaded, data]);

  const handleMouseEnter = (item, event) => {
    if (!isLoaded || !streetViewInstanceRef.current) return;
    setHoveredItem(item);
    
    const thumbnail = document.querySelector('.thumbnail');
    if (thumbnail) {
      const rowRect = event.currentTarget.getBoundingClientRect();
      const thumbnailTop = Math.max(Math.min(rowRect.bottom - THUMBNAIL_HEIGHT, window.innerHeight - THUMBNAIL_HEIGHT - 20), 20);
      thumbnail.style.top = `${thumbnailTop}px`;
    }

    streetViewInstanceRef.current.setOptions({
      position: { lat: parseFloat(item.lat), lng: parseFloat(item.lng) },
      pov: { heading: 90, pitch: 15, zoom: 10 },
      visible: true
    });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleRowClick = (item) => {
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
      setSelectedNote(null);
      if (mainStreetViewInstanceRef.current) {
        mainStreetViewInstanceRef.current.setVisible(false);
      }
      return;
    }
    setSelectedItem(item);
  };

  const handleOpenPano = (item) => {
    router.push({
      pathname: '/pano',
      query: { id: item.id, lat: item.lat, lng: item.lng },
    });
  };

  useEffect(() => {
    if (!selectedItem || !isLoaded) return;

    const timer = setTimeout(() => {
      const mainContainer = document.querySelector(`.main-streetview-${selectedItem.id}`);
      if (!mainContainer) return;

      const existingContainer = mainContainer.querySelector('.streetview-container');
      if (existingContainer) existingContainer.remove();

      const newContainer = document.createElement('div');
      newContainer.className = 'streetview-container';
      newContainer.style.cssText = 'width: 100%; height: 100%;';
      mainContainer.appendChild(newContainer);

      mainStreetViewInstanceRef.current = createStreetView(newContainer);

      if (mainStreetViewInstanceRef.current) {
        mainStreetViewInstanceRef.current.setOptions({
          position: { lat: parseFloat(selectedItem.lat), lng: parseFloat(selectedItem.lng) },
          pov: { heading: -90, pitch: 0, zoom: 10 },
          visible: true
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedItem, isLoaded]);

  // 썸네일 표시 조건 수정: ID로 비교
  const shouldShowThumbnail = hoveredItem && (!selectedItem || selectedItem.id !== hoveredItem.id);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredData = normalizedSearch
    ? data.filter((item) => {
        const haystack = [
          item.lat,
          item.lng,
          item.user,
          item.place,
          item.date,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : data;

  return (
    <>
      <div className="container">
        <div className="vp-title" onClick={() => setShowAbout(!showAbout)}>+</div>

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
            </div>
          </div>
        </div>
        
        <div className="thumbnail-area">
          <div className={`thumbnail ${shouldShowThumbnail ? 'show' : 'hide'}`}>
            <div className="streetview-container" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
        
        <div className="archive-area">
          <div className="search-row">
            <div className="search-inner">
              <input
                className="search-input"
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
              />
              <button
                type="button"
                className="search-btn"
                aria-label="search"
                onClick={() => setSearchTerm((v) => v.trim())}
              >
                <span className="sr-only">Search</span>
              </button>
            </div>
          </div>

          <div className="header">
            <div onClick={() => sort('lat')}>LAT {sortKey === 'lat' && (sortDir === 'asc' ? '▲' : '▼')}</div>
            <div onClick={() => sort('lng')}>LNG {sortKey === 'lng' && (sortDir === 'asc' ? '▲' : '▼')}</div>
            <div onClick={() => sort('user')}>USER {sortKey === 'user' && (sortDir === 'asc' ? '▲' : '▼')}</div>
            <div onClick={() => sort('place')}>TITLE {sortKey === 'place' && (sortDir === 'asc' ? '▲' : '▼')}</div>
            <div className="date-cell header-date" onClick={() => sort('date')}>
              DATE {sortKey === 'date' && (sortDir === 'asc' ? '▲' : '▼')}
            </div>
          </div>
          
          <div className="rows">
            {filteredData.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div key={item.id}>
                  <div 
                    className={`row ${isSelected ? 'selected' : ''}`}
                    onMouseEnter={(event) => handleMouseEnter(item, event)} 
                    onMouseLeave={handleMouseLeave} 
                    onClick={() => handleRowClick(item)}
                  >
                    <div className="coord lat-cell" data-label="LAT">{item.lat}</div>
                    <div className="coord lng-cell" data-label="LNG">{item.lng}</div>
                    <div className="user-cell" data-label="USER">{item.user}</div>
                    <div className="place" data-label="TITLE">{item.place}</div>
                    <div className="date-cell" data-label="DATE">{item.date}</div>
                  </div>
                  
                  {isSelected && (
                    <div className="main-streetview-container">
                      <div 
                        className={`main-streetview main-streetview-${item.id}`}
                        onDoubleClick={() => handleOpenPano(item)}
                        onClick={isTouchDevice ? () => handleOpenPano(item) : undefined}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleOpenPano(item);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {isTouchDevice && (
                          <button
                            type="button"
                            className="pano-touch-overlay"
                            aria-label="open panorama"
                            onClick={() => handleOpenPano(item)}
                          />
                        )}
                      </div>
                      {selectedNote && (
                        <div className="note-preview">
                          <div className="note-preview-text">
                            {selectedNote.body || extractNoteBody(selectedNote.text || '')}
                          </div>
                          <div className="note-preview-meta">
                            <span>{selectedNote.author || '익명'}</span>
                            <span>{selectedNote.timestamp || ''}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root { --vp-bg: #000; }
        * { box-sizing: border-box; }
        ::selection { background: #ffd400;; color: #111; }
        html, body {
          margin: 0;
          padding: 0;
          min-height: 100vh;
          color: #fff;
          background: #000 !important;
          overflow-x: hidden;
        }
        body::-webkit-scrollbar { display: none; }
        
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
        @media (max-width: 768px) {
          body {
            overflow-y: auto;
          }
        }
      `}</style>
      
      <style jsx>{`
        .container {
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px;
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
          color: #fff;
          }
        
        .thumbnail {
          position: fixed;
          left: 20px;
          width: ${THUMBNAIL_WIDTH}px;
          height: ${THUMBNAIL_HEIGHT}px;
          z-index: 1000;
          background: rgba(255, 255, 255, 0);
          border: 1px solid rgba(255, 255, 255, 0);
          backdrop-filter: blur(4px);
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
        }
        .thumbnail.show { opacity: 1; pointer-events: auto; }
        .thumbnail.hide { opacity: 0; pointer-events: none; }
        

        
        .main-streetview-container {
          width: 100%;
          grid-column: 1 / -1;
          position: relative;
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0);
          background: rgba(0, 0, 0, 0);
          backdrop-filter: blur(6px);
          margin-bottom: 20px;
        }
        
        .main-streetview {
          width: 100%;
          height: 320px;
          background: rgba(255, 255, 255, 0);
          cursor: pointer;
          position: relative;
        }
        .pano-touch-overlay {
          position: absolute;
          inset: 0;
          border: none;
          padding: 0;
          margin: 0;
          background: transparent;
          cursor: pointer;
          z-index: 2;
        }
        
        .note-preview { border-top: 1px solid rgb(255, 255, 255); padding: 18px 20px; background: rgba(0, 0, 0, 0.4); min-height: 120px; }
        .note-preview-text { font-size: 14px; color: #fff; line-height: 1.6; white-space: pre-wrap; }
        .note-preview-meta { margin-top: 12px; display: flex; justify-content: space-between; font-size: 12px; color: rgba(255, 255, 255, 0.7); letter-spacing: 0.3px; }
        .note-preview-meta span { color: inherit; }
        

        
        .header, .row {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 0.95fr) minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(0, 0.95fr);
          gap: 8px;
          padding: 8px 12px;
          min-height: 30px;
          align-items: center;
          width: 100%;
        }
        
        .header {
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          position: sticky;
          top: 0;
          background: rgba(255, 255, 255, 0);
          backdrop-filter: blur(8px);
          z-index: 5;
          border-bottom: 1px solid rgba(255, 255, 255, 0);
        }
        
        .header > div { 
          cursor: pointer; 
          user-select: none; 
          transition: opacity 0.2s ease;
        }
        
        @media (hover: hover) {
          .header > div:hover {
            opacity: 0;
          }
        }
        
        .rows {
          height: calc(100vh - 80px);
          overflow-y: auto;
        }
        
        .rows::-webkit-scrollbar { display: none; }
        
        .row {
          border-bottom: 1px solid rgba(255, 255, 255, 0);
          cursor: pointer;
        }
        
        .row:hover:not(.selected) { 
          background-color: #ffd400; 
          color: #111;
        }
        .row:hover:not(.selected) > div {
          color: #111;
        }
        .row.selected { background-color: rgba(255, 255, 255, 0); }
        
        .coord {
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, 'Pretendard', 'Noto Sans', sans-serif;
          font-size: 12px;
        }

        .date-cell {
          justify-content: flex-end;
          text-align: right;
          min-width: 72px;
        }

        .search-row {
          display: flex;
          justify-content: flex-end;
          margin: 0 0 12px 0;
          padding: 0 12px;
          position: static;
        }
        .search-inner {
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.85);
          width: 100%;
          max-width: 100%;
          gap: 8px;
          padding-bottom: 6px;
          box-shadow: none;
        }
        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font: inherit;
          padding: 0;
          outline: none;
        }
        .search-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          position: relative;
          flex-shrink: 0;
          display: inline-block;
          line-height: 1;
          -webkit-tap-highlight-color: transparent;
        }
        .search-btn:focus { outline: none; }
        .search-btn::before,
        .search-btn::after {
          content: '';
          position: absolute;
          display: block;
          pointer-events: none;
        }
        .search-btn::before {
          width: 9px;
          height: 9px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 50%;
          top: 0.7px;
          left: 0.7px;
        }
        .search-btn::after {
          width: 7px;
          height: 1px;
          background: rgba(255, 255, 255, 0.85);
          transform: rotate(45deg);
          transform-origin: left center;
          left: 9px;
          top: 9px;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }

        .header > div, .row > div {
          white-space: nowrap;
          overflow: hidden;
          min-width: 0;
          line-height: 1.4;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 100%;
          flex-shrink: 1;
        }
        .lat-cell, .lng-cell { max-width: 100%; }
        .user-cell { max-width: 100%; }
        .place { max-width: 100%; }
        .date-cell { max-width: 100%; }
        
        @media (min-width: 800px) {
          .container { padding: 100px 10px 0 250px; }
          .thumbnail-area { width: 250px; margin-left: -250px; }
        }

        @media (min-width: 1024px) {
          .search-row {
            position: fixed;
            top: 12px;
            right: 20px;
            left: auto;
            width: 240px;
            max-width: 240px;
            padding: 0;
          }
          .search-inner { width: 100%; max-width: 100%; margin-left: auto; margin-right: auto; }
        }
        
        @media (max-width: 799px) {
          .gravity-section {
            padding: 80px 12px 0;
          }
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
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0);
          backdrop-filter: blur(6px);
          padding: 60px 6vw;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .about-close {
          position: absolute;
          top: 12px;
          right: 20px;
          font-size: 20px;
          cursor: pointer;
          color: #fff;
          transition: opacity 0.2s ease;
        }
        
        .about-close:hover {
          opacity: 0;
        }
        
        .about-text {
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, 'Pretendard', 'Noto Sans', sans-serif;
          font-size: 15px;
          line-height: 1.7;
          color: #fff;
          max-width: 760px;
          width: 100%;
          max-height: calc(100vh - 140px);
          overflow-y: auto;
          padding-right: 12px;
        }
        
        .about-text::-webkit-scrollbar { width: 4px; }
        .about-text::-webkit-scrollbar-track { background: transparent; }
        .about-text::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
        
        .about-text p {
          margin: 0 0 18px 0;
        }
        
        .about-text p:last-child {
          margin-bottom: 0;
        }
        
        .about-text .site-name, .about-text .university-link, .about-text .author-link {
          color: #fff;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        
        .about-text .site-name:hover, .about-text .university-link:hover, .about-text .author-link:hover {
          opacity: 0;
        }
        
        /* 모바일 초소형 해상도(≤430px)에서도 한 줄 유지 */
        @media (max-width: 430px) {
          .header, .row {
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1.05fr) minmax(0, 0.85fr);
            gap: 6px;
          }
          .header {
            font-size: 11px;
          }
          .row {
            padding: 10px 10px;
          }
          .row > div {
            white-space: nowrap;
            overflow: hidden;
            line-height: 1.35;
            font-size: 11px;
          }
          .lat-cell, .lng-cell,
          .user-cell,
          .place,
          .date-cell { max-width: 100%; }
          .coord {
            font-size: 11px;
          }
          .place {
            line-height: 1.35;
          }
          .row > div::before {
            content: none;
          }
        }
        
        .vp-title {
          position: fixed;
          top: 12px;
          left: 20px;
          font-size: 20px;
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, 'Pretendard', 'Noto Sans', sans-serif;
          color: #fff;
          z-index: 1001;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .vp-title:hover {
          color: #ffd400;
        }
        
        @media (max-width: 768px) {
          html, body {
            background-attachment: scroll;
          }
          .container {
            flex-direction: column;
            padding: 70px 16px 40px;
            gap: 24px;
            height: auto;
          }
          .archive-area {
            width: 100%;
          }
          .rows {
            height: auto;
            max-height: none;
            overflow-y: visible;
          }
          .main-streetview-container {
            height: auto;
          }
          .main-streetview {
            height: 260px;
          }
          .note-preview {
            padding: 14px;
          }
          .search-row {
            justify-content: flex-start;
            margin-bottom: 12px;
          }
          .search-inner {
            width: 100%;
          }
        }

        .row.selected {
          min-height: auto !important;
          align-items: center !important;
        }
      `}</style>
    </>
  );
}

