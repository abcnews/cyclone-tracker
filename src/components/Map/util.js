const tinycolor = require('tinycolor2');

const cycloneImages = {
  '1': require('./cyclone-1.svg'),
  '2': require('./cyclone-2.svg'),
  '3': require('./cyclone-3.svg'),
  '4': require('./cyclone-4.svg'),
  '5': require('./cyclone-5.svg')
};

function stroke(d) {
  if (d.properties.tracktype) {
    switch (d.properties.tracktype) {
      default:
      case 'Observed':
        return '#666';
      case 'Forecast':
        return '#515151';
    }
  } else if (d.properties.windtype) {
    switch (d.properties.windtype) {
      default:
      case 'Damaging':
        return '#b60707';
      case 'Destructive':
        return '#600000';
    }
  } else if (d.properties.fixType) {
    return '#fff';
  }

  return 'transparent';
}

function fill(d) {
  if (d.properties.areatype) {
    switch (d.properties.areatype) {
      default:
      case 'Likely Tracks Area':
        return 'url(#uncertainty' + d.uncertaintyKey + ')';
      case 'Watch Area':
        return '#ffbd55';
      case 'Warning Area':
        return '#ff9255';
    }
  } else if (d.properties.symbol) {
    let colour;

    if (d.properties.symbol === 'Low') {
      colour = '#85D0D9';
    } else {
      switch (d.properties.category) {
        default:
        case '1':
          colour = '#FFCC8B';
          break;
        case '2':
          colour = '#FF8C63';
          break;
        case '3':
          colour = '#FF5D48';
          break;
        case '4':
          colour = '#D60D4C';
          break;
        case '5':
          colour = '#760040';
          break;
      }
    }

    if (d.properties.fixType === 'Observed') {
      colour = tinycolor(colour)
        .desaturate(30)
        .toString();
    }

    return colour;
  }

  return 'transparent';
}

module.exports = { cycloneImages, fill, stroke };
