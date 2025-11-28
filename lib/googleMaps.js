import { Loader } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_LIBRARIES = ['geometry', 'marker', 'places'];
const GOOGLE_MAPS_SCRIPT_ID = '__vp_google_maps_script';

let loaderPromise = null;

export const loadGoogleMaps = () => {
  if (!loaderPromise) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_GOOGLE_KEY 환경변수가 설정되어 있지 않습니다.');
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      id: GOOGLE_MAPS_SCRIPT_ID,
      libraries: GOOGLE_MAPS_LIBRARIES,
    });

    loaderPromise = loader.load();
  }

  return loaderPromise;
};

export const getGoogleMapsLibraries = () => [...GOOGLE_MAPS_LIBRARIES];


