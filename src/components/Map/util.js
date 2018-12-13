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
    'Very Destructive': '#000000',
    fix: '#fff'
  },
  fill: {
    Damaging: 'rgba(182, 7, 7, 0.2)',
    Destructive: 'rgba(96, 0, 0, 0.2)',
    'Very Destructive': 'rgba(50, 0, 0, 0.2',
    'Likely Tracks Area': d => `url(#uncertainty${d.uncertaintyKey})`,
    'Watch Area': '#ffbd55',
    'Warning Area': '#ff9255',
    Low: '#85D0D9',
    '1': '#FFCC8B',
    '2': '#FF8C63',
    '3': '#FF5D48',
    '4': '#D60D4C',
    '5': '#760040'
  },
  labels: {
    Low: '#2A8189',
    '1': '#AD6200',
    '2': '#DB3A00',
    '3': '#E81B00',
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
  } else if (d.properties.fixtype === 'Current' && d.properties.windtype) {
    c = colourConfig.fill[d.properties.windtype];
  } else {
    return 'transparent';
  }

  if (typeof c === 'function') {
    c = c(d);
  }

  return c;
}

function labels(d) {
  let c;

  if (d.properties.symbol) {
    c = d.properties.symbol === 'Low' ? colourConfig.labels['Low'] : colourConfig.labels[d.properties.category];
  }

  return c;
}

module.exports = { cycloneImages, fill, stroke, labels };
