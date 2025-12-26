import "@/styles/globals.css";
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import GlobeOverlay from '@/components/globe';
import AboutOverlay from '@/components/AboutOverlay';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: 'Routed Gothic', -apple-system, BlinkMacSystemFont, 'Pretendard', 'Noto Sans', sans-serif;
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
  const motionRequestedRef = useRef(false);

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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = async () => {
      if (motionRequestedRef.current) return;
      motionRequestedRef.current = true;
      const isSecure = window.isSecureContext;
      const hasOrientation = typeof window.DeviceOrientationEvent !== 'undefined';
      const needsPrompt =
        typeof window.DeviceOrientationEvent?.requestPermission === 'function' ||
        typeof window.DeviceMotionEvent?.requestPermission === 'function';
      if (!isSecure || !hasOrientation || !needsPrompt) return;
      try {
        if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
          await window.DeviceOrientationEvent.requestPermission();
        }
        if (typeof window.DeviceMotionEvent?.requestPermission === 'function') {
          await window.DeviceMotionEvent.requestPermission();
        }
      } catch (_) {
        /* ignore */
      }
    };
    const options = { passive: true, capture: true };
    window.addEventListener('pointerdown', handler, options);
    window.addEventListener('touchstart', handler, options);
    window.addEventListener('click', handler, options);
    return () => {
      window.removeEventListener('pointerdown', handler, options);
      window.removeEventListener('touchstart', handler, options);
      window.removeEventListener('click', handler, options);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <GlobeOverlay key={router.asPath} />
      <AboutOverlay />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
