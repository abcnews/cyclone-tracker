import citiesJSON from './cities.topo.json';

export default function getCities({ centerArea, zoom, requestedCities = [], path }) {
  const bounds = path.bounds(centerArea);
  const factor = 1 / (zoom || 1);
  const distance = 40;

  const targetCities = citiesJSON.features.filter(city => {
    return requestedCities.length === 0 || requestedCities.includes(city.properties.id);
  });

  const citiesWithCoords = targetCities.map(c => {
    c.x = path.centroid(c)[0];
    c.y = path.centroid(c)[1];
    return c;
  });

  const citiesInBounds = requestedCities
    ? citiesWithCoords
    : citiesWithCoords.filter(c => {
        if (c.x < bounds[0][0] - distance) return false;
        if (c.x > bounds[1][0] + distance) return false;
        if (c.y < bounds[0][1] - distance) return false;
        if (c.y > bounds[1][1] + distance) return false;

        return true;
      });

  const filteredCities = citiesInBounds
    .sort((a, b) => {
      return a.properties.population > b.properties.population ? -1 : 1;
    })
    .slice(0, 100)
    .map((current, index, array) => {
      let r = current;
      // If there is another one that is near here and this one has a lower population then return null
      array.forEach(other => {
        if (!other) return;

        const [xClose, yClose] = factor <= 0.2 ? [2.2 * factor, 5 * factor] : [4 * factor, 5 * factor];

        const isClose = Math.abs(current.x - other.x) < xClose || Math.abs(current.y - other.y) < yClose;
        if (isClose && current.properties.population < other.properties.population) {
          r = null;
        }
      });

      return r;
    })
    .filter(c => c);
  return filteredCities;
}
