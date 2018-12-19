const React = require('react');
const format = require('date-fns/format');
const d3 = require('../../d3');
const select = require('d3-selection');
const TopoJSON = require('topojson');
const tinycolor = require('tinycolor2');

const styles = require('./index.scss');
const mapJSON = require('./australia.topo.json');
const mapData = TopoJSON.feature(mapJSON, mapJSON.objects.australia).features;
const citiesJSON = require('./cities.topo.json');
const SERIF_FONT = 'ABCSerif,Book Antiqua,Palatino Linotype,Palatino,serif';
const SANS_SERIF_FONT = 'ABCSans,Helvetica,Arial,sans-serif';
const TRANSITION_DURATION = 400;

const BALLOON_HEIGHT = 95;

const { cycloneImages, stroke, fill, labels } = require('./util');

class Map extends React.Component {
  constructor(props) {
    super(props);

    this.getWrappedText = this.getWrappedText.bind(this);
    this.createBalloon = this.createBalloon.bind(this);

    this.key = props.index || Math.floor(Math.random() * 100000).toString();
    this.processData = this.processData.bind(this);

    this.getCities = this.getCities.bind(this);

    this.initGraph = this.initGraph.bind(this);
    this.updateGraph = this.updateGraph.bind(this);

    this.onResize = this.onResize.bind(this);

    this.canCreateBalloon = true;
  }

  componentWillReceiveProps(nextProps) {
    const recenter = nextProps.center !== this.props.center;
    this.updateGraph(nextProps, true, recenter);
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidMount() {
    if (this.props.data) {
      this.initGraph(this.props);
      this.updateGraph(this.props, false);
    }

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
    let area = null;
    let centerArea = null;

    if (!props.data || !props.data.features)
      return { data: [], areaData, cycloneData, weatherData, fixData, area, centerArea };

    let likelyTracksCount = 1;
    let likelyTracks = [];

    const data = props.data.features
      .map((f, index) => {
        f.index = index;
        f.uncertaintyKey = this.key;
        f.x = this.path.centroid(f)[0];
        f.y = this.path.centroid(f)[1];

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
    data.forEach(d => {
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

    // TODO: change this to focus on the forecast area
    area = [fallbackCenterArea, forecastLine, centerArea]
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
  }

  getWrappedText(text, maxWidth) {
    maxWidth = maxWidth || 150;

    const svg = this.svg;
    const words = text.split(' ');
    let lines = [''];
    let lineIndex = 0;
    let currentLineLength = 0;

    words.forEach(word => {
      // work out its bounding box
      const textElement = svg
        .append('text')
        .attr('font-size', 14)
        .attr('font-family', SANS_SERIF_FONT)
        .text(word + ' ');
      const box = textElement.node().getBBox();
      textElement.remove();

      if (currentLineLength + box.width > maxWidth) {
        lines.push('');
        lineIndex++;
        currentLineLength = 0;
      }

      lines[lineIndex] += word + ' ';
      currentLineLength += box.width;
    });

    return lines;
  }

  createBalloon(text, x, y, parentGroup) {
    if (this.canCreateBalloon !== true) return;

    if (this.hintBalloon) this.hintBalloon.remove();

    this.popupIndex = null;
    this.center = [x, y];
    this.updateGraph(this.props, true, false);

    if (!parentGroup) parentGroup = this.fixes;

    // create a new group on the given group
    const balloon = parentGroup
      .append('g')
      .attr('class', 'popup')
      .attr('fill', 'white');

    const lines = this.getWrappedText(text, 145);
    const width = 190;
    const height = 30 + lines.length * 20;

    balloon
      .append('rect')
      .attr('fill', 'white')
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('width', width)
      .attr('height', height - 5)
      .attr('stroke', 'rgba(0,0,0,0.3)')
      .style('strock-width', 1);

    balloon
      .append('polygon')
      .attr('points', '0,0 8,10, 16,0')
      .attr('transform', `translate(90, ${height - 5})`)
      .attr('stroke', 'rgba(0,0,0,0.3)')
      .style('strock-width', 1);
    balloon
      .append('polygon')
      .attr('points', '0,0 8,10, 16,0')
      .attr('transform', `translate(90, ${height - 6})`)
      .attr('stroke', 'white')
      .style('strock-width', 1);

    lines.forEach((line, index) => {
      balloon
        .append('text')
        .attr('font-size', 14)
        .attr('font-family', SANS_SERIF_FONT)
        .attr('fill', '#222')
        .attr('text-anchor', 'start')
        .attr('x', 15)
        .attr('y', 25 + index * 20)
        .text(line);
    });

    balloon
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('fill', '#999')
      .attr('text-anchor', 'end')
      .attr('x', width - 7)
      .attr('dy', 7)
      .attr('y', 7)
      .text('x')
      .style('cursor', 'pointer');

    balloon.on('click', d => {
      this.hintBalloon.remove();
      this.hintBalloon = null;
    });

    const factor = 1 / this.zoom;
    balloon.attr('transform', `translate(${x - (width / 2) * factor}, ${y - height * factor - 2}) scale(${factor})`);
    balloon.props = { x, y, width, height };

    this.hintBalloon = balloon;
  }

  onResize() {
    this.updateGraph(this.props);
  }

  getCities(props, zoom) {
    if (!this.centerArea) return [];

    const factor = 1 / (zoom || props.zoom || 1);
    const distance = 40;

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
    this.svg.append('style').text(`@keyframes marching {
      to {
        stroke-dashoffset: -14;
      }
    }`);

    // Drag around the map
    let dragStart = null;
    let centerDragStart = null;
    this.svg
      .on('mousedown touchstart', () => {
        if (window.parent) window.parent.postMessage({ lockScroll: true });

        const e = select.event.touches ? select.event.touches[0] : select.event;

        dragStart = {
          x: e.clientX,
          y: e.clientY
        };
        centerDragStart = {
          x: this.center[0],
          y: this.center[1]
        };
      })
      .on('mousemove touchmove', () => {
        if (!dragStart) return;

        const e = select.event.touches ? select.event.touches[0] : select.event;

        this.center = [
          centerDragStart.x + (dragStart.x - e.clientX) / this.zoom,
          centerDragStart.y + (dragStart.y - e.clientY) / this.zoom
        ];

        this.everything.attr(
          'transform',
          `translate(${this.width / 2}, ${this.height / 2}) scale(${this.zoom}) translate(${-this.center[0]}, ${-this
            .center[1]})`
        );
      })
      .on('mouseup touchend mouseleave', () => {
        if (window.parent) window.parent.postMessage({ lockScroll: false });

        // Don't recenter the map if we are just clicking for a balloon
        if (centerDragStart && Math.abs(centerDragStart.x - this.center[0]) > 5) {
          this.canCreateBalloon = setTimeout(() => {
            this.canCreateBalloon = true;
          }, 100);
        }

        dragStart = null;
      });

    this.everything = this.svg.append('g');

    this.mapFeatures = this.everything.append('g');
    this.mapFeatures.attr('name', 'map-features');
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
    this.areaFeatures.attr('name', 'area-features');
    this.areaFeatures
      .selectAll('path')
      .data(areaData)
      .enter()
      .append('path')
      .attr('d', this.path)
      .style('fill', fill)
      .on('click', d => {
        const [x, y] = d3.mouse(select.event.target);
        this.createBalloon(d.properties.areatype + ': ' + d.properties.extent, x, y);
      });

    // Render the weather stuff
    this.features = this.everything.append('g');
    this.features.attr('name', 'features');
    this.features
      .selectAll('path')
      .data(weatherData)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', d => {
        if (d.properties.tracktype === 'Forecast') {
          return styles.track;
        } else if (d.properties.tracktype === 'Observed') {
          return styles.track;
        } else if (d.properties.areatype) {
          return 'areatype';
        }
        return '';
      })
      .style('stroke', stroke)
      .style('stroke-width', 2)
      .style('fill', fill)
      .style('opacity', d => {
        // Each likely tracks area fades out slightly more
        if (d.likelyTracksIndex) {
          return 0.3 / d.likelyTracksIndex;
        }
        return 1;
      });

    this.features.selectAll('path.areatype').on('click', d => {
      const [x, y] = d3.mouse(select.event.target);
      this.createBalloon(d.properties.areatype + ': ' + d.properties.extent, x, y);
    });

    // Give the current cyclone a swirling wind
    this.images = this.everything.append('g');
    this.images.attr('name', 'images');
    this.images
      .selectAll('image')
      .data(cycloneData)
      .enter()
      .append('image')
      .lower()
      .attr('class', styles.cycloneImage)
      .attr('href', d => cycloneImages[d.properties.category]);

    this.places = this.everything.append('g');
    this.places.attr('name', 'places');

    this.fixes = this.everything.append('g');
    this.fixes.attr('name', 'fixes');
    this.dots = this.fixes
      .selectAll('g.dot')
      .data(fixData.filter(d => d.properties.fixtype !== 'Current'))
      .enter()
      .append('g')
      .attr('class', 'dot')
      .on('click', d => {
        if (this.hintBalloon) {
          this.hintBalloon.remove();
          this.hintBalloon = null;
        }

        this.popupIndex = d.index;
        this.center = [d.x, d.y];
        this.updateGraph(this.props, true, false);
      })
      .style('cursor', 'pointer');

    this.dots
      .append('circle')
      .attr('class', 'stroke')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', '#111')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    this.dots
      .append('circle')
      .attr('class', 'fill')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    this.dots
      .append('text')
      .attr('class', 'letter')
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('font-size', 14)
      .attr('fill', d => {
        return tinycolor(fill(d)).getBrightness() > 128 ? 'black' : 'white';
      })
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

    this.current = this.fixes
      .selectAll('g.currentDot')
      .data(fixData.filter(d => d.properties.fixtype === 'Current'))
      .enter()
      .append('g')
      .attr('class', 'dot')
      .on('click', d => {
        if (this.hintBalloon) {
          this.hintBalloon.remove();
          this.hintBalloon = null;
        }

        this.popupIndex = d.index;
        this.center = [d.x, d.y];
        this.updateGraph(this.props, true, false);
      })
      .style('cursor', 'pointer');

    this.current
      .append('rect')
      .attr('class', 'time-rect')
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('stroke', '#999')
      .style('pointer-events', 'none');

    this.current
      .append('text')
      .attr('class', 'time-text')
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none');

    this.current
      .append('circle')
      .attr('class', 'stroke')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', '#111')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    this.current
      .append('circle')
      .attr('class', 'fill')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    this.current
      .append('text')
      .attr('class', 'letter')
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('font-size', 14)
      .attr('fill', d => {
        return tinycolor(fill(d)).getBrightness() > 128 ? 'black' : 'white';
      })
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

    // Popup balloons
    this.balloons = this.fixes
      .selectAll('g.balloons')
      .data(fixData)
      .enter()
      .append('g')
      .attr('class', 'popup')
      .attr('fill', 'white')
      .on('click', d => {
        this.popupIndex = null;
        this.updateGraph(this.props, true, false);
      });

    this.balloons
      .append('rect')
      .attr('fill', 'white')
      .attr('x', 0)
      .attr('y', 0)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('width', 200)
      .attr('height', BALLOON_HEIGHT - 5)
      .attr('stroke', 'rgba(0,0,0,0.3)')
      .style('strock-width', 1);
    this.balloons
      .append('polygon')
      .attr('points', '0,0 10,10, 20,0')
      .attr('transform', `translate(90, ${BALLOON_HEIGHT - 5})`)
      .attr('stroke', 'rgba(0,0,0,0.3)')
      .style('strock-width', 1);
    this.balloons
      .append('polygon')
      .attr('points', '0,0 10,10, 20,0')
      .attr('transform', `translate(90, ${BALLOON_HEIGHT - 7})`)
      .attr('stroke', 'white');
    this.balloons
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('fill', '#222')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('x', 100)
      .attr('y', 25)
      .text(d => d.properties.fixtype.toUpperCase());
    this.balloons
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('fill', '#222')
      .attr('text-anchor', 'middle')
      .attr('x', 100)
      .attr('y', 45)
      .text(d => format(d.properties.fixtime, 'ddd D MMM, h:mmA').toUpperCase());
    this.balloons
      .append('text')
      .attr('font-size', 16)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('fill', d => labels(d))
      .attr('text-anchor', 'middle')
      .attr('x', 100)
      .attr('y', 70)
      .text(d => {
        if (d.properties.symbol) {
          switch (d.properties.symbol) {
            case 'Low':
              return 'TROPICAL LOW';
            case 'Cyclone':
              return 'CATEGORY ' + d.properties.category;
          }
        }
      });
    this.balloons
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('fill', '#999')
      .attr('text-anchor', 'end')
      .attr('x', 190)
      .attr('y', 18)
      .text('x')
      .style('cursor', 'pointer');

    this.width = props.width || window.innerWidth;
    this.height = props.height || window.innerHeight;
  }

  /**
   * Update the values on the map
   * @param {object} props
   * @param {boolean?} willTransition
   */
  updateGraph(props, willTransition, recenter) {
    willTransition = typeof willTransition === 'undefined' ? true : willTransition;

    const { data, areaData, cycloneData, weatherData, fixData, area, centerArea } = this.processData(props);

    this.width = props.width || window.innerWidth;
    this.height = props.height || window.innerHeight;

    let zoom = props.zoom;
    if (!zoom && area) {
      var b = this.path.bounds(area);
      zoom = 0.6 / Math.max((b[1][0] - b[0][0]) / this.width, (b[1][1] - b[0][1]) / this.height);
      this.props.onAutoZoom(zoom);
    }
    this.zoom = zoom;

    let factor = 1 / (zoom || 1);

    this.svg
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', '#efefef');
    this.svg
      .select('#uncertainty' + this.key)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('width', 6 * factor)
      .attr('height', 6 * factor);
    this.svg
      .select('#uncertainty' + this.key + ' circle')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', 1.7 * factor)
      .attr('transform', `translate(${1.7 * factor},${1.7 * factor})`);
    this.svg.select('style').text(`@keyframes marching {
        to {
          stroke-dashoffset: -${14 * factor};
        }
      }`);

    this.centerArea = centerArea;

    // Work out where the center of the map is
    if (!this.center || recenter) {
      let center;
      if (data.length > 0) {
        if (props.center === 'current') {
          const current = props.data.features.filter(f => f.properties.fixtype === 'Current')[0];
          if (current) {
            center = this.path.centroid(current);
          }
        } else if (props.center !== '') {
          const city = citiesJSON.features.filter(
            f => f.properties.name.toLowerCase() === props.center.toLowerCase()
          )[0];
          if (city) {
            center = this.path.centroid(city);
          }
        }
      }
      if (!center) {
        if (area) {
          center = this.path.centroid(area);
          center[1] += 25;
        } else {
          center = this.path.centroid({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[136, -27]] } });
          zoom = 1;
          factor = 1;
        }
      }
      this.center = center;
    }

    const transform = `translate(${this.width / 2}, ${this.height / 2}) scale(${zoom}) translate(${-this
      .center[0]}, ${-this.center[1]})`;

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
    // These need to be trashed and re-added because they might all completely change
    const cities = this.getCities(props, zoom);
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
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5 * factor);
    this.places.selectAll('text').remove();
    this.places
      .selectAll('text')
      .data(cities)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .text(d => d.properties.name)
      .attr('font-size', 12 * factor)
      .style('pointer-events', 'none');

    // Give the current cyclone (if there is one) a spinning animation
    const cycloneSize = 60 * factor;
    this.images
      .selectAll('image')
      .data(cycloneData)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .style('opacity', 0.8)
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
        if (d.properties.tracktype === 'Forecast') {
          return `${9 * factor} ${5 * factor}`;
        } else if (d.properties.tracktype) {
          return `${13 * factor} ${1 * factor}`;
        }
      })
      .style('animation', 'marching 1.8s linear infinite');

    this.dots.data(fixData.filter(d => d.properties.fixtype !== 'Current'));
    this.dots
      .selectAll('circle.stroke')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', d => {
        if (d.properties.fixtype === 'Observed') {
          return 10 * factor;
        }
        return 12 * factor;
      })
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke-width', d => (d.properties.fixtype === 'Observed' ? 2 : 4) * factor);

    this.dots
      .selectAll('circle.fill')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', d => {
        if (d.properties.fixtype === 'Observed') {
          return 10 * factor;
        }
        return 12 * factor;
      })
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke-width', d => (d.properties.fixtype === 'Observed' ? 0 : 2) * factor);

    this.dots
      .selectAll('text.letter')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
      .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
      .style('pointer-events', 'none');

    this.dots
      .selectAll('circle.stroke')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', d => {
        if (d.properties.fixtype === 'Observed') {
          return 10 * factor;
        }
        return 12 * factor;
      })
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke-width', d => (d.properties.fixtype === 'Observed' ? 2 : 4) * factor);

    this.dots
      .selectAll('circle.fill')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', d => {
        if (d.properties.fixtype === 'Observed') {
          return 10 * factor;
        }
        return 12 * factor;
      })
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke-width', d => (d.properties.fixtype === 'Observed' ? 0 : 2) * factor);

    this.dots
      .selectAll('text.letter')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
      .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
      .style('pointer-events', 'none');

    this.current
      .selectAll('circle.stroke')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', d => {
        if (d.properties.fixtype === 'Observed') {
          return 10 * factor;
        }
        return 12 * factor;
      })
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke-width', d => (d.properties.fixtype === 'Observed' ? 2 : 4) * factor);

    this.current
      .selectAll('circle.fill')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', d => {
        if (d.properties.fixtype === 'Observed') {
          return 10 * factor;
        }
        return 12 * factor;
      })
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('stroke-width', d => (d.properties.fixtype === 'Observed' ? 0 : 2) * factor);

    this.current
      .selectAll('text.letter')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
      .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
      .style('pointer-events', 'none');

    this.current
      .selectAll('rect.time-rect')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('x', d => d.x)
      .attr('y', d => d.y - 10 * factor)
      .attr('rx', 5 * factor)
      .attr('ry', 5 * factor)
      .attr('width', 100 * factor)
      .attr('height', 20 * factor)
      .style('opacity', d => (d.properties.fixtype === 'Current' ? 1 : 0))
      .style('stroke-width', 1 * factor);
    this.current
      .selectAll('text.time-text')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', 10 * factor)
      .attr('dy', 4 * factor)
      .attr('x', d => d.x + 55 * factor)
      .attr('y', d => d.y)
      .text(d => format(d.properties.fixtime, 'ddd D/M hA').toUpperCase())
      .style('opacity', d => (d.properties.fixtype === 'Current' ? 1 : 0));

    this.balloons
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('transform', d => {
        return `translate(${d.x - 100 * factor}, ${d.y - (BALLOON_HEIGHT + 17) * factor}) scale(${1 / this.zoom})`;
      })
      .style('opacity', d => (this.popupIndex === d.index ? 1 : 0))
      .style('pointer-events', d => {
        return this.popupIndex === d.index ? 'auto' : 'none';
      });

    if (this.hintBalloon) {
      const p = this.hintBalloon.props;
      this.hintBalloon
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr(
          'transform',
          `translate(${p.x - (p.width / 2) * factor}, ${p.y - p.height * factor - 2}) scale(${factor})`
        );
    }
  }

  render() {
    return <div className={styles.base} ref={el => (this.base = el)} />;
  }
}

module.exports = Map;
