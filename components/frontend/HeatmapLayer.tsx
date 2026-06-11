'use client';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
}

export default function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0 || typeof window === 'undefined') return;

    let heatLayer: any = null;
    let timer: NodeJS.Timeout;

    // Ensure L is globally available for leaflet.heat
    if (!(window as any).L) {
      (window as any).L = L;
    }

    // Dynamically load leaflet.heat
    import('leaflet.heat').then(() => {
      // Clean up existing heat layers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.eachLayer((layer: any) => {
        if (layer._heat) {
          map.removeLayer(layer);
        }
      });

      // Create new heat layer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      heatLayer = (L as any).heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.2: '#7fcdbb', // Pale Teal (Safe, very few reports)
          0.4: '#ffffb2', // Pale Yellow (Soft caution/monitoring)
          0.7: '#fec44f', // Warm Orange (Increasing severity)
          0.8: '#f03b20', // Intense Orange-Red (High risk)
          1.0: '#d7301f'  // Deep, Critical Red (Massive density/critical mass)
        }
      });

      // Force map to recalculate its CSS size
      map.invalidateSize();
      
      // Wait a tiny bit for the DOM layout to finish rendering
      timer = setTimeout(() => {
          const size = map.getSize();
          // Only add to map if height is greater than 0
          if (size.y > 0 && points.length > 0) {
              heatLayer.addTo(map);
          }
      }, 150);
    });

    return () => {
      if (timer) clearTimeout(timer);
      if (heatLayer && map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      } else {
        // Fallback cleanup
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.eachLayer((layer: any) => {
          if (layer._heat) {
            map.removeLayer(layer);
          }
        });
      }
    };
  }, [map, points]);

  return null;
}
