'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import MapClickHandler from './MapClickHandler';
import MapController from './MapController';

// Dynamically import to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// El Paso, Texas coordinates
const EL_PASO_CENTER: [number, number] = [31.7619, -106.4850];

// Create a custom icon component
const createCustomIcon = () => {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: #60a5fa;
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 16px;
          font-weight: bold;
          line-height: 1;
        ">📍</div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24], // Anchor at the tip of the pin (bottom center)
    popupAnchor: [0, -24],
  });
};

interface LocationMapProps {
  onLocationSelect: (location: string, coordinates: [number, number]) => void;
  addressText?: string;
  initialLocation?: string;
}

export default function LocationMap({ onLocationSelect, addressText, initialLocation }: LocationMapProps) {
  const [mounted, setMounted] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>(initialLocation || '');
  const [mapCenter, setMapCenter] = useState<[number, number]>(EL_PASO_CENTER);
  const [mapZoom, setMapZoom] = useState(12);
  const [customIcon, setCustomIcon] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<'positron' | 'dark' | 'voyager'>('positron');
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Map style configurations
  const mapStyles = {
    positron: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: 'Light (HD)'
    },
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: 'Dark (HD)'
    },
    voyager: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      name: 'Voyager (HD)'
    }
  };

  useEffect(() => {
    setMounted(true);
    // Create custom icon when component mounts
    if (typeof window !== 'undefined') {
      const icon = createCustomIcon();
      setCustomIcon(icon);
    }
  }, []);

  useEffect(() => {
    if (initialLocation && !selectedAddress) {
      setSelectedAddress(initialLocation);
    }
  }, [initialLocation]);

  // Geocode address when addressText changes
  useEffect(() => {
    if (!addressText || addressText.trim() === '') {
      return;
    }

    // Debounce geocoding
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        // Add "El Paso, Texas" to help with geocoding
        const searchQuery = addressText.includes('El Paso') 
          ? addressText 
          : `${addressText}, El Paso, Texas`;
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              'User-Agent': 'BookingSite/1.0'
            }
          }
        );
        
        const data = await response.json();
        
        if (data && data.length > 0) {
          // Use the first result (most relevant) with high precision coordinates
          const result = data[0];
          // Use more precise coordinates (6+ decimal places)
          const coordinates: [number, number] = [
            parseFloat(parseFloat(result.lat).toFixed(7)), 
            parseFloat(parseFloat(result.lon).toFixed(7))
          ];
          
          setMarkerPosition(coordinates);
          setMapCenter(coordinates);
          setMapZoom(19); // Higher zoom for more precision
          setSelectedAddress(result.display_name || addressText);
          onLocationSelect(result.display_name || addressText, coordinates);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    }, 1000); // Wait 1 second after user stops typing

    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [addressText, onLocationSelect]);

  const handleMapClick = (address: string, coordinates: [number, number]) => {
    setSelectedAddress(address);
    setMarkerPosition(coordinates);
    setMapCenter(coordinates);
    setMapZoom(19); // Higher zoom for more precision when clicking
    onLocationSelect(address, coordinates);
  };

  if (!mounted) {
    return (
      <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-inner">
        <div className="text-black font-medium">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-black">
            Click on the map to select your location in El Paso, Texas
          </label>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as 'positron' | 'dark' | 'voyager')}
            className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white text-black"
          >
            <option value="positron">Light HD</option>
            <option value="voyager">Voyager HD</option>
            <option value="dark">Dark HD</option>
          </select>
        </div>
        {selectedAddress && (
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg mb-2 shadow-sm">
            <p className="text-sm text-black font-medium">
              <span className="text-blue-400">📍</span> <strong>Selected:</strong> {selectedAddress}
            </p>
          </div>
        )}
      </div>
      <div className="w-full h-64 rounded-xl overflow-hidden border-2 border-gray-400 shadow-lg relative z-0">
        <style jsx global>{`
          .leaflet-container {
            height: 100%;
            width: 100%;
            z-index: 0;
            font-family: inherit;
          }
          .leaflet-popup-content-wrapper {
            color: black;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .leaflet-popup-content {
            margin: 12px;
            font-size: 14px;
            font-weight: 500;
          }
          .leaflet-control-zoom {
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          }
          .leaflet-control-zoom a {
            border-radius: 4px;
          }
          .custom-marker {
            background: transparent !important;
            border: none !important;
          }
        `}</style>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution={mapStyles[mapStyle].attribution}
            url={mapStyles[mapStyle].url}
            subdomains="abcd"
            maxZoom={19}
          />
          {markerPosition && customIcon && (
            <Marker 
              position={markerPosition}
              icon={customIcon}
            >
              <Popup>
                <div className="font-semibold text-black">Service Location</div>
              </Popup>
            </Marker>
          )}
          <MapController center={mapCenter} zoom={mapZoom} />
          <MapClickHandler onLocationSelect={handleMapClick} />
        </MapContainer>
      </div>
    </div>
  );
}
