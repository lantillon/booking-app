'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });

interface RoutePoint {
  label: string;
  coordinates: [number, number];
}

interface RouteMapProps {
  points: RoutePoint[];
}

export default function RouteMap({ points }: RouteMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || points.length === 0) {
    return (
      <div className="w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-inner">
        <div className="text-black font-medium text-sm">No map data available for this route</div>
      </div>
    );
  }

  const center = points[0].coordinates;
  const polylinePositions = points.map(p => p.coordinates);

  return (
    <div className="w-full h-72 rounded-xl overflow-hidden border-2 border-gray-300 shadow-lg relative z-0">
      <style jsx global>{`
        .leaflet-container {
          height: 100%;
          width: 100%;
          z-index: 0;
          font-family: inherit;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={polylinePositions} pathOptions={{ color: '#3b82f6', weight: 4 }} />
        {points.map((point, idx) => (
          <Marker key={idx} position={point.coordinates}>
            {/* Simple markers; labels are shown in the list beside the map */}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

