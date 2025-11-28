import dynamic from 'next/dynamic';

const MapMobile = dynamic(() => import('../components/MapMobile'), { ssr: false });

export default function MapPage() {
  return <MapMobile />;
}
    