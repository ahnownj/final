import "@/styles/globals.css";
import { createGlobalStyle, ThemeProvider } from 'styled-components';
// import CustomCursor from '@/components/layout/Cursor';
import { useEffect } from 'react';

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
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
