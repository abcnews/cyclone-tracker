const React = require('react');
const d3 = require('../../d3');
const TopoJSON = require('topojson');

const styles = require('./index.scss');
const mapJSON = require('./australia.topo.json');
const mapData = TopoJSON.feature(mapJSON, mapJSON.objects.australia).features;
const citiesJSON = require('./cities.topo.json');
const SERIF_FONT = 'ABCSerif,Book Antiqua,Palatino Linotype,Palatino,serif';
const SANS_SERIF_FONT = 'ABCSans,Helvetica,Arial,sans-serif';
const TRANSITION_DURATION = 500;

const { cycloneImages, stroke, fill } = require('./util');

class Map extends React.Component {
  constructor(props) {
    super(props);

    this.key = props.index;
    this.processData = this.processData.bind(this);

    this.getCities = this.getCities.bind(this);

    this.initGraph = this.initGraph.bind(this);
    this.updateGraph = this.updateGraph.bind(this);

    this.onResize = this.onResize.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.updateGraph(nextProps, true);
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    this.initGraph(this.props);
    this.updateGraph(this.props);

    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
  }

  processData(props) {
    return props.data.features.map(f => {
      f.uncertaintyKey = this.key;
      f.x = this.path.centroid(f)[0];
      f.y = this.path.centroid(f)[1];
      return f;
    });
  }

  onResize() {
    this.updateGraph(this.props);
  }

  getCities(props) {
    const factor = 1 / (props.zoom || 1);
    const distance = 20 * props.zoom;

    const bounds = this.path.bounds(this.centerArea);
    return citiesJSON.features
      .map(c => {
        c.x = this.path.centroid(c)[0] + 8 * factor;
        c.y = this.path.centroid(c)[1] + 4 * factor;
        return c;
      })
      .filter(c => {
        if (c.x < bounds[0][0] - distance) return false;
        if (c.x > bounds[1][0] + distance) return false;
        if (c.y < bounds[0][1] - distance) return false;
        if (c.y > bounds[1][1] + distance) return false;

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

          const isClose = Math.abs(current.x - other.x) < 7 * factor || Math.abs(current.y - other.y) < 7 * factor;
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

    this.projection = d3
      .geoMercator()
      .scale(900)
      .center([136, -27]);

    this.path = d3.geoPath().projection(this.projection);

    this.svg = d3.select(this.base).append('svg');

    this.svg
      .append('defs')
      .append('pattern')
      .append('defs')
      .append('pattern')
      .attr('id', 'uncertainty' + this.key)
      .attr('width', '6')
      .attr('height', '8')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(80)')
      .append('rect')
      .attr('width', '2')
      .attr('height', '8')
      .attr('transform', 'translate(0,0)')
      .attr('fill', '#555');

    this.everything = this.svg.append('g').attr('class', 'everything');

    this.mapFeatures = this.everything.append('g').attr('class', styles.features);
    this.mapFeatures
      .selectAll('path')
      .data(mapData)
      .enter()
      .append('path')
      .style('stroke', '#fff')
      .style('fill', '#ccc')
      .attr('d', this.path);

    const data = this.processData(props);

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

    this.centerArea = props.data.features.filter(f => f.properties.areatype === 'Likely Tracks Area')[0];
    if (!this.centerArea) {
      this.centerArea = props.data.features.filter(f => f.properties.tracktype === 'Observed')[0];
    }

    const cities = this.getCities(props);
    this.places = this.everything.append('g').attr('class', styles.features);

    const cycloneData = data.filter(f => {
      return f.properties.symbol === 'Cyclone' && f.properties.fixType === 'Current';
    });
    this.images = this.everything.append('g');
    this.images
      .selectAll('image')
      .data(cycloneData)
      .enter()
      .append('image')
      .lower()
      .attr('class', styles.cycloneImage)
      .attr('href', d => cycloneImages[d.properties.category]);

    // Render the weather stuff
    const weatherData = data.filter(f => {
      return (
        f.properties.areatype !== 'Watch Area' && f.properties.areatype !== 'Warning Area' && !f.properties.fixType
      );
    });
    const fixData = data.filter(f => {
      return f.properties.fixType;
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
      .style('stroke-width', 2)
      .style('fill', fill)
      .style('opacity', d => (d.properties.areatype === 'Likely Tracks Area' ? 0.3 : 1));
    this.dots = this.features
      .selectAll('g.dot')
      .data(fixData)
      .enter()
      .append('g')
      .attr('class', 'dot');

    this.dots
      .append('circle')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    this.dots
      .append('text')
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('font-size', 14)
      .attr('fill', 'white')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
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

  /**
   * Update the values on the map
   * @param {object} props
   * @param {boolean?} willTransition
   */
  updateGraph(props, willTransition) {
    transition = typeof transition === 'undefined' ? true : transition;

    const factor = 1 / (props.zoom || 1);

    this.width = props.width || window.innerWidth;
    this.height = props.height || window.innerHeight;

    this.svg
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', '#efefef');

    this.svg
      .select('#uncertainty' + this.key)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('width', 12 * factor)
      .attr('height', 16 * factor);
    this.svg
      .select('#uncertainty' + this.key + ' rect')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('width', 4 * factor)
      .attr('height', 16 * factor);

    // Work out where the center of the map is
    this.centerArea = props.data.features.filter(f => f.properties.areatype === 'Likely Tracks Area')[0];
    if (!this.centerArea) {
      this.centerArea = props.data.features.filter(f => f.properties.tracktype === 'Observed')[0];
    }
    const center = this.path.centroid(this.centerArea);

    const transform = `translate(${this.width / 2}, ${this.height / 2}) scale(${
      props.zoom
    }) translate(${-center[0]}, ${-center[1]})`;
    if (willTransition) {
      this.everything
        .transition()
        .duration(TRANSITION_DURATION)
        .attr('transform', transform);
    } else {
      this.everything.attr('transform', transform);
    }

    this.mapFeatures.attr('d', this.path).style('stroke-width', 1 * factor);

    // Work out the cyclone information
    const data = this.processData(props);

    // Render the warning areas
    const areaData = data.filter(f => {
      return f.properties.areatype === 'Watch Area' || f.properties.areatype === 'Warning Area';
    });

    this.areaFeatures
      .selectAll('path')
      .data(areaData)
      .attr('d', this.path);

    // Render place dots and names
    const cities = this.getCities(props);
    this.places.selectAll('path').remove();
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
          .pointRadius(3 * factor)
      )
      .attr('fill', 'transparent')
      .attr('stroke', 'black')
      .attr('stroke-width', 1 * factor);
    this.places.selectAll('text').remove();
    this.places
      .selectAll('text')
      .data(cities)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('font-family', SANS_SERIF_FONT)
      .text(d => d.properties.name)
      .attr('font-size', 12 * factor);

    // Give the current cyclone (if there is one) a spinning animation
    const cycloneData = data.filter(f => {
      return f.properties.symbol === 'Cyclone' && f.properties.fixType === 'Current';
    });
    const cycloneSize = 60 * factor;
    this.images
      .selectAll('image')
      .data(cycloneData)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('href', d => cycloneImages[d.properties.category])
      .attr('x', d => d.x - cycloneSize / 2)
      .attr('y', d => d.y - cycloneSize / 2)
      .attr('width', cycloneSize)
      .attr('height', cycloneSize);

    // Render the weather stuff
    const weatherData = data.filter(f => {
      return f.properties.areatype !== 'Watch Area' && f.properties.areatype !== 'Warning Area';
    });
    this.features
      .selectAll('path')
      .data(weatherData)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('d', this.path)
      .style('stroke-width', 2 * factor);

    const fixData = data.filter(f => {
      return f.properties.fixType;
    });
    this.dots.data(fixData);

    this.dots
      .selectAll('circle')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', 12 * factor)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke-width', 2 * factor);
    this.dots
      .selectAll('text')
      .data(data)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', 14 * factor)
      .attr('dy', 4 * factor);
  }

  render() {
    return <div className={styles.base} ref={el => (this.base = el)} />;
  }
}

module.exports = Map;
