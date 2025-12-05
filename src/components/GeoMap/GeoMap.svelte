<script lang="ts">
  import MapLibre from '../MapLibre/MapLibre.svelte';
  import { type CycloneGeoJson } from '../Loader/types';
  import cycloneCategories from './cycloneCategories/cycloneCategories';
  import cycloneMarker from './cycloneMarker';

  let { data }: { data: CycloneGeoJson } = $props();
</script>

<MapLibre
  onLoad={({ rootNode, maplibregl }) => {
    const style = 'https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/style.json';
    const tiles = 'https://www.abc.net.au/res/sites/news-projects/map-vector-tiles-australia/australia.json';
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

    map.on('style.load', () => {
      map.setProjection({
        type: 'globe' // Set projection to globe
      });
    });

    map.on('load', () => {
      console.log(JSON.stringify(data));

      // Add GeoJSON source if data is available
      if (!data) {
        return;
      }

      map.addSource('geojson-data', {
        type: 'geojson',
        data: data
      });

      // Add line layer with different colors for each track type and wind type
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
            '#FFA500',
            ['==', ['get', 'windtype'], 'Destructive'],
            '#FF0000',
            ['==', ['get', 'windtype'], 'Very Destructive'],
            '#8B0000',
            // Then check for track types
            ['==', ['get', 'tracktype'], 'Observed'],
            '#000000',
            ['==', ['get', 'tracktype'], 'Forecast'],
            '#0000FF',
            // Then check for extent types (for polygon boundaries)
            ['==', ['get', 'extent'], 'Up to 72 hours'],
            '#008000',
            ['==', ['get', 'extent'], 'Up to 120 hours'],
            '#000080',

            // Default color
            '#ff00ff' // Default to black
          ],
          'line-width': [
            'case',
            // Different line widths for different feature types
            ['has', 'windtype'],
            3, // Thicker lines for wind areas
            ['has', 'extent'],
            2, // Medium lines for extent areas
            ['has', 'tracktype'],
            2, // Standard lines for tracks
            1 // Default line width
          ],
          'line-opacity': 1
        }
      });

      data.features.forEach(feature => {
        if (feature.geometry.type === 'Point') {
          const { fixtype, symbol, category } = feature.properties;
          if (!(fixtype && symbol && category)) {
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

          const el = cycloneMarker({
            fixtype,
            symbol,
            category
          });
          new maplibregl.Marker({ element: el }).setLngLat(feature.geometry.coordinates).addTo(map);
        }
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
