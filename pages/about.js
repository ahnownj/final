import { useRouter } from 'next/router';

export default function About() {
  const router = useRouter();

  return (
    <div className="container">
      <div className="thumbnail-area"></div>
      
      <div className="archive-area">
        <div className="content">
          {/* 여기에 소개글을 입력하세요 */}
          <p>
            It's a strange comfort to know that, somewhere on this spinning Earth, someone else is watching the same sun setting—though we may never meet, and though our lives never intersect.
          </p>
          
                      <p>
           <span className="site-name" onClick={() => router.push('/gravity')}>Vanishing Points</span> is a space for encountering images of distant landscapes through the eyes of Google's Street View. It emerged from the realization that, while we each live within separate coordinates, the sun's movement—and our act of watching it—remains shared.
           Often, in those panoramic fragments, the subject is missing. There is no one in the frame—only a shadow, a glitch, a vanishing point where someone once stood. These images evoke a peculiar sense of loss and presence, as though something is watching back from behind the screen.
            </p>

          <p>
          The project is a temporary meditation on memory, absence, and the illusion of proximity. The globe, once known to us through paper maps and childhood globes, appears again in digital form—distorted, flattened, yet strangely emotional. By wandering through these virtual thresholds, we not only glimpse other landscapes, but perhaps also reconnect with someone, somewhere, who once watched the same sun.
          </p>

          <p>
          This website has been created by Eunjae Ahn from 2025 Convergence Design III led by Jeanyoon Choi at Korea National University of Arts.
          </p>

        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow-x: hidden; background: #f0f0f0; color: rgb(90, 90, 90); }
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
        
        .content {
          padding: 8px 12px;
          line-height: 1.6;
        }
        
        .content p {
          margin: 0 0 16px 0;
        }
        
        .content p:last-child {
          margin-bottom: 0;
        }
        
        .site-name {
          cursor: pointer;
          transition: color 0.2s ease;
        }
        
        .site-name:hover {
          color: yellow;
        }
        
        @media (min-width: 800px) {
          .container { padding-left: 250px; }
          .thumbnail-area { width: 210px; }
        }
      `}</style>
    </div>
  );
}