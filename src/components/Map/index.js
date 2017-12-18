const React = require('react');
const d3 = require('../../d3');
const TopoJSON = require('topojson');

const styles = require('./index.scss');
const mapJSON = require('./australia.topo.json');
const citiesJSON = require('./cities.topo.json');
const SERIF_FONT = 'ABCSerif,Book Antiqua,Palatino Linotype,Palatino,serif';
const SANS_SERIF_FONT = 'ABCSans,Helvetica,Arial,sans-serif';

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
        return 'url(#uncertainty)';
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

class Map extends React.Component {
  constructor(props) {
    super(props);

    this.getCities = this.getCities.bind(this);

    this.initGraph = this.initGraph.bind(this);
    this.updateGraph = this.updateGraph.bind(this);

    this.onResize = this.onResize.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    // TODO: Add any conditions that mitigate updating the graph
    this.updateGraph(nextProps);
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    this.initGraph(this.props);

    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  }

  onResize() {
    this.svg
      .attr('width', this.props.width || window.innerWidth)
      .attr('height', this.props.height || window.innerWidth);
  }

  getCities() {
    const bounds = this.path.bounds(this.centerArea);
    return citiesJSON.features
      .map(c => {
        c.x = this.path.centroid(c)[0] + 4;
        c.y = this.path.centroid(c)[1] + 2;
        return c;
      })
      .filter(c => {
        if (c.x < bounds[0][0] - 20) return false;
        if (c.x > bounds[1][0] + 20) return false;
        if (c.y < bounds[0][1] - 20) return false;
        if (c.y > bounds[1][1] + 20) return false;

        return true;
      })
      .sort((a, b) => {
        return a.properties.population > b.properties.population ? -1 : 1;
      })
      .slice(0, 100)
      .map((current, index, array) => {
        let r = current;
        // If there is another one that is near here and this one has a lower population then return null
        array.forEach(other => {
          if (!other) return;

          const isClose = Math.abs(current.x - other.x) < 3 || Math.abs(current.y - other.y) < 2;
          if (isClose && current.properties.population < other.properties.population) {
            r = null;
          }
        });

        return r;
      })
      .filter(c => c);
  }

  /**
   * Initialize the graph
   * @param {object} props The latest props that were given to this component
   */
  initGraph(props) {
    if (!this.base) return;

    this.width = props.width || window.innerWidth;
    this.height = props.height || window.innerHeight;

    this.projection = d3
      .geoMercator()
      // Adjust scale to zoom in and out while maintaining the scale of the annotations
      .scale(this.width * 0.9)
      .center([136, -27]);

    this.path = d3
      .geoPath()
      .projection(this.projection)
      .pointRadius(6);

    this.svg = d3
      .select(this.base)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', '#efefef');

    this.svg
      .append('defs')
      .append('pattern')
      .append('defs')
      .append('pattern')
      .attr('id', 'uncertainty')
      .attr('width', '6')
      .attr('height', '8')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(80)')
      .append('rect')
      .attr('width', '2')
      .attr('height', '8')
      .attr('transform', 'translate(0,0)')
      .attr('fill', '#555');

    // Render Australia (and a few surrounding countries)
    const mapData = TopoJSON.feature(mapJSON, mapJSON.objects.australia).features;

    // Work out where the center of the map is
    this.centerArea = props.data.features.filter(f => f.properties.areatype === 'Likely Tracks Area')[0];
    if (!this.centerArea) {
      this.centerArea = props.data.features.filter(f => f.properties.tracktype === 'Observed')[0];
    }
    const center = this.path.centroid(this.centerArea);

    this.everything = this.svg
      .append('g')
      .attr(
        'transform',
        `translate(${this.width / 2}, ${this.height / 2}) scale(2) translate(${-center[0]}, ${-center[1]})`
      );

    this.mapFeatures = this.everything.append('g').attr('class', styles.features);
    this.mapFeatures
      .selectAll('path')
      .data(mapData)
      .enter()
      .append('path')
      .attr('d', this.path)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .style('fill', '#ccc');

    // Work out the cyclone information
    const data = props.data.features.map(f => {
      f.x = this.path.centroid(f)[0];
      f.y = this.path.centroid(f)[1];
      return f;
    });

    // Render the warning areas
    const areaData = data.filter(f => {
      return f.properties.areatype === 'Watch Area' || f.properties.areatype === 'Warning Area';
    });
    this.areaFeatures = this.everything.append('g');
    this.areaFeatures
      .selectAll('path')
      .data(areaData)
      .enter()
      .append('path')
      .attr('d', this.path)
      .style('fill', fill);

    // Render place dots and names
    const cities = this.getCities();
    this.places = this.everything.append('g').attr('class', styles.features);
    this.places
      .selectAll('path')
      .data(cities)
      .enter()
      .append('path')
      .attr(
        'd',
        d3
          .geoPath()
          .projection(this.projection)
          .pointRadius(2)
      )
      .attr('fill', 'transparent')
      .attr('stroke', 'black');

    this.places
      .selectAll('text')
      .data(cities)
      .enter()
      .append('text')
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-size', 6)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .text(d => d.properties.name);

    // Give any cyclones a spinning animation
    const cycloneData = data.filter(f => {
      return f.properties.symbol === 'Cyclone' && f.properties.fixType === 'Current';
    });
    this.everything
      .selectAll('image')
      .data(cycloneData)
      .enter()
      .append('image')
      .attr('class', styles.cycloneImage)
      .attr('href', d => cycloneImages[d.properties.category])
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', 27)
      .attr('height', 27);

    // Render the weather stuff
    const weatherData = data.filter(f => {
      return f.properties.areatype !== 'Watch Area' && f.properties.areatype !== 'Warning Area';
    });
    this.features = this.everything.append('g').attr('class', styles.features);
    this.features
      .selectAll('path')
      .data(weatherData)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', d => {
        if (d.properties.tracktype) {
          return styles.track;
        }
        return '';
      })
      .style('stroke', stroke)
      .style('stroke-width', 1)
      .style('fill', fill)
      .style('opacity', d => (d.properties.areatype === 'Likely Tracks Area' ? 0.3 : 1))
      .on('click', d => {
        console.log('d', d);
      });
    this.features
      .selectAll('text')
      .data(data)
      .enter()
      .append('text')
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('font-size', 7)
      .attr('fill', 'white')
      .attr('text-anchor', 'middle')
      .attr('dy', 2)
      .attr('x', d => d.x || -1000)
      .attr('y', d => d.y || -1000)
      .text(d => {
        if (d.properties.symbol) {
          switch (d.properties.symbol) {
            case 'Low':
              return 'L';
            case 'Cyclone':
              return d.properties.category;
          }
        }
      });
  }

  updateGraph(props) {
    if (!this.base) return;

    // TODO: Use D3 to update the graph
  }

  render() {
    return <div className={styles.base} ref={el => (this.base = el)} />;
  }
}

module.exports = Map;
