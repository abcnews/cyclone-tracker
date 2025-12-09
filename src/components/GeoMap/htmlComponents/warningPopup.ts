import { safeHtml } from '../mapUtils';

export default function warningPopup({ areatype, extent }) {
  const el = document.createElement('div');
  el.classList.add('geomap__popup');
  el.innerHTML = `
  <div class="geomap__popup-status" role="heading" aria-level="2">${safeHtml(areatype)}</div>
    <div class="geomap__popup-extent">
    ${safeHtml(extent)}
    </div>
  `;
  return el;
}
