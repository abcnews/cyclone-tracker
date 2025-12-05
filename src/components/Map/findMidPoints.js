import { svgPathProperties } from 'svg-path-properties';

const distanceBetweenPoints = (p1, p2) => {
  const diffX = Math.abs(p2.x - p1.x);
  const diffY = Math.abs(p2.y - p1.y);

  return Math.round(Math.sqrt(diffX * diffX + diffY * diffY));
};

export default function findMidPoints(path, fixes) {
  let points = [];

  console.log('path', path.node(), path);

  path = svgPathProperties(path.node().getAttribute('d'));
  const totalLength = path.getTotalLength();

  let lastFixAtLength = 0;
  for (let i = 1; i <= 200; i++) {
    const length = Math.round((i / 200) * totalLength);

    const p = path.getPointAtLength(length);

    // See if there is a fix point nearby
    const nearbyFixes = fixes.filter(f => distanceBetweenPoints(f, p) <= 2);

    if (nearbyFixes.length > 0) {
      const halfwayLength = lastFixAtLength + (length - lastFixAtLength) / 2;

      // Make sure our points aren't too close together
      if (halfwayLength - lastFixAtLength >= 3) {
        const p1 = path.getPointAtLength(halfwayLength);
        const p2 = path.getPointAtLength(halfwayLength + 1);
        const rotation = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
        points.push({ x: p1.x, y: p1.y, rotation, lengthSinceMarker: halfwayLength - lastFixAtLength });

        lastFixAtLength = length;
      }
    }
  }

  return points;
}
