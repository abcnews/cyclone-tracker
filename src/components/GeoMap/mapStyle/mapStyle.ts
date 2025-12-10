import style from './style.json';

/**
 * MapLibre style definition, based on Andrew Kesper's "bright" base map.
 *
 * @see https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/style.json
 */
export default function mapStyle() {
  // REWRITE STYLE TO MATCH DATAWRAPPER
  const LAND = '#EDF0F2';
  const OCEAN = '#AFCCDB';
  const DARK_OCEAN = '#a2bbc9';
  const TEXT = '#5B687C';
  const TEXT_HALO = '#FFF';
  style.layers = style.layers
    .filter(layer => {
      return layer.id !== 'boundary-water' && !layer.id.includes('boundary-');
    })
    .map(layer => {
      // LAND
      if (layer.id === 'background') {
        layer.paint['background-color'] = LAND;
      }

      // WATER
      if (layer.paint['fill-color'] === 'hsl(210, 67%, 85%)') {
        layer.paint['fill-color'] = OCEAN;
      }
      if (layer.paint['line-color'] === '#a0c8f0') {
        layer.paint['line-color'] = DARK_OCEAN;
      }
      if (layer.paint['fill-color'] === '#a0c8f0') {
        layer.paint['fill-color'] = DARK_OCEAN;
      }

      // PLACE LABELS
      if (layer.id.includes('place-')) {
        layer.layout = {
          ...layer.layout,
          'text-font': ['ABC Sans Regular'],
          // @ts-ignore - text-letter-spacing is valid
          'text-letter-spacing': 0.36,
          'text-transform': 'uppercase'
        };
        layer.paint = { 'text-color': TEXT, 'text-halo-color': TEXT_HALO, 'text-halo-width': 1.2 };
      }

      // ROAD STYLES
      if (layer.id.includes('highway')) {
        if (layer.id.includes('casing')) {
          //@ts-ignore - conditional line colour is valid
          layer.paint['line-color'] = {
            stops: [
              [12, '#BDBDBD'],
              [12.5, '#E1E4E5']
            ]
          };
        } else if (layer.paint['line-color']) {
          layer.paint['line-color'] = '#fff';
        }
      }

      return layer;
    });

  return style;
}
