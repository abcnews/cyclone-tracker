<script lang="ts">
  import MapLibre from '../MapLibre/MapLibre.svelte';
  import { type CycloneGeoJson } from '../Loader/types';
  import cycloneCategories from './cycloneCategories/cycloneCategories';
  import cycloneMarker from './cycloneMarker';
  import colourConfig from './colours';
  import { calculateGeoJSONBounds } from './mapUtils';
  import uncertaintyPatternUrl from './uncertainty-pattern.png';

  let { data }: { data: CycloneGeoJson } = $props();
</script>

<MapLibre
  onLoad={({ rootNode, maplibregl }) => {
    const style = 'https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/style.json';
    const tiles = 'https://www.abc.net.au/res/sites/news-projects/map-vector-tiles-australia/australia.json';

    const bounds = calculateGeoJSONBounds(data, new maplibregl.LngLatBounds());

    const map = new maplibregl.Map({
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      attributionControl: false,
      dragRotate: false,
      doubleClickZoom: false,
      style: style,
      container: rootNode,
      interactive: true
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 10
      });
    }

    map.on('style.load', () => {
      map.setProjection({
        type: 'globe' // Set projection to globe
      });
    });

    map.on('load', async () => {
      // Add GeoJSON source if data is available
      if (!data) {
        return;
      }

      // Add image pattern for uncertainty areas
      const uncertaintyData = await map.loadImage(uncertaintyPatternUrl);

      if (!map.hasImage('uncertainty-pattern')) {
        map.addImage('uncertainty-pattern', uncertaintyData.data);
      }

      map.addSource('geojson-data', {
        type: 'geojson',
        data: data
      });

      // Add uncertainty pattern for likely tracks area
      map.addLayer({
        id: 'geojson-uncertainty',
        type: 'fill',
        source: 'geojson-data',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: {
          'fill-opacity': [
            'case',
            ['==', ['get', 'extent'], 'Up to 72 hours'],
            0.3, // Full opacity for pattern
            ['==', ['get', 'extent'], 'Up to 120 hours'],
            0.15, // Full opacity for pattern
            1 // Default opacity
          ],
          'fill-pattern': [
            'case',
            ['==', ['get', 'areatype'], 'Likely Tracks Area'],
            'uncertainty-pattern', // Use pattern for Likely Tracks Area
            '' // No pattern for other areas
          ]
        }
      });

      // Add current wind fills
      map.addLayer({
        id: 'geojson-wind',
        type: 'fill',
        source: 'geojson-data',
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'fixtype'], 'Current']],
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'windtype'], 'Damaging'],
            colourConfig.fill.Damaging,
            ['==', ['get', 'windtype'], 'Destructive'],
            colourConfig.fill.Destructive,
            ['==', ['get', 'windtype'], 'Very Destructive'],
            colourConfig.fill['Very Destructive'],
            // Default fill color
            'transparent'
          ],
          'fill-opacity': 1
        }
      });

      // Add the watch & warning areas over land
      map.addLayer({
        id: 'geojson-watch-warning-areas',
        type: 'fill',
        source: 'geojson-data',
        filter: [
          'all',
          ['==', ['geometry-type'], 'Polygon'],
          ['any', ['==', ['get', 'areatype'], 'Watch Area'], ['==', ['get', 'areatype'], 'Warning area']]
        ],
        paint: {
          'fill-color': [
            'case',
            // Check for area types
            ['==', ['get', 'areatype'], 'Watch Area'],
            colourConfig.fill['Watch Area'],
            ['==', ['get', 'areatype'], 'Warning Area'],
            colourConfig.fill['Warning Area'],
            // Default fill color
            'transparent'
          ],
          'fill-opacity': 1
        }
      });

      // Add strokes for cyclone track and wind types
      map.addLayer({
        id: 'geojson-lines',
        type: 'line',
        source: 'geojson-data',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'case',
            // First check for wind types
            ['==', ['get', 'windtype'], 'Damaging'],
            colourConfig.stroke.Damaging,
            ['==', ['get', 'windtype'], 'Destructive'],
            colourConfig.stroke.Destructive,
            ['==', ['get', 'windtype'], 'Very Destructive'],
            colourConfig.stroke['Very Destructive'],
            // Then check for track types
            ['==', ['get', 'tracktype'], 'Observed'],
            colourConfig.stroke.Observed,
            ['==', ['get', 'tracktype'], 'Forecast'],
            colourConfig.stroke.Forecast,

            // Default color
            colourConfig.stroke.fix // Default to fix color
          ],
          'line-width': [
            'case',
            // Different line widths for different feature types
            ['has', 'windtype'],
            2, // Thicker lines for wind areas
            ['has', 'extent'],
            2, // Medium lines for extent areas
            ['has', 'tracktype'],
            2, // Standard lines for tracks
            1 // Default line width
          ],
          'line-opacity': [
            'case',
            // Then check for extent types (for polygon boundaries)
            ['==', ['get', 'areatype'], 'Likely Tracks Area'],
            0,
            1
          ]
        }
      });

      // Add cyclone animation
      data.features.forEach(feature => {
        if (feature.geometry.type !== 'Point') {
          return;
        }
        const { fixtype, symbol, category } = feature.properties;
        if (!(fixtype && symbol)) {
          return;
        }

        if (fixtype === 'Current' && symbol === 'Cyclone') {
          const el = document.createElement('div');
          el.classList.add('geomap__cyclone-animation');
          const img = document.createElement('img');
          el.appendChild(img);
          img.src = cycloneCategories[category];
          img.addEventListener('load', () => {
            img.classList.add('loaded');
          });
          new maplibregl.Marker({ element: el }).setLngLat(feature.geometry.coordinates).addTo(map);
        }
      });

      // Add cyclone numbers
      data.features.forEach(feature => {
        if (feature.geometry.type !== 'Point') {
          return;
        }
        const { fixtype, symbol, category } = feature.properties;
        if (!(fixtype && symbol)) {
          return;
        }

        const el = cycloneMarker({
          fixtype,
          symbol,
          category
        });
        new maplibregl.Marker({ element: el }).setLngLat(feature.geometry.coordinates).addTo(map);
      });
    });
  }}
/>

<style lang="scss">
  :global {
    .geomap__cyclone-animation {
      width: 60px;
      height: 60px;
      img {
        opacity: 0;
        transition: opacity 1s;
        &.loaded {
          opacity: 0.8;
        }
      }
    }
  }
</style>
