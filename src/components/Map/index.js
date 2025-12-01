const processData = require('./processData');
const findMidPoints = require('./findMidPoints');
const getCities = require('./getCities');
const React = require('react');
const format = require('date-fns/format');
const d3 = require('../../d3');
const select = require('d3-selection');
const TopoJSON = require('topojson');
const tinycolor = require('tinycolor2');
const styleModule = require('./index.scss');
const styles = styleModule.default;
const mapJSON = require('./australia.topo.json');
const mapData = TopoJSON.feature(mapJSON, mapJSON.objects.australia).features;
const SANS_SERIF_FONT = 'ABCSans,Helvetica,Arial,sans-serif';
const TRANSITION_DURATION = 400;

const BALLOON_HEIGHT = 95;

const arrowImage = require('./arrow.svg');

const { cycloneImages, stroke, fill, labels } = require('./util');

function Map(props) {
  const baseRef = React.useRef(null);
  const keyRef = React.useRef(props.index || Math.floor(Math.random() * 100000).toString());

  const svgRef = React.useRef(null);
  const defsRef = React.useRef(null);
  const projectionRef = React.useRef(null);
  const pathRef = React.useRef(null);
  const everythingRef = React.useRef(null);
  const mapFeaturesRef = React.useRef(null);
  const areaFeaturesRef = React.useRef(null);
  const featuresRef = React.useRef(null);
  const imagesRef = React.useRef(null);
  const arrowsRef = React.useRef(null);
  const placesRef = React.useRef(null);
  const fixesRef = React.useRef(null);
  const dotsRef = React.useRef(null);
  const currentRef = React.useRef(null);
  const balloonsRef = React.useRef(null);

  const centerRef = React.useRef(null);
  const zoomRef = React.useRef(null);
  const widthRef = React.useRef(null);
  const heightRef = React.useRef(null);
  const centerAreaRef = React.useRef(null);
  const popupIndexRef = React.useRef(null);
  const hintBalloonRef = React.useRef(null);
  const canCreateBalloonRef = React.useRef(true);

  const getCitiesFunc = React.useCallback((propsArg, zoom) => {
    if (!centerAreaRef.current) return [];

    const requestedCities = propsArg.cities;
    return getCities({
      centerArea: centerAreaRef.current,
      zoom: zoom || propsArg.zoom,
      requestedCities,
      path: pathRef.current
    });
  }, []);

  const createBalloon = React.useCallback(
    (text, x, y, parentGroup) => {
      if (canCreateBalloonRef.current !== true) return;

      if (hintBalloonRef.current) hintBalloonRef.current.remove();
      popupIndexRef.current = null;
      centerRef.current = [x, y];
      updateGraph(props, { willTransition: true });
      if (!parentGroup) parentGroup = fixesRef.current;
      const svg = svgRef.current;

      const hintBalloon = require('./createBalloon')({
        text,
        x,
        y,
        parentGroup,
        svg,
        zoom: zoomRef.current,
        onClick: () => {
          hintBalloonRef.current.remove();
          hintBalloonRef.current = null;
        }
      });

      hintBalloonRef.current = hintBalloon;
    },
    [props]
  );

  const onResize = React.useCallback(() => {
    updateGraph(props, {
      willTransition: props.embedded,
      recenter: props.embedded,
      updateZoom: props.embedded
    });
  }, [props]);

  const initGraph = React.useCallback(
    propsArg => {
      if (!baseRef.current) return;

      projectionRef.current = d3.geoMercator().scale(900).center([136, -27]);

      pathRef.current = d3.geoPath().projection(projectionRef.current);

      svgRef.current = d3.select(baseRef.current).append('svg');

      defsRef.current = svgRef.current.append('defs');

      defsRef.current
        .append('pattern')
        .attr('id', 'uncertainty' + keyRef.current)
        .attr('width', '1')
        .attr('height', '1')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(80)')
        .append('circle')
        .attr('r', '1')
        .attr('transform', 'translate(1,1)')
        .attr('fill', '#555');
      svgRef.current.append('style').text(`@keyframes marching {
      to {
        stroke-dashoffset: -14;
      }
    }`);

      // Drag around the map
      let dragStart = null;
      let centerDragStart = null;
      svgRef.current
        .on('mousedown touchstart', () => {
          const e = select.event.touches ? select.event.touches[0] : select.event;

          dragStart = {
            x: e.clientX,
            y: e.clientY
          };
          centerDragStart = {
            x: centerRef.current[0],
            y: centerRef.current[1]
          };
        })
        .on('mousemove touchmove', () => {
          if (!dragStart) return;

          const e = select.event.touches ? select.event.touches[0] : select.event;

          // Stop drag scrolling on mobile
          select.event.preventDefault();
          select.event.stopPropagation();

          centerRef.current = [
            centerDragStart.x + (dragStart.x - e.clientX) / zoomRef.current,
            centerDragStart.y + (dragStart.y - e.clientY) / zoomRef.current
          ];

          everythingRef.current.attr(
            'transform',
            `translate(${widthRef.current / 2}, ${heightRef.current / 2}) scale(${
              zoomRef.current
            }) translate(${-centerRef.current[0]}, ${-centerRef.current[1]})`
          );
        })
        .on('mouseup touchend mouseleave', () => {
          // Don't recenter the map if we are just clicking for a balloon
          if (centerDragStart && Math.abs(centerDragStart.x - centerRef.current[0]) > 5) {
            canCreateBalloonRef.current = setTimeout(() => {
              canCreateBalloonRef.current = true;
            }, 100);
          }

          dragStart = null;
        });

      everythingRef.current = svgRef.current.append('g');

      mapFeaturesRef.current = everythingRef.current.append('g');
      mapFeaturesRef.current.attr('name', 'map-features');
      mapFeaturesRef.current
        .selectAll('path')
        .data(mapData)
        .enter()
        .append('path')
        .style('stroke', '#fff')
        .style('fill', '#ccc')
        .attr('d', pathRef.current);

      const { areaData, cycloneData, weatherData, fixData, centerArea } = processData({
        data: propsArg.data,
        path: pathRef.current,
        key: keyRef.current
      });

      areaFeaturesRef.current = everythingRef.current.append('g');
      areaFeaturesRef.current.attr('name', 'area-features');
      areaFeaturesRef.current
        .selectAll('path')
        .data(areaData)
        .enter()
        .append('path')
        .attr('d', pathRef.current)
        .style('fill', fill)
        .on('click', d => {
          const [x, y] = d3.mouse(select.event.target);
          createBalloon(d.properties.areatype + ': ' + d.properties.extent, x, y);
        });

      // Render the weather stuff
      featuresRef.current = everythingRef.current.append('g');
      featuresRef.current.attr('name', 'features');
      featuresRef.current
        .selectAll('path')
        .data(weatherData)
        .enter()
        .append('path')
        .attr('d', pathRef.current)
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

      featuresRef.current.selectAll('path.areatype').on('click', d => {
        const [x, y] = d3.mouse(select.event.target);
        createBalloon(d.properties.areatype + ': ' + d.properties.extent, x, y);
      });

      // Give the current cyclone a swirling wind
      imagesRef.current = everythingRef.current.append('g');
      imagesRef.current.attr('name', 'images');
      imagesRef.current
        .selectAll('image')
        .data(cycloneData)
        .enter()
        .append('image')
        .lower()
        .attr('class', styles.cycloneImage)
        .attr('href', d => cycloneImages[d.properties.category])
        .attr('xlink:href', d => cycloneImages[d.properties.category]);

      // Get all of the midpoints along the lines of the path
      const trackLines = findMidPoints(featuresRef.current.select(`path.${styles.track}`), fixData);

      arrowsRef.current = everythingRef.current.append('g');
      arrowsRef.current.attr('name', 'arrows');
      arrowsRef.current
        .selectAll('image')
        .data(trackLines)
        .enter()
        .append('image')
        .lower()
        .attr('class', styles.cycloneImage)
        .attr('href', arrowImage)
        .attr('xlink:href', arrowImage); // xlink is for Safari

      placesRef.current = everythingRef.current.append('g');
      placesRef.current.attr('name', 'places');

      fixesRef.current = everythingRef.current.append('g');
      fixesRef.current.attr('name', 'fixes');
      dotsRef.current = fixesRef.current
        .selectAll('g.dot')
        .data(fixData.filter(d => d.properties.fixtype !== 'Current'))
        .enter()
        .append('g')
        .attr('class', 'dot')
        .on('click', d => {
          if (hintBalloonRef.current) {
            hintBalloonRef.current.remove();
            hintBalloonRef.current = null;
          }

          popupIndexRef.current = d.index;
          centerRef.current = [d.x, d.y];
          updateGraph(props, { willTransition: true });
        })
        .style('cursor', 'pointer');

      dotsRef.current
        .append('circle')
        .attr('class', 'stroke')
        .attr('r', 12)
        .attr('fill', fill)
        .attr('stroke', '#111')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      dotsRef.current
        .append('circle')
        .attr('class', 'fill')
        .attr('r', 12)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      dotsRef.current
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

      currentRef.current = fixesRef.current
        .selectAll('g.currentDot')
        .data(fixData.filter(d => d.properties.fixtype === 'Current'))
        .enter()
        .append('g')
        .attr('class', 'dot')
        .on('click', d => {
          if (hintBalloonRef.current) {
            hintBalloonRef.current.remove();
            hintBalloonRef.current = null;
          }

          popupIndexRef.current = d.index;
          centerRef.current = [d.x, d.y];
          updateGraph(props, { willTransition: true });
        })
        .style('cursor', 'pointer');

      currentRef.current
        .append('rect')
        .attr('class', 'time-rect')
        .attr('fill', 'rgba(255,255,255,0.9)')
        .attr('stroke', '#999')
        .style('pointer-events', 'none');

      currentRef.current
        .append('text')
        .attr('class', 'time-text')
        .attr('font-family', SANS_SERIF_FONT)
        .attr('font-weight', 'bold')
        .attr('fill', 'black')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none');

      currentRef.current
        .append('circle')
        .attr('class', 'stroke')
        .attr('r', 12)
        .attr('fill', fill)
        .attr('stroke', '#111')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      currentRef.current
        .append('circle')
        .attr('class', 'fill')
        .attr('r', 12)
        .attr('fill', fill)
        .attr('stroke', stroke)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
      currentRef.current
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
      balloonsRef.current = fixesRef.current
        .selectAll('g.balloons')
        .data(fixData)
        .enter()
        .append('g')
        .attr('class', 'popup')
        .attr('fill', 'white')
        .on('click', d => {
          popupIndexRef.current = null;
          updateGraph(props, { willTransition: true });
        });

      balloonsRef.current
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
      balloonsRef.current
        .append('polygon')
        .attr('points', '0,0 10,10, 20,0')
        .attr('transform', `translate(90, ${BALLOON_HEIGHT - 5})`)
        .attr('stroke', 'rgba(0,0,0,0.3)')
        .style('strock-width', 1);
      balloonsRef.current
        .append('polygon')
        .attr('points', '0,0 10,10, 20,0')
        .attr('transform', `translate(90, ${BALLOON_HEIGHT - 7})`)
        .attr('stroke', 'white');
      balloonsRef.current
        .append('text')
        .attr('font-size', 14)
        .attr('font-family', SANS_SERIF_FONT)
        .attr('fill', '#222')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .attr('x', 100)
        .attr('y', 25)
        .text(d => d.properties.fixtype.toUpperCase());
      balloonsRef.current
        .append('text')
        .attr('font-size', 14)
        .attr('font-family', SANS_SERIF_FONT)
        .attr('fill', '#222')
        .attr('text-anchor', 'middle')
        .attr('x', 100)
        .attr('y', 45)
        .text(d => format(d.properties.fixtime, 'ddd D MMM, h:mma').toUpperCase());
      balloonsRef.current
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
      balloonsRef.current
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

      widthRef.current = propsArg.width;
      heightRef.current = propsArg.height;

      if (!props.embedded) {
        widthRef.current = propsArg.width || widthRef.current;
        heightRef.current = propsArg.height || heightRef.current;
      }
    },
    [props, createBalloon]
  );

  const updateGraph = React.useCallback(
    (propsArg, options) => {
      const { willTransition, recenter, updateZoom } = options || {};

      const { data, areaData, cycloneData, weatherData, fixData, area, centerArea } = processData({
        data: propsArg.data,
        path: pathRef.current,
        key: keyRef.current
      });

      widthRef.current = propsArg.width;
      heightRef.current = propsArg.height;

      if (!props.embedded) {
        widthRef.current = propsArg.width || widthRef.current;
        heightRef.current = propsArg.height || heightRef.current;
      }

      let zoom = propsArg.zoom;
      if ((!zoom || updateZoom) && area) {
        var b = pathRef.current.bounds(area);
        zoom = 0.6 / Math.max((b[1][0] - b[0][0]) / widthRef.current, (b[1][1] - b[0][1]) / heightRef.current);
        propsArg.onAutoZoom(zoom);
      }
      zoomRef.current = zoom;

      let factor = 1 / (zoom || 1);

      svgRef.current.attr('width', widthRef.current).attr('height', heightRef.current).style('background', '#efefef');
      svgRef.current
        .select('#uncertainty' + keyRef.current)
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('width', 6 * factor)
        .attr('height', 6 * factor);
      svgRef.current
        .select('#uncertainty' + keyRef.current + ' circle')
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('r', 1.7 * factor)
        .attr('transform', `translate(${1.7 * factor},${1.7 * factor})`);
      svgRef.current.select('style').text(`@keyframes marching {
        to {
          stroke-dashoffset: -${14};
        }
      }`);

      centerAreaRef.current = centerArea;

      // Work out where the center of the map is
      if (!centerRef.current || recenter) {
        let center;
        if (area) {
          center = pathRef.current.centroid(area);
        } else {
          center = pathRef.current.centroid({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[136, -27]] }
          });
          zoom = 1;
          factor = 1;
        }
        centerRef.current = center;
      }

      const transform = `translate(${widthRef.current / 2}, ${
        heightRef.current / 2
      }) scale(${zoom}) translate(${-centerRef.current[0]}, ${-centerRef.current[1]})`;

      if (willTransition) {
        everythingRef.current.transition().duration(TRANSITION_DURATION).attr('transform', transform);
      } else {
        everythingRef.current.attr('transform', transform);
      }

      mapFeaturesRef.current.attr('d', pathRef.current).style('stroke-width', 1 * factor);

      // Render the warning areas
      areaFeaturesRef.current.selectAll('path').data(areaData).attr('d', pathRef.current);

      // Render place dots and names
      // These need to be trashed and re-added because they might all completely change
      const cities = getCitiesFunc(propsArg, zoom);
      placesRef.current.selectAll('path').remove();
      placesRef.current
        .selectAll('path')
        .data(cities)
        .enter()
        .append('path')
        .attr(
          'd',
          d3
            .geoPath()
            .projection(projectionRef.current)
            .pointRadius(3 * factor)
        )
        .attr('fill', 'white')
        .attr('stroke', 'black')
        .attr('stroke-width', 1.5 * factor);
      placesRef.current.selectAll('text').remove();
      placesRef.current
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
      imagesRef.current
        .selectAll('image')
        .data(cycloneData)
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .style('opacity', 0.8)
        .attr('x', d => d.x - cycloneSize / 2)
        .attr('y', d => d.y - cycloneSize / 2)
        .attr('width', cycloneSize)
        .attr('height', cycloneSize);

      const trackLines = findMidPoints(featuresRef.current.select(`path.${styles.track}`), fixData);
      const arrowSize = 4;
      arrowsRef.current
        .selectAll('image')
        .data(trackLines)
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('x', d => d.x - arrowSize / 2)
        .attr('y', d => d.y - arrowSize / 2)
        .attr('width', arrowSize)
        .attr('height', arrowSize)
        .attr('transform', d => `translate(${d.x}, ${d.y}) rotate(${d.rotation}) translate(${-d.x}, ${-d.y})`);

      // Render the weather stuff
      featuresRef.current
        .selectAll('path')
        .data(weatherData)
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('d', pathRef.current)
        .style('stroke-width', d => {
          if (d.properties.windtype) {
            return 0.5;
          }
          return 3;
        })
        .style('stroke-dasharray', d => {
          if (d.properties.tracktype === 'Forecast') {
            return `${9} ${5}`;
          } else if (d.properties.tracktype) {
            return `${13} ${1}`;
          }
        })
        .style('animation', 'marching 1.8s linear infinite');

      dotsRef.current.data(fixData.filter(d => d.properties.fixtype !== 'Current'));
      dotsRef.current
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

      dotsRef.current
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

      dotsRef.current
        .selectAll('text.letter')
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
        .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
        .style('pointer-events', 'none');

      dotsRef.current
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

      dotsRef.current
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

      dotsRef.current
        .selectAll('text.letter')
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
        .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
        .style('pointer-events', 'none');

      currentRef.current
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

      currentRef.current
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

      currentRef.current
        .selectAll('text.letter')
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
        .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
        .style('pointer-events', 'none');

      currentRef.current
        .selectAll('rect.time-rect')
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('x', d => d.x)
        .attr('y', d => d.y - 10 * factor)
        .attr('rx', 5 * factor)
        .attr('ry', 5 * factor)
        .attr('width', 150 * factor)
        .attr('height', 20 * factor)
        .style('opacity', d => (d.properties.fixtype === 'Current' ? 1 : 0))
        .style('stroke-width', 1 * factor);
      currentRef.current
        .selectAll('text.time-text')
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('font-size', 10 * factor)
        .attr('dy', 4 * factor)
        .attr('x', d => d.x + 82 * factor)
        .attr('y', d => d.y)
        .text(d => 'CURRENT: ' + format(d.properties.fixtime, 'ddd D/M ha').toUpperCase())
        .style('opacity', d => (d.properties.fixtype === 'Current' ? 1 : 0));

      balloonsRef.current
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr('transform', d => {
          return `translate(${d.x - 100 * factor}, ${d.y - (BALLOON_HEIGHT + 17) * factor}) scale(${
            1 / zoomRef.current
          })`;
        })
        .style('opacity', d => (popupIndexRef.current === d.index ? 1 : 0))
        .style('pointer-events', d => {
          return popupIndexRef.current === d.index ? 'auto' : 'none';
        });

      if (hintBalloonRef.current) {
        const p = hintBalloonRef.current.props;
        hintBalloonRef.current
          .transition()
          .duration(willTransition ? TRANSITION_DURATION : 0)
          .attr(
            'transform',
            `translate(${p.x - (p.width / 2) * factor}, ${p.y - p.height * factor - 2}) scale(${factor})`
          );
      }
    },
    [props, getCitiesFunc]
  );

  React.useEffect(() => {
    if (props.data) {
      initGraph(props);
      updateGraph(props);
    }

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [props, initGraph, updateGraph, onResize]);

  React.useEffect(() => {
    const recenter = props.center !== props.center;
    updateGraph(props, { willTransition: true, recenter });
  }, [props.center, props, updateGraph]);

  return <div className={styles.base} ref={baseRef} />;
}

module.exports = Map;
