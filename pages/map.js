import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

export default function MapPage() {
  const mapRef = useRef(null);
  const [selectedSphereUrl, setSelectedSphereUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [clickedLocation, setClickedLocation] = useState('');

  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('Google Maps API 로딩 시작...');
        
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
          throw new Error('Google Maps API 키가 설정되지 않았습니다.');
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();
        console.log('Google Maps API 로딩 완료!');

        if (mapRef.current) {
          // 🌍 위성지도 + 모든 텍스트/라벨 제거
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 35.0, lng: 127.0 }, // 한국 중심으로 시작
            zoom: 6,
            minZoom: 2, // 최소 줌 레벨 제한 (바깥 여백 방지)
            maxZoom: 20, // 최대 줌 레벨
            mapTypeId: 'satellite', // 위성지도
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            zoomControl: true,
            // 🌍 지도 이동 범위를 지구 영역으로 제한
            restriction: {
              latLngBounds: {
                north: 85,   // 북극 근처
                south: -85,  // 남극 근처
                west: -180,  // 서쪽 끝
                east: 180    // 동쪽 끝
              },
              strictBounds: true // 엄격한 경계 적용
            },
            // 🚫 모든 텍스트와 라벨 제거
            styles: [
              {
                featureType: 'all',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'administrative',
                elementType: 'all',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'road',
                elementType: 'all',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'transit',
                elementType: 'all',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi',
                elementType: 'all',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });

          console.log('지도 생성 완료!');

          // 🎯 Photo Sphere만 감지하여 표시하는 시스템
          const sphereMarkers = [];
          const streetViewService = new google.maps.StreetViewService();
          const processedLocations = new Set(); // 중복 방지

          // 🌟 예시 Photo Sphere: Sikhote-Alin Nature Reserve (Andy Pooh, 2015년 9월)
          const examplePhotoSphere = {
            lat: 45.28697617844455,
            lng: 136.192660137261,
            title: "Sikhote-Alin Nature Reserve",
            description: "Andy Pooh - Sep 2015",
            embedUrl: "https://www.google.com/maps/embed?pb=!4v1749148508895!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJRDQwYWpmblFF!2m2!1d45.28697617844455!2d136.192660137261!3f266.57502435186365!4f-20.002983032905277!5f0.7820865974627469"
          };

          // 🌟 예시 Photo Sphere 2: 이스라엘/팔레스타인 지역
          const examplePhotoSphere2 = {
            lat: 31.49140812714093,
            lng: 34.4085267976272,
            title: "عبدالرحمن احمد",
            description: "Jul 2022",
            embedUrl: "https://www.google.com/maps/embed?pb=!4v1749149562764!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJRE93NW1CNGdF!2m2!1d31.49140812714093!2d34.4085267976272!3f328.89718386468115!4f-1.5661410659005952!5f0.7820865974627469"
          };

          // 🔵 예시 Photo Sphere 마커 생성 함수
          const createExampleMarker = (sphereData, markerId) => {
            const marker = new google.maps.Marker({
              position: { lat: sphereData.lat, lng: sphereData.lng },
              map: map,
              title: `${sphereData.title} - ${sphereData.description}`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                strokeColor: '#FFFFFF',
                strokeWeight: 1,
                strokeOpacity: 1
              },
              zIndex: 1001 // 다른 마커보다 위에 표시
            });

            // hover 효과
            marker.addListener('mouseover', () => {
              marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                strokeOpacity: 1
              });
            });

            marker.addListener('mouseout', () => {
              marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                strokeColor: '#FFFFFF',
                strokeWeight: 1,
                strokeOpacity: 1
              });
            });

            // 클릭 이벤트 - 제공된 embed URL 사용
            marker.addListener('click', () => {
              console.log(`🌟 예시 Photo Sphere 클릭: ${sphereData.title}`);
              
              setSelectedSphereUrl(sphereData.embedUrl);
              setClickedLocation(`${sphereData.title} - ${sphereData.description}`);
              
              map.panTo({ lat: sphereData.lat, lng: sphereData.lng });
              
              console.log(`🌟 ${sphereData.title} Photo Sphere 로드`);
            });

            sphereMarkers.push(marker);
            console.log(`✅ 예시 Photo Sphere 마커 추가: ${sphereData.title}`);
          };

          // 예시 마커들 생성
          createExampleMarker(examplePhotoSphere, 'sikhote-alin');
          createExampleMarker(examplePhotoSphere2, 'middle-east');

          // 🤖 Google Maps URL 자동 파싱 함수
          const parseGoogleMapsUrl = (embedUrl) => {
            try {
              // iframe src URL에서 좌표 추출
              const latMatch = embedUrl.match(/!2d(-?\d+\.?\d*)/);
              const lngMatch = embedUrl.match(/!3d(-?\d+\.?\d*)/);
              
              if (latMatch && lngMatch) {
                return {
                  lat: parseFloat(latMatch[1]),
                  lng: parseFloat(lngMatch[1]),
                  originalUrl: embedUrl
                };
              }
              return null;
            } catch (error) {
              console.error('URL 파싱 오류:', error);
              return null;
            }
          };

          // 🏷️ Places API로 장소명 가져오기
          const getPlaceName = async (lat, lng) => {
            try {
              const service = new google.maps.places.PlacesService(map);
              
              return new Promise((resolve) => {
                service.nearbySearch({
                  location: { lat, lng },
                  radius: 1000,
                  type: ['point_of_interest', 'establishment']
                }, (results, status) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                    resolve(results[0].name);
                  } else {
                    // Geocoding으로 대체 시도
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                      if (status === 'OK' && results[0]) {
                        const address = results[0].formatted_address;
                        // 주소에서 국가/도시 정보 추출
                        const components = results[0].address_components;
                        const locality = components.find(c => c.types.includes('locality'))?.long_name;
                        const country = components.find(c => c.types.includes('country'))?.long_name;
                        
                        resolve(locality ? `${locality}, ${country}` : country || address);
                      } else {
                        resolve(`Unknown Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
                      }
                    });
                  }
                });
              });
            } catch (error) {
              console.error('장소명 조회 오류:', error);
              return `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
            }
          };

          // 🎯 URL에서 자동으로 Photo Sphere 추가하는 함수
          const addPhotoSphereFromUrl = async (embedUrl, customTitle = '', customDescription = '') => {
            const coordinates = parseGoogleMapsUrl(embedUrl);
            
            if (!coordinates) {
              console.error('❌ URL에서 좌표를 추출할 수 없습니다');
              return false;
            }

            console.log(`📍 좌표 추출 성공: ${coordinates.lat}, ${coordinates.lng}`);

            // 장소명 자동 조회
            const placeName = customTitle || await getPlaceName(coordinates.lat, coordinates.lng);
            const description = customDescription || 'Photo Sphere';

            console.log(`🏷️ 장소명: ${placeName}`);

            // 마커 생성
            const photoSphereData = {
              lat: coordinates.lat,
              lng: coordinates.lng,
              title: placeName,
              description: description,
              embedUrl: embedUrl
            };

            createExampleMarker(photoSphereData, `auto-${Date.now()}`);
            
            console.log(`✅ 자동 Photo Sphere 추가 완료: ${placeName}`);
            return true;
          };

          // 🌐 전역 함수로 노출 (개발자 콘솔에서 사용 가능)
          window.addPhotoSphereFromUrl = addPhotoSphereFromUrl;
          
          console.log('🤖 자동 URL 파싱 기능 활성화됨');
          console.log('💡 사용법: addPhotoSphereFromUrl("iframe_src_url", "제목(선택)", "설명(선택)")');
          console.log('💡 예시: addPhotoSphereFromUrl("https://www.google.com/maps/embed?pb=!4v...", "내가 찾은 장소", "2024년 1월")');

          // 🔍 Photo Sphere 검색 함수
          const searchPhotoSpheres = () => {
            const bounds = map.getBounds();
            if (!bounds) return;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            
            // 현재 보이는 영역을 그리드로 나누어 검색
            const gridSize = 6; // 6x6 그리드로 줄여서 API 호출 최적화
            const latStep = (ne.lat() - sw.lat()) / gridSize;
            const lngStep = (ne.lng() - sw.lng()) / gridSize;

            console.log('🔍 Photo Sphere 전용 검색 시작...');

            for (let i = 0; i < gridSize; i++) {
              for (let j = 0; j < gridSize; j++) {
                const lat = sw.lat() + (latStep * i);
                const lng = sw.lng() + (lngStep * j);
                const locationKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;

                // 이미 처리한 위치는 스킵
                if (processedLocations.has(locationKey)) continue;
                processedLocations.add(locationKey);

                // API 호출 딜레이로 제한 방지
                setTimeout(() => {
                  streetViewService.getPanorama({
                    location: { lat, lng },
                    radius: 1000,
                    source: google.maps.StreetViewSource.OUTDOOR
                  }, (data, status) => {
                    if (status === 'OK' && data && data.location && data.location.pano) {
                      const actualLat = data.location.latLng.lat();
                      const actualLng = data.location.latLng.lng();
                      
                      // 🎯 Photo Sphere인지 확인 (Street View path 제외)
                      const isPhotoSphere = checkIfPhotoSphere(data);
                      
                      if (isPhotoSphere) {
                        // 중복 마커 확인
                        const markerExists = sphereMarkers.some(marker => {
                          const pos = marker.getPosition();
                          return Math.abs(pos.lat() - actualLat) < 0.001 && 
                                 Math.abs(pos.lng() - actualLng) < 0.001;
                        });

                        if (!markerExists) {
                          createPhotoSphereMarker(actualLat, actualLng, map, google, apiKey);
                        }
                      }
                    }
                  });
                }, (i * gridSize + j) * 150); // 150ms 간격
              }
            }
          };

          // 🎯 Photo Sphere 판별 함수 (Street View path 제외)
          const checkIfPhotoSphere = (data) => {
            // Photo Sphere 특징:
            // 1. 특정 위치에 고정된 360도 파노라마
            // 2. 일반적으로 사용자가 업로드한 콘텐츠
            // 3. Street View 경로가 아닌 독립적인 위치
            
            const panoId = data.location.pano;
            const description = data.location.description || '';
            
            // Google Street View 차량으로 촬영된 일반적인 경로는 제외
            const isRegularStreetView = (
              panoId && 
              panoId.length > 20 && // Street View pano ID는 보통 길다
              !description.includes('Photo Sphere') &&
              !description.includes('360')
            );

            // Photo Sphere로 판단되는 경우
            const isPhotoSphere = (
              panoId && 
              (description.includes('Photo Sphere') || 
               description.includes('360') ||
               panoId.length < 20 || // Photo Sphere ID는 보통 짧다
               data.copyright && !data.copyright.includes('Google'))
            );

            return !isRegularStreetView && (isPhotoSphere || Math.random() > 0.7); // 70% 필터링으로 밀도 조절
          };

          // 🔵 Photo Sphere 마커 생성 함수
          const createPhotoSphereMarker = (lat, lng, map, google, apiKey) => {
            const marker = new google.maps.Marker({
              position: { lat, lng },
              map: map,
              title: `Photo Sphere: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: '#4285F4', // 구글 블루
                fillOpacity: 0.9,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                strokeOpacity: 1.0
              },
              zIndex: 1000
            });

            // hover 효과
            marker.addListener('mouseover', () => {
              marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#FF6347',
                fillOpacity: 1.0,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                strokeOpacity: 1.0
              });
            });

            marker.addListener('mouseout', () => {
              marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: '#4285F4',
                fillOpacity: 0.9,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
                strokeOpacity: 1.0
              });
            });

            // 클릭 이벤트
            marker.addListener('click', () => {
              console.log(`🎯 Photo Sphere 마커 클릭: ${lat}, ${lng}`);
              
              const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;
              
              setSelectedSphereUrl(streetViewUrl);
              setClickedLocation(`위도: ${lat.toFixed(4)}, 경도: ${lng.toFixed(4)}`);
              
              map.panTo({ lat, lng });
            });

            sphereMarkers.push(marker);
            console.log(`✅ Photo Sphere 마커 추가: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          };

          // 🔥 지도 클릭 이벤트 (직접 클릭)
          map.addListener('click', (event) => {
            const lat = event.latLng.lat();
            const lng = event.latLng.lng();
            
            console.log(`🌍 지도 클릭: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            
            streetViewService.getPanorama({
              location: { lat, lng },
              radius: 50,
              source: google.maps.StreetViewSource.OUTDOOR
            }, (data, status) => {
              console.log(`📡 Street View API 응답: ${status}`);
              
              if (status === 'OK' && data && data.location) {
                const actualLat = data.location.latLng.lat();
                const actualLng = data.location.latLng.lng();
                const panoId = data.location.pano;
                
                console.log(`✅ Photo Sphere 발견: ${actualLat}, ${actualLng}, Pano: ${panoId}`);
                
                const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${actualLat},${actualLng}&heading=0&pitch=0&fov=90`;
                
                setSelectedSphereUrl(streetViewUrl);
                setClickedLocation(`위도: ${actualLat.toFixed(4)}, 경도: ${actualLng.toFixed(4)}`);
                
                console.log('🔥 Street View URL 설정:', streetViewUrl);
                
                map.panTo({ lat: actualLat, lng: actualLng });
              } else {
                console.log('🔍 50m 반경에서 못 찾음, 200m로 확대 검색...');
                streetViewService.getPanorama({
                  location: { lat, lng },
                  radius: 200,
                  source: google.maps.StreetViewSource.OUTDOOR
                }, (data2, status2) => {
                  console.log(`📡 확대 검색 결과: ${status2}`);
                  
                  if (status2 === 'OK' && data2 && data2.location) {
                    const actualLat = data2.location.latLng.lat();
                    const actualLng = data2.location.latLng.lng();
                    
                    console.log(`✅ 확대 검색으로 Photo Sphere 발견: ${actualLat}, ${actualLng}`);
                    
                    const streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${actualLat},${actualLng}&heading=0&pitch=0&fov=90`;
                    
                    setSelectedSphereUrl(streetViewUrl);
                    setClickedLocation(`위도: ${actualLat.toFixed(4)}, 경도: ${actualLng.toFixed(4)}`);
                    
                    map.panTo({ lat: actualLat, lng: actualLng });
                  } else {
                    console.log(`❌ 해당 위치에 Photo Sphere 없음: ${status2}`);
                  }
                });
              }
            });
          });

          // 지도 이동 시 새로운 Photo Sphere 검색
          map.addListener('idle', () => {
            setTimeout(searchPhotoSpheres, 500);
          });

          // 초기 Photo Sphere 검색
          google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
            setTimeout(searchPhotoSpheres, 1000);
          });

          setIsLoading(false);
        }
      } catch (err) {
        console.error('Google Maps 로드 오류:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5',
        color: '#666',
        fontSize: '1.2rem',
        flexDirection: 'column'
      }}>
        ❌ 오류: {error}
        <small style={{ marginTop: '10px', textAlign: 'center' }}>
          .env.local 파일에 NEXT_PUBLIC_GOOGLE_KEY를 설정했는지 확인해주세요.
        </small>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="sphere-section">
        {selectedSphereUrl ? (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ 
              position: 'absolute', 
              top: '10px', 
              left: '10px', 
              zIndex: 1000, 
              background: 'rgba(0,0,0,0.8)', 
              color: 'white', 
              padding: '8px 12px', 
              borderRadius: '6px',
              fontSize: '14px'
            }}>
              🗺️ {clickedLocation}
            </div>
            
            <iframe
              src={selectedSphereUrl}
              width="100%"
              height="100%"
              style={{ 
                border: 0,
                pointerEvents: 'auto'
              }}
              allowFullScreen=""
              loading="lazy"
              title={`Street View: ${clickedLocation}`}
              onLoad={() => {
                console.log('✅ iframe 로드 성공:', clickedLocation);
              }}
              onError={(e) => {
                console.error('❌ iframe 로드 실패:', e);
              }}
            ></iframe>
          </div>
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* 검은 화면 - 아무것도 표시하지 않음 */}
          </div>
        )}
      </div>
      
      <div className="map-section">
        {isLoading && (
          <div className="loading-overlay">
            <div>🛰️ 위성지도 로딩 중...</div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }}></div>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        
        /* ⚖️ 정확히 1:1 분할 */
        .map-section,
        .sphere-section {
          width: 50%;
          height: 100vh;
          flex: none;
          position: relative;
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          font-size: 1.2rem;
          color: white;
        }
        
        /* 📱 모바일: 위아래 분할 (1:1) */
        @media (max-width: 768px) {
          .container {
            flex-direction: column;
          }
          .map-section,
          .sphere-section {
            width: 100vw;
            height: 50vh;
            flex: none;
          }
        }
        
        /* 🖱️ 데스크톱에서 지도 커서 */
        @media (min-width: 769px) {
          .map-section {
            cursor: crosshair;
          }
        }
      `}</style>
    </div>
  );
}