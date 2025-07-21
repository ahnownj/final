import "@/styles/globals.css";
import { createGlobalStyle, ThemeProvider } from 'styled-components';
// import CustomCursor from '@/components/layout/Cursor';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: 'Open Sans', sans-serif;
    min-height: 100vh;
  }
`;

const theme = {
  colors: {
    primary: '#333',
  },
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [currentEmoji, setCurrentEmoji] = useState('');

  // 회전하는 지구본 이모지
  useEffect(() => {
    const emojis = ['🌍', '🌎', '🌏'];
    let currentIndex = 0;
    
    setCurrentEmoji(emojis[currentIndex]);
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % 3;
      setCurrentEmoji(emojis[currentIndex]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // 지구본 클릭 핸들러
  const handleGlobeClick = () => {
    if (router.pathname === '/') {
      router.push('/map');
    } else if (router.pathname === '/map') {
      router.push('/');
    }
  };

  useEffect(() => {
    let scrollTimer;
    
    const handleScroll = () => {
      document.body.style.setProperty('--scrollbar-opacity', '1');
      
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        document.body.style.setProperty('--scrollbar-opacity', '0');
      }, 1500); // 스크롤 멈춘 후 1.5초 후에 숨김
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      {/* <CustomCursor /> */}
      {/* map 페이지가 아닐 때만 지구본 표시 (map 페이지는 자체 지구본을 가짐) */}
      {router.pathname !== '/map' && (
        <div className="site-title" onClick={handleGlobeClick}>
          {currentEmoji}
        </div>
      )}
      <Component {...pageProps} />
      
      <style jsx>{`
        .site-title {
          position: fixed;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 28px;
          z-index: 1001;
          cursor: pointer;
        }
      `}</style>
    </ThemeProvider>
  );
}
