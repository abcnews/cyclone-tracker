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
    if (d.properties.fixType === 'Observed') {
      return '#666';
    } else if (d.properties.symbol === 'Low') {
      return '#00a8ab';
    } else {
      switch (d.properties.category) {
        default:
        case '1':
          return '#5fa800';
        case '2':
          return '#a0a300';
        case '3':
          return '#c78800';
        case '4':
          return '#d65200';
        case '5':
          return '#db0243';
      }
    }
  }

  return 'transparent';
}

module.exports = { cycloneImages, fill, stroke };
