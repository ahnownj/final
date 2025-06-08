import { useState, useCallback } from 'react';

export const useGoogleMaps = () => {
  const [map, setMap] = useState(null);
  const [google, setGoogle] = useState(null);
  const [markers, setMarkers] = useState([]);

  const addMarker = useCallback((position, title, options = {}) => {
    if (!map || !google) return null;

    const marker = new google.maps.Marker({
      position,
      map,
      title,
      ...options
    });

    setMarkers(prev => [...prev, marker]);
    return marker;
  }, [map, google]);

  const removeMarker = useCallback((markerToRemove) => {
    markerToRemove.setMap(null);
    setMarkers(prev => prev.filter(marker => marker !== markerToRemove));
  }, []);

  const clearMarkers = useCallback(() => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  }, [markers]);

  const panTo = useCallback((position) => {
    if (map) {
      map.panTo(position);
    }
  }, [map]);

  const setZoom = useCallback((zoom) => {
    if (map) {
      map.setZoom(zoom);
    }
  }, [map]);

  const fitBounds = useCallback((bounds) => {
    if (map) {
      map.fitBounds(bounds);
    }
  }, [map]);

  const addInfoWindow = useCallback((marker, content) => {
    if (!google) return null;

    const infoWindow = new google.maps.InfoWindow({
      content
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    return infoWindow;
  }, [map, google]);

  const initializeMap = useCallback((mapInstance, googleInstance) => {
    setMap(mapInstance);
    setGoogle(googleInstance);
  }, []);

  return {
    map,
    google,
    markers,
    addMarker,
    removeMarker,
    clearMarkers,
    panTo,
    setZoom,
    fitBounds,
    addInfoWindow,
    initializeMap
  };
}; 