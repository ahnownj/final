import dynamic from 'next/dynamic';

const GravityField = dynamic(() => import('../components/gravity'), { ssr: false });

export default function GravityPage() {
  return (
    <div className="gravity-page">
      <GravityField maxItems={30} />

      <style jsx>{`
        .gravity-page {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          background: #fff;
        }
      `}</style>
    </div>
  );
}

