const tinycolor = require('tinycolor2');

const cycloneImages = {
  '1': require('./cyclone-1.svg'),
  '2': require('./cyclone-2.svg'),
  '3': require('./cyclone-3.svg'),
  '4': require('./cyclone-4.svg'),
  '5': require('./cyclone-5.svg')
};

const colourConfig = {
  stroke: {
    Observed: '#666',
    Forecast: '#515151',
    Damaging: '#b60707',
    Destructive: '#600000',
    fix: '#fff'
  },
  fill: {
    'Likely Tracks Area': d => `url(#uncertainty${d.uncertaintyKey})`,
    'Watch Area': '#ffbd55',
    'Warning Area': '#ff9255',
    Low: '#85D0D9',
    '1': '#FFCC8B', // When modifying cyclone colours, make sure to modify the SVGs as well
    '2': '#FF8C63',
    '3': '#FF5D48',
    '4': '#D60D4C',
    '5': '#760040'
  }
};

function stroke(d) {
  let c;
  if (d.properties.tracktype) {
    c = colourConfig.stroke[d.properties.tracktype];
  } else if (d.properties.windtype) {
    c = colourConfig.stroke[d.properties.windtype];
  } else if (d.properties.fixtype) {
    c = colourConfig.stroke.fix;
  } else {
    return 'transparent';
  }

  if (typeof c === 'function') {
    c = c(d);
  }

  return c;
}

function fill(d) {
  let c;

  if (d.properties.areatype) {
    c = colourConfig.fill[d.properties.areatype];
  } else if (d.properties.symbol) {
    let colour = d.properties.symbol === 'Low' ? colourConfig.fill['Low'] : colourConfig.fill[d.properties.category];
    if (d.properties.fixtype === 'Observed') {
      // Fade out previous observations
      colour = tinycolor(colour)
        .desaturate(30)
        .toString();
    }
    c = colour;
  } else {
    return 'transparent';
  }

  if (typeof c === 'function') {
    c = c(d);
  }

  return c;
}

module.exports = { cycloneImages, fill, stroke };
