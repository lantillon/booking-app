'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapControllerProps {
  center: [number, number];
  zoom: number;
}

export default function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
}



