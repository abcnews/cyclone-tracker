const React = require('react');
const d3 = require('../../d3');
const TopoJSON = require('topojson');

const styles = require('./index.scss');
const mapJSON = require('./australia.topo.json');
const mapData = TopoJSON.feature(mapJSON, mapJSON.objects.australia).features;
const citiesJSON = require('./cities.topo.json');
const SERIF_FONT = 'ABCSerif,Book Antiqua,Palatino Linotype,Palatino,serif';
const SANS_SERIF_FONT = 'ABCSans,Helvetica,Arial,sans-serif';
const TRANSITION_DURATION = 600;

const { cycloneImages, stroke, fill } = require('./util');

class Map extends React.Component {
  constructor(props) {
    super(props);

    this.key = props.index || Math.floor(Math.random * 100000).toString();
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
    let areaData = [];
    let cycloneData = [];
    let weatherData = [];
    let fixData = [];
    let centerArea = null;

    if (!props.data || !props.data.features)
      return { data: [], areaData, cycloneData, weatherData, fixData, centerArea };

    const data = props.data.features.map(f => {
      f.uncertaintyKey = this.key;
      f.x = this.path.centroid(f)[0];
      f.y = this.path.centroid(f)[1];
      return f;
    });

    let fallbackCenterArea;
    data.forEach(d => {
      if (d.properties.areatype === 'Watch Area' || d.properties.areatype === 'Warning Area') {
        areaData.push(d);
      }

      if (d.properties.symbol === 'Cyclone' && d.properties.fixType === 'Current') {
        cycloneData.push(d);
      }

      if (d.properties.areatype !== 'Watch Area' && d.properties.areatype !== 'Warning Area' && !d.properties.fixType) {
        weatherData.push(d);
      }

      if (d.properties.fixType) {
        fixData.push(d);
      }

      if (d.properties.areatype === 'Likely Tracks Area') {
        centerArea = d;
      }
      if (d.properties.tracktype === 'Observed') {
        fallbackCenterArea = d;
      }
    });

    // If there is no likely tracks, just use the observed area
    if (!centerArea.properties) {
      centerArea = fallbackCenterArea;
    }

    return { data, areaData, cycloneData, weatherData, fixData, centerArea };
  }

  onResize() {
    this.updateGraph(this.props);
  }

  getCities(props) {
    if (!this.centerArea) return [];

    const factor = 1 / (props.zoom || 1);
    const distance = 40 * factor;

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
      .attr('width', '1')
      .attr('height', '1')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(80)')
      .append('circle')
      .attr('r', '1')
      .attr('transform', 'translate(1,1)')
      .attr('fill', '#555');

    this.everything = this.svg.append('g');

    this.mapFeatures = this.everything.append('g');
    this.mapFeatures
      .selectAll('path')
      .data(mapData)
      .enter()
      .append('path')
      .style('stroke', '#fff')
      .style('fill', '#ccc')
      .attr('d', this.path);

    const { areaData, cycloneData, weatherData, fixData, centerArea } = this.processData(props);

    this.areaFeatures = this.everything.append('g');
    this.areaFeatures
      .selectAll('path')
      .data(areaData)
      .enter()
      .append('path')
      .attr('d', this.path)
      .style('fill', fill);

    this.places = this.everything.append('g');

    // Give the current cyclone a swirling wind
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
    this.features = this.everything.append('g');
    this.features
      .selectAll('path')
      .data(weatherData)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', d => (d.properties.tracktype ? styles.track : ''))
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

    let factor = 1 / (props.zoom || 1);
    let zoom = props.zoom;

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
      .attr('width', 8 * factor)
      .attr('height', 8 * factor);
    this.svg
      .select('#uncertainty' + this.key + ' circle')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', 2 * factor)
      .attr('transform', `translate(${1 * factor},${1 * factor})`);

    const { data, areaData, cycloneData, weatherData, fixData, centerArea } = this.processData(props);
    this.centerArea = centerArea;

    // Work out where the center of the map is
    let center;
    if (data.length > 0) {
      if (props.center === 'current') {
        const current = props.data.features.filter(f => f.properties.fixType === 'Current')[0];
        if (current) {
          center = this.path.centroid(current);
        }
      } else if (props.center !== '') {
        const city = citiesJSON.features.filter(f => f.properties.name.toLowerCase() === props.center.toLowerCase())[0];
        if (city) {
          center = this.path.centroid(city);
        }
      }
    }
    if (!center) {
      if (this.centerArea) {
        center = this.path.centroid(this.centerArea);
      } else {
        center = this.path.centroid({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[136, -27]] } });
        zoom = 1;
        factor = 1;
      }
    }

    const transform = `translate(${this.width / 2}, ${this.height /
      2}) scale(${zoom}) translate(${-center[0]}, ${-center[1]})`;
    if (willTransition) {
      this.everything
        .transition()
        .duration(TRANSITION_DURATION)
        .attr('transform', transform);
    } else {
      this.everything.attr('transform', transform);
    }

    this.mapFeatures.attr('d', this.path).style('stroke-width', 1 * factor);

    // Render the warning areas
    this.areaFeatures
      .selectAll('path')
      .data(areaData)
      .attr('d', this.path);

    // Render place dots and names
    // These need to tashed and re-added because they might all completely change
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
    this.features
      .selectAll('path')
      .data(weatherData)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('d', this.path)
      .style('stroke-width', 2 * factor)
      .style('stroke-dasharray', d => {
        if (d.properties.tracktype) {
          return `${10 * factor} ${4 * factor}`;
        }
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
