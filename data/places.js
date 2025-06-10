// 🌍 Places 데이터베이스
// 전 세계의 360도 Photo Sphere 위치들

export const places = [
  // 🌟 기존 예시들
  {
    id: 'sikhote-alin',
    lat: 45.28697617844455,
    lng: 136.192660137261,
    title: "Sikhote-Alin Nature Reserve",
    description: "Andy Pooh - Sep 2015",
    country: "Russia",
    embedUrl: "https://www.google.com/maps/embed?pb=!4v1749148508895!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJRDQwYWpmblFF!2m2!1d45.28697617844455!2d136.192660137261!3f266.57502435186365!4f-20.002983032905277!5f0.7820865974627469"
  },
  {
    id: 'middle-east',
    lat: 31.49140812714093,
    lng: 34.4085267976272,
    title: "Gaza Strip",
    description: "عبدالرحمن احمد - Jul 2022",
    country: "Palestine",
    embedUrl: "https://www.google.com/maps/embed?pb=!4v1749149562764!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJRE93NW1CNGdF!2m2!1d31.49140812714093!2d34.4085267976272!3f328.89718386468115!4f-1.5661410659005952!5f0.7820865974627469"
  }

  // 📍 새로운 Places 추가 템플릿:
  // {
  //   id: 'unique-place-id',
  //   lat: 위도,
  //   lng: 경도,
  //   title: "장소명",
  //   description: "설명",
  //   country: "국가",
  //   embedUrl: "https://www.google.com/maps/embed?pb=..." // 선택사항
  // },
];

// 🔍 유틸리티 함수들
export const getPlaceById = (id) => {
  return places.find(place => place.id === id);
};

export const getPlacesByCountry = (country) => {
  return places.filter(place => place.country === country);
};

export const getAllCountries = () => {
  return [...new Set(places.map(place => place.country))].sort();
};

export const getRandomPlace = () => {
  return places[Math.floor(Math.random() * places.length)];
};

export const getPlacesInBounds = (north, south, east, west) => {
  return places.filter(place => {
    return place.lat <= north && 
           place.lat >= south && 
           place.lng <= east && 
           place.lng >= west;
  });
};

export default places; 