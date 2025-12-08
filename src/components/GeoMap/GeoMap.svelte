<script lang="ts">
  import MapLibre from '../MapLibre/MapLibre.svelte';
  import { type CycloneGeoJson } from '../Loader/types';
  import cycloneCategories from './cycloneCategories/cycloneCategories';
  import cycloneMarker from './cycloneMarker';
  import colourConfig from './colours';
  import { calculateGeoJSONBounds } from './mapUtils';
  import uncertaintyPatternUrl from './uncertainty-pattern.png';
  import cycloneCurrentLabel from './cycloneCurrentLabel';

  let { data }: { data: CycloneGeoJson } = $props();
  let isLoaded = $state(false);
  let clientWidth = $state(0);
  let clientHeight = $state(0);
</script>

<div class="geo-map" style:opacity={isLoaded ? 1 : 0} bind:clientWidth bind:clientHeight>
  <MapLibre
    onLoad={async ({ rootNode, maplibregl }) => {
      const style = 'https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/style.json';
      const tiles = 'https://www.abc.net.au/res/sites/news-projects/map-vector-tiles-australia/australia.json';
      const bounds = calculateGeoJSONBounds(
        {
          ...data,
          features: data.features.filter(feature => {
            // If archived, show the whole path.
            if (data.properties.isArchived) {
              return true;
            }

            // If this is "Observed", it has happened in the past.
            // While the cyclone is active, we only want to show current & future
            const isObserved = feature.properties.fixtype === 'Observed' || feature.properties.tracktype === 'Observed';
            console.log({ isObserved });
            return !isObserved;
          })
        },
        new maplibregl.LngLatBounds()
      );

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

      await Promise.all([new Promise(resolve => map.on('load', resolve))]);
      isLoaded = true;

      // map.setProjection({
      //   type: 'globe' // Set projection to globe
      // });

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

      // UNCERTAINTY PATTERN
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

      // CURRENT WIND FILLS
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

      // WATCH & WARNING AREAS
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
        filter: ['any', ['has', 'tracktype'], ['has', 'windtype']],
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
            'transparent' // Default to fix color
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
        if (!symbol) {
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

      // OTHER CYCLONE POINTS
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
        new maplibregl.Marker({
          element: el,
          className: feature.properties.fixtype === 'Current' ? 'geo-map__current-point' : ''
        })
          .setLngLat(feature.geometry.coordinates)
          .addTo(map);
      });

      // CURRENT CYCLONE POINT
      const currentFix = data.features.find(
        feature => feature.geometry.type === 'Point' && feature.properties.fixtype === 'Current'
      );
      let currentFixMarker;
      let previousIsRight;
      map.on('moveend', async () => {
        if (currentFix?.geometry.type === 'Point') {
          const currentFixLabelEl = cycloneCurrentLabel({ fixtime: currentFix?.properties.fixtime });
          const coord = currentFix.geometry.coordinates;
          const projectedPos = map.project(coord);
          const isRight = projectedPos.x > clientWidth / 2;
          if(isRight === previousIsRight){
            return;
          }
          previousIsRight = isRight;
          if (currentFixMarker) {
            currentFixMarker.remove();
          }
          currentFixMarker = new maplibregl.Marker({
            element: currentFixLabelEl,
            anchor: isRight ? 'right' : 'left'
          })
            .setLngLat(coord)
            .addTo(map);
        }
      });
    }}
  />
</div>

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

    .geo-map__current-point {
      z-index: 100;
    }

    .geomap__current-label {
      background: rgba(255, 255, 255, 0.9);
      color: black;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: bold;
      font-family: ABCSans, Helvetica, Arial, sans-serif;
      border: 1px solid #999;
      padding: 0 5px 0 18px;
      border-radius: 5px;
      margin-top: -2px;
      z-index: 95;
      animation:fadeIn 0.25s;
      &.maplibregl-marker-anchor-right {
        padding: 0 18px 0 5px;
      }
    }
  }

  .geo-map {
    transition: opacity 0.2s;
    height: 100%;
    width: 100%;
  }

  @keyframes fadeIn{
    from{
      opacity:0;
    }
    to{
      opacity:1;
    }
  }
</style>
