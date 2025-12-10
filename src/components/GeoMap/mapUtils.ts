import * as turf from '@turf/turf';
import type { CycloneGeoJson } from '../Loader/types';

/**
 * Calculate bounds from GeoJSON features using Turf.js
 */
export function calculateGeoJSONBounds(data: CycloneGeoJson, bounds: maplibregl.LngLatBounds): maplibregl.LngLatBounds {
  if (!data || !data.features || data.features.length === 0) {
    return bounds;
  }

  const bbox = turf.bbox(data);
  const poly = turf.bboxPolygon(bbox);

  const bufferAmount = data.properties?.isArchived ? 50 : 20;
  const bufferedBounds = turf.buffer(poly, bufferAmount, { units: 'kilometers' });

  const bufferedBbox = bufferedBounds ? turf.bbox(bufferedBounds) : bbox;

  bounds.extend([bufferedBbox[0], bufferedBbox[1]]);
  bounds.extend([bufferedBbox[2], bufferedBbox[3]]);

  return bounds;
}

/**
 * Sanitise any content before injecting it into a template string.
 */
export function safeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
