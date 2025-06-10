// import { useEffect, useRef, useState } from 'react';
// import { Loader } from '@googlemaps/js-api-loader';
// import { places } from '../data/places';

// export default function MapPage() {
//   const mapRef = useRef(null);
//   const streetViewRef = useRef(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState('');
//   const [clickedLocation, setClickedLocation] = useState('');
//   const [streetViewPanorama, setStreetViewPanorama] = useState(null);

//   useEffect(() => {
//     let isMounted = true;
//     let timeoutId;
//     let retryCount = 0;
//     const maxRetries = 50; // 최대 50번 재시도 (5초)

//     const initializeMap = async () => {
//       try {
//         retryCount++;
        
//         // 최대 재시도 횟수 초과 시 에러 처리
//         if (retryCount > maxRetries) {
//           console.error('❌ DOM 로딩 타임아웃 - 최대 재시도 횟수 초과');
//           setError('지도 로딩에 실패했습니다. 페이지를 새로고침해주세요.');
//           setIsLoading(false);
//           return;
//         }

//         // DOM 요소 확인 (단순화)
//         const mapElement = mapRef.current;
//         const streetViewElement = streetViewRef.current;
        
//         console.log(`🔍 DOM 체크 ${retryCount}/${maxRetries}:`, {
//           mapElement: !!mapElement,
//           streetViewElement: !!streetViewElement
//         });

//         if (!mapElement || !streetViewElement) {
//           console.log(`⏳ DOM 요소 대기 중... (${retryCount}/${maxRetries})`);
//           if (isMounted) {
//             timeoutId = setTimeout(initializeMap, 100);
//           }
//           return;
//         }

//         console.log('✅ DOM 준비 완료! 지도 초기화 시작');
        
//         const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
//         console.log('🗝️ API Key 존재:', !!apiKey);
        
//         if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
//           throw new Error('Google Maps API 키가 설정되지 않았습니다.');
//         }

//         const loader = new Loader({
//           apiKey: apiKey,
//           version: 'weekly',
//           libraries: ['places']
//         });

//         console.log('📦 Google Maps 로딩 중...');
//         const google = await loader.load();
//         console.log('✅ Google Maps API 로딩 완료!', {
//           maps: !!google.maps,
//           Map: !!google.maps.Map,
//           StreetViewPanorama: !!google.maps.StreetViewPanorama
//         });

//         // 🌍 위성지도 생성
//         const map = new google.maps.Map(mapRef.current, {
//           center: { lat: 35.0, lng: 127.0 },
//           zoom: 6,
//           minZoom: 2,
//           maxZoom: 20,
//           mapTypeId: 'satellite',
//           streetViewControl: false,
//           mapTypeControl: false,
//           fullscreenControl: false,
//           zoomControl: true,
//           restriction: {
//             latLngBounds: {
//               north: 85,
//               south: -85,
//               west: -180,
//               east: 180
//             },
//             strictBounds: true
//           },
//           styles: [
//             {
//               featureType: 'all',
//               elementType: 'labels',
//               stylers: [{ visibility: 'off' }]
//             },
//             {
//               featureType: 'administrative',
//               elementType: 'all',
//               stylers: [{ visibility: 'off' }]
//             },
//             {
//               featureType: 'road',
//               elementType: 'all',
//               stylers: [{ visibility: 'off' }]
//             },
//             {
//               featureType: 'transit',
//               elementType: 'all',
//               stylers: [{ visibility: 'off' }]
//             },
//             {
//               featureType: 'poi',
//               elementType: 'all',
//               stylers: [{ visibility: 'off' }]
//             }
//           ]
//         });

//         console.log('🎉 지도 생성 완료!', map);

//         // 🎬 스트리트 뷰 파노라마 생성 (모든 UI 제거)
//         const panorama = new google.maps.StreetViewPanorama(streetViewRef.current, {
//           addressControl: false,
//           linksControl: false,
//           panControl: false,
//           enableCloseButton: false,
//           fullscreenControl: false,
//           zoomControl: false,
//           clickToGo: true,
//           scrollwheel: true,
//           disableDoubleClickZoom: false,
//           showRoadLabels: false,
//           visible: false
//         });
        
//         setStreetViewPanorama(panorama);
//         console.log('🎬 스트리트 뷰 파노라마 생성 완료!', panorama);

//         // 지도 로드 완료 확인
//         google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
//           console.log('🖼️ 지도 타일 로딩 완료!');
//           setIsLoading(false);
//         });

//         // 타일 로딩 타임아웃 (10초)
//         setTimeout(() => {
//           if (isLoading) {
//             console.log('⚠️ 지도 타일 로딩 타임아웃, 강제로 로딩 완료 처리');
//             setIsLoading(false);
//           }
//         }, 10000);

//         // 🔵 Places 마커 생성 함수
//         const createExampleMarker = (placeData) => {
//           const marker = new google.maps.Marker({
//             position: { lat: placeData.lat, lng: placeData.lng },
//             map: map,
//             title: `${placeData.title} - ${placeData.description}`,
//             icon: {
//               path: google.maps.SymbolPath.CIRCLE,
//               scale: 4,
//               strokeColor: '#FFFFFF',
//               strokeWeight: 1,
//               strokeOpacity: 1
//             },
//             zIndex: 1001
//           });

//           marker.addListener('mouseover', () => {
//             marker.setIcon({
//               path: google.maps.SymbolPath.CIRCLE,
//               scale: 4,
//               strokeColor: '#FFFFFF',
//               strokeWeight: 2,
//               strokeOpacity: 1
//             });
//           });

//           marker.addListener('mouseout', () => {
//             marker.setIcon({
//               path: google.maps.SymbolPath.CIRCLE,
//               scale: 4,
//               strokeColor: '#FFFFFF',
//               strokeWeight: 1,
//               strokeOpacity: 1
//             });
//           });

//           marker.addListener('click', () => {
//             console.log(`🌟 Places 클릭: ${placeData.title}`);
            
//             if (panorama) {
//               panorama.setPosition({ lat: placeData.lat, lng: placeData.lng });
//               panorama.setVisible(true);
              
//               const randomHeading = Math.random() * 360;
//               const randomPitch = Math.random() * 30 - 10;
              
//               panorama.setPov({
//                 heading: randomHeading,
//                 pitch: randomPitch
//               });
//               panorama.setZoom(1);
              
//               setClickedLocation(`${placeData.title} - ${placeData.description}`);
//               map.panTo({ lat: placeData.lat, lng: placeData.lng });
//             }
//           });

//           console.log(`✅ Places 마커 추가: ${placeData.title}`);
//         };

//         // 🌍 Places 마커들 생성
//         console.log(`🌟 ${places.length}개의 Places 로딩 중...`);
//         places.forEach((place, index) => {
//           setTimeout(() => {
//             createExampleMarker(place);
//           }, index * 10);
//         });

//         // 🔥 지도 클릭 이벤트
//         map.addListener('click', (event) => {
//           const lat = event.latLng.lat();
//           const lng = event.latLng.lng();
          
//           console.log(`🌍 지도 클릭: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          
//           const streetViewService = new google.maps.StreetViewService();
//           streetViewService.getPanorama({
//             location: { lat, lng },
//             radius: 50,
//             source: google.maps.StreetViewSource.OUTDOOR
//           }, (data, status) => {
//             if (status === 'OK' && data && data.location) {
//               const actualLat = data.location.latLng.lat();
//               const actualLng = data.location.latLng.lng();
              
//               console.log(`✅ Places 발견: ${actualLat}, ${actualLng}`);
              
//               if (panorama) {
//                 panorama.setPosition({ lat: actualLat, lng: actualLng });
//                 panorama.setVisible(true);
                
//                 const randomHeading = Math.random() * 360;
//                 const randomPitch = Math.random() * 30 - 10;
                
//                 panorama.setPov({
//                   heading: randomHeading,
//                   pitch: randomPitch
//                 });
//                 panorama.setZoom(1);
                
//                 setClickedLocation(`위도: ${actualLat.toFixed(4)}, 경도: ${actualLng.toFixed(4)}`);
//                 map.panTo({ lat: actualLat, lng: actualLng });
//               }
//             } else {
//               console.log('🔍 50m 반경에서 못 찾음, 200m로 확대 검색...');
//               streetViewService.getPanorama({
//                 location: { lat, lng },
//                 radius: 200,
//                 source: google.maps.StreetViewSource.OUTDOOR
//               }, (data2, status2) => {
//                 if (status2 === 'OK' && data2 && data2.location) {
//                   const actualLat = data2.location.latLng.lat();
//                   const actualLng = data2.location.latLng.lng();
                  
//                   console.log(`✅ 확대 검색으로 Places 발견: ${actualLat}, ${actualLng}`);
                  
//                   if (panorama) {
//                     panorama.setPosition({ lat: actualLat, lng: actualLng });
//                     panorama.setVisible(true);
                    
//                     const randomHeading = Math.random() * 360;
//                     const randomPitch = Math.random() * 30 - 10;
                    
//                     panorama.setPov({
//                       heading: randomHeading,
//                       pitch: randomPitch
//                     });
//                     panorama.setZoom(1);
                    
//                     setClickedLocation(`위도: ${actualLat.toFixed(4)}, 경도: ${actualLng.toFixed(4)}`);
//                     map.panTo({ lat: actualLat, lng: actualLng });
//                   }
//                 } else {
//                   console.log(`❌ 해당 위치에 Places 없음: ${status2}`);
//                 }
//               });
//             }
//           });
//         });

//         setIsLoading(false);
//       } catch (err) {
//         console.error('❌ Google Maps 로드 오류:', err);
//         setError(err.message);
//         setIsLoading(false);
//       }
//     };

//     // 컴포넌트가 마운트된 후 DOM 체크 시작
//     const initTimeoutId = setTimeout(() => {
//       initializeMap().catch(err => {
//         console.error('❌ 지도 초기화 실패:', err);
//         setError(err.message);
//         setIsLoading(false);
//       });
//     }, 100);

//     // 클린업 함수
//     return () => {
//       clearTimeout(initTimeoutId);
//       if (timeoutId) clearTimeout(timeoutId);
//       isMounted = false;
//     };
//   }, []); // 빈 의존성 배열로 한 번만 실행

//   if (error) {
//     return (
//       <div style={{ 
//         display: 'flex', 
//         justifyContent: 'center', 
//         alignItems: 'center', 
//         height: '100vh',
//         backgroundColor: '#f5f5f5',
//         color: '#666',
//         fontSize: '1.2rem',
//         flexDirection: 'column'
//       }}>
//         ❌ 오류: {error}
//         <small style={{ marginTop: '10px', textAlign: 'center' }}>
//           .env.local 파일에 NEXT_PUBLIC_GOOGLE_KEY를 설정했는지 확인해주세요.
//         </small>
//       </div>
//     );
//   }

//   return (
//     <div className="container">
//       <div className="sphere-section">
//         {clickedLocation ? (
//           <div style={{ width: '100%', height: '100%', position: 'relative' }}>
//             <div style={{ 
//               position: 'absolute', 
//               top: '10px', 
//               left: '10px', 
//               zIndex: 1000, 
//               background: 'rgba(0,0,0,0.8)', 
//               color: 'white', 
//               padding: '8px 12px', 
//               borderRadius: '6px',
//               fontSize: '14px'
//             }}>
//               🗺️ {clickedLocation}
//             </div>
            
//             {/* 🎬 순수 스트리트 뷰 파노라마 (모든 UI 제거됨) */}
//             <div 
//               ref={streetViewRef} 
//               style={{ width: '100%', height: '100%' }}
//               id="street-view-container"
//             ></div>
//           </div>
//         ) : (
//           <div style={{ 
//             width: '100%', 
//             height: '100%', 
//             backgroundColor: '#000000'
//           }}>
//           </div>
//         )}
//       </div>
      
//       <div className="map-section">
//         {isLoading && <div className="loading-overlay"></div>}
//         <div 
//           ref={mapRef} 
//           style={{ width: '100%', height: '100%' }}
//           id="google-map-container"
//         ></div>
//       </div>

//       <style jsx>{`
//         .container {
//           display: flex;
//           height: 100vh;
//           width: 100vw;
//           overflow: hidden;
//         }
        
//         .map-section,
//         .sphere-section {
//           width: 50%;
//           height: 100vh;
//           flex: none;
//           position: relative;
//         }
        
//         .loading-overlay {
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background: rgba(0, 0, 0, 0.8);
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           z-index: 1000;
//           font-size: 1.2rem;
//           color: white;
//         }
        
//         @media (max-width: 768px) {
//           .container {
//             flex-direction: column;
//           }
//           .map-section,
//           .sphere-section {
//             width: 100vw;
//             height: 50vh;
//             flex: none;
//           }
//         }
        
//         @media (min-width: 769px) {
//           .map-section {
//             cursor: crosshair;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }