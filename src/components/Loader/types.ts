// Define all the strict literal types
export type FeatureCollectionType = 'FeatureCollection';
export type FeatureType = 'Feature';
export type FixType = 'Observed' | 'Current' | 'Forecast';
export type TrackType = 'Observed' | 'Forecast';
export type WindType = 'Damaging' | 'Destructive' | 'Very Destructive';
export type MarineType = 'Gale' | 'Storm' | 'Hurricane';
export type SymbolType = 'Low' | 'Cyclone';
export type CategoryType = 0 | '1' | '2' | '3' | '4';
// Added strict types for areatype and extent
export type AreaType = 'Likely Tracks Area' | 'Watch Area' | 'Warning Area';
export type ExtentType = 'Up to 72 hours' | 'Up to 120 hours';

// Basic Coordinate types
export type Coordinate = [number, number];
export type Line = Coordinate[];
export type PolygonCoordinates = Line[];

/**
 * Represents the complete GeoJSON object for the cyclone data,
 * consolidated into a single exported interface.
 */
export interface CycloneGeoJson {
  type: FeatureCollectionType;
  properties: {
    fcastTime: string;
    expiryHrs: string;
    distId: string;
    distName: string;
    issueTimeABC: string;
    isArchived: boolean;
    box: {
      top: number;
      left: number;
      bottom: number;
      right: number;
    };
    currentFix: {
      type: FeatureType;
      geometry: {
        type: 'Point';
        coordinates: Coordinate;
      };
      properties: {
        fixtype: 'Current';
        fixtime: string;
        symbol: SymbolType;
        category: CategoryType;
      };
    };
    title: string;
  };
  features: // 1. Point Features (Fixes/Locations)
  (
    | {
        type: FeatureType;
        geometry: {
          type: 'Point';
          coordinates: Coordinate;
        };
        properties: {
          fixtype: FixType;
          fixtime: string;
          symbol: SymbolType;
          category: CategoryType;
          '#text'?: never;
          tracktype?: never;
          areatype?: never;
          extent?: never;
          windtype?: never;
          marinetype?: never;
          starttime?: never;
          endtime?: never;
        };
      }
    // 2. LineString Features (Tracks)
    | {
        type: FeatureType;
        geometry: {
          type: 'LineString';
          coordinates: Line;
        };
        properties: {
          tracktype: TrackType;
          starttime: string;
          endtime: string;
          '#text': string;
          fixtype?: never;
          symbol?: never;
          category?: never;
          areatype?: never;
          extent?: never;
          windtype?: never;
          marinetype?: never;
          fixtime?: never;
        };
      }
    // 3. Polygon Features (Likely Tracks Area / Wind/Marine)
    | {
        type: FeatureType;
        geometry: {
          type: 'Polygon';
          coordinates: PolygonCoordinates;
        };
        properties: {
          '#text': string;
          // Areatype and Extent are strictly typed here
          areatype?: AreaType;
          extent?: ExtentType;

          // These properties are optional as they only appear on certain Polygon features
          windtype?: WindType;
          marinetype?: MarineType;
          fixtime?: string;
          fixtype?: FixType;

          // Exclude properties specific to other feature types
          tracktype?: never;
          starttime?: never;
          endtime?: never;
          symbol?: never;
          category?: never;
        };
      }
  )[];
}
