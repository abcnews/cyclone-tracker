import type { CategoryType, FixType, SymbolType } from '../../Loader/types';
import colourConfig from '../colours';
import { safeHtml } from '../mapUtils';

export default function cycloneMarker({
  fixtype,
  symbol,
  category
}: {
  fixtype: FixType;
  symbol: SymbolType;
  category: CategoryType;
}) {
  const className = `geomap__dot fix-${fixtype} symbol-${symbol} category-${category}`;
  const el = document.createElement('div');
  const radius = 12;
  const outerStroke = 4;
  const innerStroke = 2;
  const width = radius * 2 + outerStroke;
  const fill =
    fixtype === 'Observed' ? colourConfig.fillObserved[category || 'Low'] : colourConfig.fill[category || 'Low'];
  el.innerHTML = `
  <svg class="${className}" width="${width}" height="${width}">
        <circle
            class="stroke"
            fill="white"
            stroke="black"
            stroke-width="${outerStroke}"
            r="${radius}"
            cx="${width / 2}"
            cy="${width / 2}"
            opacity="${fixtype === 'Observed' ? 0 : 1}"
        />
        <circle
            class="fill"
            fill="${fill}"
            stroke="${fixtype === 'Observed' ? 'black' : 'white'}"
            r="${fixtype === 'Observed' ? 10 : radius}"
            cx="${width / 2}"
            cy="${width / 2}"
            stroke-width="${fixtype === 'Observed' ? 1 : innerStroke}"
        />
        <text
            class="letter"
            dy="5"
            x="${width / 2}"
            y="${width / 2}"
            fill="${symbol === 'Low' || Number(category) < 4 ? 'black' : 'white'}"
            font-family="ABCSans, Helvetica, Arial, sans-serif"
            font-weight="bold"
            font-size="14px"
            text-anchor="middle"
            pointer-events="none"
        >
            ${symbol === 'Low' ? 'L' : safeHtml(category)}
        </text>
    </svg>
    `;
  return el;
}
