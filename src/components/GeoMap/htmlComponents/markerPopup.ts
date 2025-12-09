import { format } from 'date-fns';
import colourConfig from '../colours';
import { safeHtml } from '../mapUtils';

export default function markerPopup({ fixtype, symbol, category, fixtime }) {
  const el = document.createElement('div');
  el.classList.add('geomap__popup');
  const categoryColour = colourConfig.labels[category || 'Low'];
  el.innerHTML = `
  <div class="geomap__popup-status" role="heading" aria-level="2">${safeHtml(fixtype)}</div>
    <div class="geomap__popup-time">${format(fixtime, 'ddd D MMM, h:mma')}</div>
    <div class="geomap__popup-category" style="color:${categoryColour}">
    ${symbol === 'Low' ? 'Tropical Low' : `Category ${safeHtml(category)}`}
    </div>
  `;
  return el;
}
