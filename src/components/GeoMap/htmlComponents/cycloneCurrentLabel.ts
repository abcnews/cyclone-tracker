import { format } from 'date-fns';
export default function cycloneCurrentLabel({ fixtime }: { fixtime: string | undefined }) {
  const el = document.createElement('div');
  if (!fixtime) {
    return el;
  }
  el.classList.add('geomap__current-label');
  el.innerHTML = `Current: ${format(fixtime, 'ddd D/M ha')}`;
  return el;
}
