import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const WorldGenerator = dynamic(() => import('../components/world'), { ssr: false });

const DEFAULT_COORDS = { lat: 37.5665, lng: 126.978 };

export default function WorldPage() {
  const router = useRouter();
  const lat = router.query.lat ? parseFloat(router.query.lat) : DEFAULT_COORDS.lat;
  const lng = router.query.lng ? parseFloat(router.query.lng) : DEFAULT_COORDS.lng;

  return (
    <div className="world-page">
      <button className="world-title" onClick={() => router.push('/')}>
        3D
      </button>
      <WorldGenerator lat={lat} lng={lng} heading={router.query.heading ? parseFloat(router.query.heading) : 0} />

      <style jsx>{`
        .world-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #000;
        }
        .world-title {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          color: #fff;
          font-size: 18px;
          letter-spacing: 2px;
          padding: 6px 20px;
          cursor: pointer;
          border: none;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}

