import type { CycloneGeoJson } from '../Loader/types';

/**
 * Calculate bounds from GeoJSON features
 */
export function calculateGeoJSONBounds(data: CycloneGeoJson, bounds: maplibregl.LngLatBounds): maplibregl.LngLatBounds {
  if (!data?.features?.length) {
    return bounds;
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  // 1. Traverse all features and coordinates to find the extent
  data.features.forEach(feature => {
    const coords = getCoords(feature.geometry);
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    });
  });

  // 2. Apply "Buffer" (Padding) in degrees
  // Roughly: 1 degree latitude ≈ 111km.
  // 50km ≈ 0.45°, 20km ≈ 0.18°
  const padding = data.properties?.isArchived ? 0.45 : 0.18;

  // 3. Extend the maplibre bounds
  bounds.extend([minLng - padding, minLat - padding]);
  bounds.extend([maxLng + padding, maxLat + padding]);

  return bounds;
}

/**
 * Helper to recursively extract coordinates from any GeoJSON geometry type
 */
function getCoords(geometry: any): number[][] {
  const { type, coordinates } = geometry;
  if (type === 'Point') return [coordinates];
  if (type === 'LineString' || type === 'MultiPoint') return coordinates;
  if (type === 'Polygon' || type === 'MultiLineString') return coordinates.flat();
  if (type === 'MultiPolygon') return coordinates.flat(2);
  return [];
}

/**
 * Sanitise any content before injecting it into a template string.
 */
export function safeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
