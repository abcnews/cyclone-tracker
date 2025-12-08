import type { CycloneGeoJson } from '../Loader/types';

/**
 * Calculate bounds from GeoJSON features
 * @param data - GeoJSON data
 * @returns LngLatBounds object
 */
export function calculateGeoJSONBounds(data: CycloneGeoJson, bounds): maplibregl.LngLatBounds {
  if (!data || !data.features || data.features.length === 0) {
    return bounds;
  }

  data.features.forEach((feature: any) => {
    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates;
      bounds.extend([lng, lat]);
    } else if (feature.geometry.type === 'LineString') {
      feature.geometry.coordinates.forEach((coord: any) => {
        bounds.extend(coord);
      });
    } else if (feature.geometry.type === 'Polygon') {
      feature.geometry.coordinates.forEach((ring: any) => {
        ring.forEach((coord: any) => {
          bounds.extend(coord);
        });
      });
    } else if (feature.geometry.type === 'MultiPolygon') {
      feature.geometry.coordinates.forEach((polygon: any) => {
        polygon.forEach((ring: any) => {
          ring.forEach((coord: any) => {
            bounds.extend(coord);
          });
        });
      });
    }
  });

  return bounds;
}
