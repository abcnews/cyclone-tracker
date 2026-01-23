import type { LngLatBounds } from 'maplibre-gl';
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

/**
 * Calculate the bounds for the cyclone based on business logic.
 *
 * If isArchived, show the whole thing.
 *
 * If we have any of the following:
 * * watch area
 * * warning area
 * * windType polygon
 * * current/future points with a Cyclone symbol
 * zoom to the extent that includes all of those polygons and points.
 *
 * If it's not archived, and no other conditions match, zoom to the current forecast fix + the remainder of the fixes.
 */
export function getCycloneBounds(data: CycloneGeoJson, LngLatBoundsClass: typeof LngLatBounds): LngLatBounds {
  const { isArchived } = data.properties;

  // 1. If archived, show everything.
  if (isArchived) {
    return calculateGeoJSONBounds(data, new LngLatBoundsClass());
  }

  // 2. If we have special areas or cyclone points, zoom to those.
  const specialFeatures = data.features.filter(feature => {
    const { areatype, windtype, symbol, fixtype } = feature.properties;
    const isWatchOrWarning = areatype === 'Watch Area' || areatype === 'Warning Area';
    const isWindPolygon = feature.geometry.type === 'Polygon' && windtype !== undefined;
    const isCyclonePoint =
      (feature.geometry.type === 'Point' && fixtype === 'Current') || (symbol === 'Cyclone' && fixtype === 'Forecast');

    return isWatchOrWarning || isWindPolygon || isCyclonePoint;
  });

  if (specialFeatures.length > 0) {
    return calculateGeoJSONBounds({ ...data, features: specialFeatures }, new LngLatBoundsClass());
  }

  // 3. Otherwise: current forecast fix + the remainder of the fixes.
  const fallbackFeatures = data.features.filter(feature => {
    const { fixtype } = feature.properties;
    return feature.geometry.type === 'Point' && (fixtype === 'Current' || fixtype === 'Forecast');
  });

  return calculateGeoJSONBounds({ ...data, features: fallbackFeatures }, new LngLatBoundsClass());
}
