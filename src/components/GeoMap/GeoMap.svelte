<script lang="ts">
  import type { maplibregl } from '@abcnews/components-storylab/mapLibre';
  import { MapLibreLoader } from '@abcnews/components-storylab/mapLibre';
  import { type CycloneGeoJson } from '../Loader/types';
  import cycloneCategories from './cycloneCategories/cycloneCategories';
  import cycloneMarker from './htmlComponents/cycloneMarker';
  import markerPopup from './htmlComponents/markerPopup';
  import warningPopup from './htmlComponents/warningPopup';
  import colourConfig from './colours';
  import uncertaintyPatternUrl from './uncertainty-pattern.png';
  import arrowUrl from './arrow.png';
  import cycloneCurrentLabel from './htmlComponents/cycloneCurrentLabel';
  import { get, writable } from 'svelte/store';
  import GeoMapAltText from './GeoMapAltText/GeoMapAltText.svelte';
  import mapStyle from './mapStyle/mapStyle';
  import { getCycloneBounds } from './mapUtils';

  let { data }: { data: CycloneGeoJson } = $props();
  let isLoaded = $state(false);
  let clientWidth = $state(0);
  /** Currently opened popup so we can close it l8r */
  let currentPopup = writable<maplibregl.Popup | undefined>();

  const MAX_ZOOM = 8;
</script>

<div class="sr-only" id="geomap-alt">
  <GeoMapAltText {data} />
</div>

<div class="geo-map" style:opacity={isLoaded ? 1 : 0} bind:clientWidth role="img" aria-describedby="geomap-alt">
  <!-- 
    Caution: when updating MapLibre, you must update the corresponding preloads in index.html.
  -->
  <MapLibreLoader
    onLoad={async ({ rootNode, maplibregl }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('DEV MODE', {
          data: $state.snapshot(data)
        });
      }

      const map = new maplibregl.Map({
        zoom: 1,
        minZoom: 2,
        maxZoom: MAX_ZOOM,
        attributionControl: false,
        dragRotate: false,
        doubleClickZoom: false,
        style: mapStyle(),
        container: rootNode,
        interactive: true,
        cooperativeGestures: true,
        center: [133.28, -28.15]
      });

      // Zoom to cyclone
      const bounds = getCycloneBounds(data, maplibregl.LngLatBounds);
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          maxZoom: MAX_ZOOM
        });
      }

      await Promise.all([new Promise(resolve => map.on('load', resolve))]);
      isLoaded = true;

      // Find the first symbol (label) layer to insert custom layers before it
      // Otherwise the solid layers obscure place names
      const layers = map.getStyle().layers;
      let firstSymbolId;
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id;
          break;
        }
      }

      map.setProjection({
        type: 'globe' // Set projection to globe
      });

      // Add GeoJSON source if data is available
      if (!data) {
        return;
      }

      const [uncertaintyData, arrowData] = await Promise.all([
        map.loadImage(uncertaintyPatternUrl),
        map.loadImage(arrowUrl)
      ]);
      map.addImage('arrow', arrowData.data); // register by name
      map.addImage('uncertainty-pattern', uncertaintyData.data);

      map.addSource('geojson-data', {
        type: 'geojson',
        data: data
      });

      // WATCH & WARNING AREAS
      map.addLayer(
        {
          id: 'geojson-watch-warning-areas',
          type: 'fill',
          source: 'geojson-data',
          filter: [
            'all',
            ['==', ['geometry-type'], 'Polygon'],
            ['any', ['==', ['get', 'areatype'], 'Watch Area'], ['==', ['get', 'areatype'], 'Warning Area']]
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
        },
        firstSymbolId
      );

      map.on('click', 'geojson-watch-warning-areas', e => {
        const { areatype, extent } = e.features?.[0]?.properties || {};

        if (!areatype || !extent) {
          return; // Safety check in case no feature was clicked
        }

        // 3. Create and show the new popup
        setTimeout(() => {
          currentPopup.set(
            new maplibregl.Popup({ closeOnClick: true })
              .setLngLat(e.lngLat)
              .setDOMContent(warningPopup({ areatype, extent }))
              .addTo(map)
          );
        });
      });

      // UNCERTAINTY PATTERN
      map.addLayer(
        {
          id: 'geojson-uncertainty',
          type: 'fill',
          source: 'geojson-data',
          filter: ['all', ['==', ['get', 'areatype'], 'Likely Tracks Area']],
          paint: {
            'fill-opacity': [
              'case',
              ['==', ['get', 'extent'], 'Up to 72 hours'],
              0.3, // Full opacity for pattern
              ['==', ['get', 'extent'], 'Up to 120 hours'],
              0.15, // Full opacity for pattern
              1 // Default opacity
            ],
            'fill-pattern': 'uncertainty-pattern'
          }
        },
        firstSymbolId
      );

      // STROKES AND ARROWS FOR CYCLONE TRACK
      map.addLayer(
        {
          id: 'geojson-track-observed',
          type: 'line',
          source: 'geojson-data',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          filter: ['all', ['==', ['get', 'tracktype'], 'Observed']],
          paint: {
            'line-color': colourConfig.stroke.Observed,
            'line-width': 3,
            'line-dasharray': [2, 1],
            'line-offset': 0
          }
        },
        firstSymbolId
      );

      map.addLayer(
        {
          id: 'geojson-track-forecast',
          type: 'line',
          source: 'geojson-data',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          filter: ['all', ['==', ['get', 'tracktype'], 'Forecast']],
          paint: {
            'line-color': colourConfig.stroke.Forecast,
            'line-width': 3,
            'line-dasharray': [1, 2],
            'line-offset': 0
          }
        },
        firstSymbolId
      );

      map.addLayer(
        {
          id: 'geojson-track-arrows',
          type: 'symbol',
          source: 'geojson-data',
          filter: ['any', ['==', ['get', 'tracktype'], 'Forecast'], ['==', ['get', 'tracktype'], 'Observed']],
          layout: {
            'symbol-placement': 'line',
            'symbol-spacing': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              100, //px
              14,
              90, //px
              18,
              60 // denser at high zooms
            ],
            'icon-image': 'arrow',
            'icon-size': 0.75,
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true
          }
        },
        firstSymbolId
      );

      // CURRENT WIND FILLS
      map.addLayer(
        {
          id: 'geojson-wind-fill',
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
        },
        firstSymbolId
      );

      // WIND STROKES
      map.addLayer(
        {
          id: 'geojson-wind-stroke',
          type: 'line',
          source: 'geojson-data',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          filter: ['any', ['has', 'windtype']],
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'windtype'], 'Damaging'],
              colourConfig.stroke.Damaging,
              ['==', ['get', 'windtype'], 'Destructive'],
              colourConfig.stroke.Destructive,
              ['==', ['get', 'windtype'], 'Very Destructive'],
              colourConfig.stroke['Very Destructive'],
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
              1 // Default line width
            ]
          }
        },
        firstSymbolId
      );

      // CYCLONE MARKERS
      data.features.forEach(feature => {
        if (feature.geometry.type !== 'Point') {
          return;
        }
        const coord = feature.geometry.coordinates;
        const { fixtype, symbol, category, fixtime } = feature.properties;
        if (!(fixtype && symbol)) {
          return;
        }

        const el = cycloneMarker({
          fixtype,
          symbol,
          category
        });
        el.addEventListener('click', e => {
          e.stopPropagation();
          setTimeout(() => {
            const _currentPopup = get(currentPopup);
            if (_currentPopup) {
              _currentPopup.remove();
              currentPopup.set(undefined);
            }
            currentPopup.set(
              new maplibregl.Popup({ closeOnClick: true, offset: 8 })
                .setLngLat(coord)
                .setDOMContent(markerPopup({ fixtype, symbol, category, fixtime }))
                .addTo(map)
            );
          });
        });
        new maplibregl.Marker({
          element: el,
          className: feature.properties.fixtype === 'Current' ? 'geo-map__current-point' : ''
        })
          .setLngLat(coord)
          .addTo(map);
      });

      // CURRENT CYCLONE POINT w ANIMATION
      const currentFix = data.features.find(
        feature => feature.geometry.type === 'Point' && feature.properties.fixtype === 'Current'
      );

      if (currentFix?.geometry.type === 'Point') {
        const coord = currentFix.geometry.coordinates;
        const { symbol, category } = currentFix.properties;

        // Rotation cyclone animation
        if (symbol && symbol === 'Cyclone') {
          const el = document.createElement('div');
          el.classList.add('geomap__cyclone-animation');
          const img = document.createElement('img');
          img.src = cycloneCategories[category];
          img.addEventListener('load', () => {
            img.classList.add('loaded');
          });
          el.appendChild(img);
          new maplibregl.Marker({ element: el }).setLngLat(coord).addTo(map);
        }

        // (re)create label w correct alignment whenever map moves
        let currentFixMarker;
        let previousIsRight;
        map.on('moveend', async () => {
          const currentFixLabelEl = cycloneCurrentLabel({ fixtime: currentFix?.properties.fixtime });

          const projectedPos = map.project(coord);
          const isRight = projectedPos.x > clientWidth / 2;
          if (isRight === previousIsRight) {
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
        });
      }
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

    .maplibregl-popup {
      z-index: 200;
    }

    .geo-map__current-point {
      z-index: 100;
    }

    // Label anchored to the left (aligned to the right)
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
      animation: fadeIn 0.25s;
    }

    // Label anchored to the right (aligned to the left)
    .geomap__current-label.maplibregl-marker-anchor-right {
      padding: 0 18px 0 5px;
    }

    .geomap__cyclone-animation {
      pointer-events: none;
    }

    .geomap__dot {
      cursor: pointer;
    }

    body .maplibregl-popup-content {
      padding: 10px 25px;
      border-radius: 1rem;
      font-family: ABCSans, Helvetica, Arial, sans-serif;
    }
    body .maplibregl-popup-close-button {
      padding: 7px 12px;
      font-size: 16px;
      border-radius: 0 1rem 0 0.25rem;
      outline: none;
      &:focus-visible,
      &:hover {
        background: rgb(0 0 0/5%);
      }
    }
    body .maplibregl-cooperative-gesture-screen > div {
      padding: 20px 40px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
      color: black;
    }

    .geomap__popup {
      text-align: center;
      font-size: 14px;
      color: rgb(34, 34, 34);
      &-status {
        font-weight: bold;
        text-transform: uppercase;
      }
      &-time {
        text-transform: uppercase;
      }
      &-category {
        font-size: 16px;
        font-weight: bold;
        text-transform: uppercase;
      }
    }
  }

  .geo-map {
    transition: opacity 0.2s;
    height: 100%;
    width: 100%;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
