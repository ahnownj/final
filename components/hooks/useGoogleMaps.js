import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

// 전역 Google Maps 인스턴스 캐시
let globalGoogleMaps = null;
let loaderPromise = null;

// 일관된 Google Maps 설정
const GOOGLE_MAPS_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
  libraries: ['places'] // 모든 페이지에서 동일한 라이브러리 사용
};

export const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(!!globalGoogleMaps);
  const [error, setError] = useState(null);
  const googleRef = useRef(globalGoogleMaps);

  useEffect(() => {
    const initGoogleMaps = async () => {
      // 이미 로드된 경우 바로 반환
      if (globalGoogleMaps) {
        googleRef.current = globalGoogleMaps;
        setIsLoaded(true);
        return;
      }

      // 이미 로딩 중인 경우 기다림
      if (loaderPromise) {
        try {
          const google = await loaderPromise;
          globalGoogleMaps = google;
          googleRef.current = google;
          setIsLoaded(true);
        } catch (err) {
          setError(err.message);
        }
        return;
      }

      try {
        if (!GOOGLE_MAPS_CONFIG.apiKey || GOOGLE_MAPS_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
          throw new Error('Google Maps API 키가 설정되지 않았습니다.');
        }

        // 새로운 로더 생성 및 로딩 시작
        const loader = new Loader(GOOGLE_MAPS_CONFIG);
        loaderPromise = loader.load();
        
        const google = await loaderPromise;
        globalGoogleMaps = google;
        googleRef.current = google;
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load Google Maps API:', err);
        setError(err.message);
        loaderPromise = null; // 실패 시 재시도 가능하도록 초기화
      }
    };

    initGoogleMaps();
  }, []);

  return {
    google: googleRef.current,
    isLoaded,
    error
  };
};

export default useGoogleMaps; 