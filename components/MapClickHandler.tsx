'use client';

import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  onLocationSelect: (location: string, coordinates: [number, number]) => void;
}

export default function MapClickHandler({ onLocationSelect }: MapClickHandlerProps) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const coordinates: [number, number] = [lat, lng];
      
      // Try to get address from coordinates using reverse geocoding
      try {
        // Using OpenStreetMap Nominatim API (free, no API key needed)
        // Use zoom=20 for maximum precision (building level)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=20&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              'User-Agent': 'BookingSite/1.0'
            }
          }
        );
        const data = await response.json();
        
        if (data.display_name) {
          const fullAddress = data.display_name;
          // Use high precision coordinates (7 decimal places = ~1cm accuracy)
          const preciseCoordinates: [number, number] = [
            parseFloat(lat.toFixed(7)),
            parseFloat(lng.toFixed(7))
          ];
          onLocationSelect(fullAddress, preciseCoordinates);
        } else {
          const fallbackAddress = `${lat.toFixed(7)}, ${lng.toFixed(7)}`;
          const preciseCoordinates: [number, number] = [
            parseFloat(lat.toFixed(7)),
            parseFloat(lng.toFixed(7))
          ];
          onLocationSelect(fallbackAddress, preciseCoordinates);
        }
      } catch (error) {
        // Fallback to coordinates if reverse geocoding fails
        const fallbackAddress = `${lat.toFixed(7)}, ${lng.toFixed(7)}`;
        const preciseCoordinates: [number, number] = [
          parseFloat(lat.toFixed(7)),
          parseFloat(lng.toFixed(7))
        ];
        onLocationSelect(fallbackAddress, preciseCoordinates);
      }
    },
  });

  return null;
}


