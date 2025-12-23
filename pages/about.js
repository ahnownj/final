import { useRouter } from 'next/router';

export default function About() {
  const router = useRouter();

  return (
    <div className="container">
      <div className="content">
        <p>
          It's a strange comfort to know that, somewhere on this spinning Earth, someone else is
          watching the same sun setting—though we may never meet, and though our lives never
          intersect.
        </p>

        <p>
          <span className="site-name" onClick={() => router.push('/gravity')}>
            WorldWithoutWords
          </span>{' '}
          is a space for encountering images of distant landscapes through the eyes of Google&apos;s
          Street View. It emerged from the realization that, while we each live within separate
          coordinates, the sun&apos;s movement—and our act of watching it—remains shared. In those
          panoramic fragments, the subject is missing. No one appears in the frame—only a shadow, a
          glitch, a vanishing point hinting at a presence. These images evoke a peculiar sense of
          loss and presence, as though something is watching back from behind the screen.
        </p>

        <p>
          The project is a temporary meditation on memory, absence, and the illusion of proximity.
          The Earth, once known to us through paper maps and childhood globes, appears again in
          digital form—distorted, flattened, yet strangely emotional. By wandering through these
          virtual thresholds, we not only glimpse other landscapes, but perhaps also reconnect with
          someone, somewhere, who once watched the same sun.
        </p>

        <p>
          This website has been created by Eunjae Ahn from 2025 Convergence Design III led by
          Jeanyoon Choi at Korea National University of Arts.
        </p>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        ::selection {
          background: #ffd400;
          color: #111;
        }
        body {
          margin: 0;
          padding: 0;
          background: #f3f3f3;
          color: rgba(255, 255, 255, 0.45);
          height: 100vh;
          overflow: hidden;
          font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        html {
          color-scheme: light;
        }
      `}</style>

      <style jsx>{`
        .container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 5vw;
          background: rgba(255, 255, 255, 0.95);
        }

        .content {
          max-width: 760px;
          width: 100%;
          line-height: 1.7;
          font-size: 15px;
          overflow-y: auto;
          max-height: calc(100vh - 80px);
          padding-right: 12px;
        }

        .content p {
          margin: 0 0 18px 0;
        }

        .content p:last-child {
          margin-bottom: 0;
        }

        .site-name {
          cursor: pointer;
          transition: color 0.2s ease;
          color: #111;
        }

        .site-name:hover {
          color: #ffd400;
        }

        @media (max-width: 768px) {
          .container {
            padding: 24px 6vw;
          }
          .content {
            font-size: 14px;
            max-height: calc(100vh - 60px);
          }
        }
      `}</style>
    </div>
  );
}