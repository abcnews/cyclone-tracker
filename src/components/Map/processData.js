module.exports = function processData({ data, path, key }) {
  let areaData = [];
  let cycloneData = [];
  let weatherData = [];
  let fixData = [];
  let area = null;
  let centerArea = null;

  if (!data || !data.features) return { data: [], areaData, cycloneData, weatherData, fixData, area, centerArea };

  let likelyTracksCount = 1;
  let likelyTracks = [];

  const processedData = data.features
    .map((f, index) => {
      f.index = index;
      f.uncertaintyKey = key;
      f.x = path.centroid(f)[0];
      f.y = path.centroid(f)[1];

      if (f.properties.areatype === 'Likely Tracks Area') {
        f.likelyTracksIndex = likelyTracksCount++;
        likelyTracks.push(f);
        return null;
      }

      return f;
    })
    .filter(d => d)
    .concat(likelyTracks.reverse());

  let fallbackCenterArea;
  let forecastLine;
  processedData.forEach(d => {
    if (d.properties.areatype === 'Watch Area' || d.properties.areatype === 'Warning Area') {
      areaData.push(d);
    }

    if (d.properties.symbol === 'Cyclone' && d.properties.fixtype === 'Current') {
      cycloneData.push(d);
    }

    if (
      d.properties.areatype !== 'Watch Area' &&
      d.properties.areatype !== 'Warning Area' &&
      (d.properties.windtype || !d.properties.fixtype)
    ) {
      weatherData.push(d);
    }

    if (d.properties.fixtype && !d.properties.windtype) {
      fixData.push(d);
    }

    if (d.properties.areatype === 'Likely Tracks Area') {
      centerArea = d;
    }
    if (d.properties.tracktype === 'Observed') {
      fallbackCenterArea = d;
    }
    if (d.properties.tracktype === 'Forecast') {
      forecastLine = d;
    }
  });

  area = (forecastLine ? [forecastLine] : [fallbackCenterArea])
    .filter(a => a)
    .reduce(
      (line, current) => {
        const coordinates =
          current.geometry.coordinates[0][0] instanceof Array
            ? current.geometry.coordinates[0]
            : current.geometry.coordinates;
        line.geometry.coordinates = line.geometry.coordinates.concat(coordinates);
        return line;
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    );

  // If there are no likely tracks, just use the observed area
  if (!centerArea) {
    centerArea = fallbackCenterArea;
  }

  weatherData = weatherData.sort((a, b) => {
    if (a.properties.extent && a.properties.extent.indexOf('120')) return 1;
    return -1;
  });

  return { data, areaData, cycloneData, weatherData, fixData, area, centerArea };
};
