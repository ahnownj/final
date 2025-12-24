import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AboutOverlay() {
  const router = useRouter();
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    setShowAbout(false);
  }, [router.asPath]);

  const allowedPaths = ['/map', '/list', '/main', '/gravity'];
  const isMapPanoView = router.pathname === '/map' && router.query?.pano === '1';
  const showAboutButton = allowedPaths.includes(router.pathname) && !isMapPanoView;

  if (!showAboutButton) return null;

  const handleSiteNameClick = () => {
    setShowAbout(false);
    router.reload();
  };

  return (
    <>
      {!showAbout && (
        <div className="vp-title" onClick={() => setShowAbout(true)} aria-label="Open about overlay">
          +
        </div>
      )}

      <div className={`about-overlay ${showAbout ? 'show' : ''}`} onClick={() => setShowAbout(false)}>
        <div className="about-content" onClick={(e) => e.stopPropagation()}>
          <div className="about-close" onClick={() => setShowAbout(false)}>
            ×
          </div>
          <div className="about-text">
            <p>
              <span className="site-name" onClick={handleSiteNameClick}>WorldWithoutWords</span> is a space for encountering images of distant landscapes through the eyes of Google's Street View. It emerged from the realization that, while we each live within separate coordinates, the sun's movement—and our act of watching it—remains shared.
              In those panoramic fragments, the subject is often missing. No one appears in the frame—only a shadow, a glitch, or a vanishing point hinting at a presence. These images evoke a peculiar sense of disappearing, as though something is watching back from behind the screen.
            </p>

            <p>
              The project is a temporary meditation on memory, absence, and the illusion of proximity. The Earth, once known to us through paper maps and childhood globes, appears again in digital form—distorted, flattened, yet strangely emotional. By wandering through these virtual thresholds, we not only glimpse other landscapes but perhaps also reconnect with someone, somewhere, who once stood there.
            </p>

            <p>
              This website has been created by <a href="mailto:ahnownj@gmail.com" className="author-link">Eunjae Ahn</a> from 2025 Convergence Design III led by Jeanyoon Choi at <a href="https://www.karts.ac.kr/" target="_blank" rel="noreferrer" className="university-link">Korea National University of Arts</a>.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
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

        .about-text .site-name,
        .about-text .university-link,
        .about-text .author-link {
          color: #fff;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .about-text .site-name:hover,
        .about-text .university-link:hover,
        .about-text .author-link:hover {
          opacity: 0;
        }

        .vp-title {
          position: fixed;
          top: 12px;
          left: 20px;
          font-size: 20px;
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, 'Pretendard', 'Noto Sans', sans-serif;
          color: #fff;
          z-index: 1600;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .vp-title:hover {
          color: #ffd400;
        }

        /* About 텍스트 선택 시 노란 하이라이트를 모든 페이지에서 공통 적용 */
        :global(.about-text::selection),
        :global(.about-text *::selection) {
          background: #ffd400;
          color: #111;
        }
      `}</style>
    </>
  );
}

