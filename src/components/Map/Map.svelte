<script lang="ts">
  import processData from './processData';
  import findMidPoints from './findMidPoints';
  import getCitiesModule from './getCities';
  import format from 'date-fns/format';
  import { select as d3Select } from 'd3-selection';
  import { feature } from 'topojson';
  import tinycolor from 'tinycolor2';
  import mapJSON from './australia.topo.json';
  import arrowImage from './arrow.svg';
  import { cycloneImages, stroke, fill, labels } from './util';
  import createBalloonModule from './createBalloon';
  import { geoMercator, geoPath } from 'd3-geo';
  import { transition } from 'd3-transition';

  const mapData = feature(mapJSON, mapJSON.objects.australia).features;
  const SANS_SERIF_FONT = 'ABCSans,Helvetica,Arial,sans-serif';
  const TRANSITION_DURATION = 400;
  const BALLOON_HEIGHT = 95;

  // Props
  interface Props {
    cities?: any[];
    data?: any;
    embedded?: boolean;
    zoom?: number | null;
    onAutoZoom: (zoom: number) => void;
    index?: string;
    center?: string;
    width: number;
    height: number;
  }

  let {
    cities = [],
    data = null,
    embedded = false,
    zoom = null,
    onAutoZoom,
    index = Math.floor(Math.random() * 100000).toString(),
    center = 'current',
    width,
    height
  }: Props = $props();

  // DOM reference
  let base: HTMLDivElement;

  // D3 selections (regular let variables, not reactive)
  let svg;
  let defs;
  let projection;
  let path;
  let everythingGroup;
  let mapFeatures;
  let areaFeatures;
  let features;
  let images;
  let arrows;
  let places;
  let fixes;
  let dots;
  let current;
  let balloons;

  // Mutable state (regular let variables, not reactive)
  let centerPoint = null;
  let zoomLevel = null;
  let widthValue = 0;
  let heightValue = 0;
  let centerArea = null;
  let popupIndex = null;
  let hintBalloon = null;
  let canCreateBalloon = true;

  // Functions
  function getCitiesFunc(propsZoom) {
    if (!centerArea) return [];

    return getCitiesModule({
      centerArea: centerArea,
      zoom: propsZoom || zoom,
      requestedCities: cities,
      path: path
    });
  }

  function createBalloon(text, x, y, parentGroup) {
    if (canCreateBalloon !== true) return;

    if (hintBalloon) hintBalloon.remove();
    popupIndex = null;
    centerPoint = [x, y];
    updateGraph({ willTransition: true });
    if (!parentGroup) parentGroup = fixes;

    const balloon = createBalloonModule({
      text,
      x,
      y,
      parentGroup,
      svg,
      zoom: zoomLevel,
      onClick: () => {
        if (hintBalloon) {
          hintBalloon.remove();
          hintBalloon = null;
        }
      }
    });

    hintBalloon = balloon;
  }

  function onResize() {
    updateGraph({
      willTransition: embedded,
      recenter: embedded,
      updateZoom: embedded
    });
  }

  function initGraph() {
    if (!base) return;

    projection = geoMercator().scale(900).center([136, -27]);
    path = geoPath().projection(projection);
    svg = d3Select(base).append('svg');
    defs = svg.append('defs');

    defs
      .append('pattern')
      .attr('id', 'uncertainty' + index)
      .attr('width', '1')
      .attr('height', '1')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(80)')
      .append('circle')
      .attr('r', '1')
      .attr('transform', 'translate(1,1)')
      .attr('fill', '#555');

    svg.append('style').text(`@keyframes marching {
      to {
        stroke-dashoffset: -14;
      }
    }`);

    // Drag around the map
    let dragStart = null;
    let centerDragStart = null;
    svg
      .on('mousedown touchstart', () => {
        const e = d3Select.event.touches ? d3Select.event.touches[0] : d3Select.event;

        dragStart = {
          x: e.clientX,
          y: e.clientY
        };
        centerDragStart = {
          x: centerPoint[0],
          y: centerPoint[1]
        };
      })
      .on('mousemove touchmove', () => {
        if (!dragStart) return;

        const e = d3Select.event.touches ? d3Select.event.touches[0] : d3Select.event;

        // Stop drag scrolling on mobile
        d3Select.event.preventDefault();
        d3Select.event.stopPropagation();

        centerPoint = [
          centerDragStart.x + (dragStart.x - e.clientX) / zoomLevel,
          centerDragStart.y + (dragStart.y - e.clientY) / zoomLevel
        ];

        everythingGroup.attr(
          'transform',
          `translate(${widthValue / 2}, ${heightValue / 2}) scale(${zoomLevel}) translate(${-centerPoint[0]}, ${-centerPoint[1]})`
        );
      })
      .on('mouseup touchend mouseleave', () => {
        // Don't recenter the map if we are just clicking for a balloon
        if (centerDragStart && Math.abs(centerDragStart.x - centerPoint[0]) > 5) {
          canCreateBalloon = setTimeout(() => {
            canCreateBalloon = true;
          }, 100);
        }

        dragStart = null;
      });

    everythingGroup = svg.append('g');

    mapFeatures = everythingGroup.append('g');
    mapFeatures.attr('name', 'map-features');
    mapFeatures
      .selectAll('path')
      .data(mapData)
      .enter()
      .append('path')
      .style('stroke', '#fff')
      .style('fill', '#ccc')
      .attr('d', path);

    const {
      areaData,
      cycloneData,
      weatherData,
      fixData,
      centerArea: processedCenterArea
    } = processData({
      data: data,
      path: path,
      key: index
    });

    areaFeatures = everythingGroup.append('g');
    areaFeatures.attr('name', 'area-features');
    areaFeatures
      .selectAll('path')
      .data(areaData)
      .enter()
      .append('path')
      .attr('d', path)
      .style('fill', fill)
      .on('click', d => {
        const [x, y] = d3Select.mouse(d3Select.event.target);
        createBalloon(d.properties.areatype + ': ' + d.properties.extent, x, y);
      });

    // Render the weather stuff
    features = everythingGroup.append('g');
    features.attr('name', 'features');
    features
      .selectAll('path')
      .data(weatherData)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('class', d => {
        if (d.properties.tracktype === 'Forecast') {
          return 'track';
        } else if (d.properties.tracktype === 'Observed') {
          return 'track';
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

    features.selectAll('path.areatype').on('click', d => {
      const [x, y] = d3Select.mouse(d3Select.event.target);
      createBalloon(d.properties.areatype + ': ' + d.properties.extent, x, y);
    });

    // Give the current cyclone a swirling wind
    images = everythingGroup.append('g');
    images.attr('name', 'images');
    images
      .selectAll('image')
      .data(cycloneData)
      .enter()
      .append('image')
      .lower()
      .attr('class', 'cyclone-image')
      .attr('href', d => cycloneImages[d.properties.category])
      .attr('xlink:href', d => cycloneImages[d.properties.category]);

    // Get all of the midpoints along the lines of the path
    const trackLines = findMidPoints(features.select('path.track'), fixData);

    arrows = everythingGroup.append('g');
    arrows.attr('name', 'arrows');
    arrows
      .selectAll('image')
      .data(trackLines)
      .enter()
      .append('image')
      .lower()
      .attr('class', 'cyclone-image')
      .attr('href', arrowImage)
      .attr('xlink:href', arrowImage); // xlink is for Safari

    places = everythingGroup.append('g');
    places.attr('name', 'places');

    fixes = everythingGroup.append('g');
    fixes.attr('name', 'fixes');
    dots = fixes
      .selectAll('g.dot')
      .data(fixData.filter(d => d.properties.fixtype !== 'Current'))
      .enter()
      .append('g')
      .attr('class', 'dot')
      .on('click', d => {
        if (hintBalloon) {
          hintBalloon.remove();
          hintBalloon = null;
        }

        popupIndex = d.index;
        centerPoint = [d.x, d.y];
        updateGraph({ willTransition: true });
      })
      .style('cursor', 'pointer');

    dots
      .append('circle')
      .attr('class', 'stroke')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', '#111')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    dots
      .append('circle')
      .attr('class', 'fill')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    dots
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

    current = fixes
      .selectAll('g.currentDot')
      .data(fixData.filter(d => d.properties.fixtype === 'Current'))
      .enter()
      .append('g')
      .attr('class', 'dot')
      .on('click', d => {
        if (hintBalloon) {
          hintBalloon.remove();
          hintBalloon = null;
        }

        popupIndex = d.index;
        centerPoint = [d.x, d.y];
        updateGraph({ willTransition: true });
      })
      .style('cursor', 'pointer');

    current
      .append('rect')
      .attr('class', 'time-rect')
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('stroke', '#999')
      .style('pointer-events', 'none');

    current
      .append('text')
      .attr('class', 'time-text')
      .attr('font-family', SANS_SERIF_FONT)
      .attr('font-weight', 'bold')
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none');

    current
      .append('circle')
      .attr('class', 'stroke')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', '#111')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    current
      .append('circle')
      .attr('class', 'fill')
      .attr('r', 12)
      .attr('fill', fill)
      .attr('stroke', stroke)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    current
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
    balloons = fixes
      .selectAll('g.balloons')
      .data(fixData)
      .enter()
      .append('g')
      .attr('class', 'popup')
      .attr('fill', 'white')
      .on('click', d => {
        popupIndex = null;
        updateGraph({ willTransition: true });
      });

    balloons
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

    balloons
      .append('polygon')
      .attr('points', '0,0 10,10, 20,0')
      .attr('transform', `translate(90, ${BALLOON_HEIGHT - 5})`)
      .attr('stroke', 'rgba(0,0,0,0.3)')
      .style('strock-width', 1);

    balloons
      .append('polygon')
      .attr('points', '0,0 10,10, 20,0')
      .attr('transform', `translate(90, ${BALLOON_HEIGHT - 7})`)
      .attr('stroke', 'white');

    balloons
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('fill', '#222')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('x', 100)
      .attr('y', 25)
      .text(d => d.properties.fixtype.toUpperCase());

    balloons
      .append('text')
      .attr('font-size', 14)
      .attr('font-family', SANS_SERIF_FONT)
      .attr('fill', '#222')
      .attr('text-anchor', 'middle')
      .attr('x', 100)
      .attr('y', 45)
      .text(d => format(d.properties.fixtime, 'ddd D MMM, h:mma').toUpperCase());

    balloons
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

    balloons
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

    widthValue = width;
    heightValue = height;

    if (!embedded) {
      widthValue = width || widthValue;
      heightValue = height || heightValue;
    }
  }

  function updateGraph(options: any = {}) {
    const { willTransition, recenter, updateZoom } = options;

    const {
      data: processedData,
      areaData,
      cycloneData,
      weatherData,
      fixData,
      area,
      centerArea: processedCenterArea
    } = processData({
      data: data,
      path: path,
      key: index
    });

    widthValue = width;
    heightValue = height;

    if (!embedded) {
      widthValue = width || widthValue;
      heightValue = height || heightValue;
    }

    let currentZoom = zoom;
    if ((!currentZoom || updateZoom) && area) {
      var b = path.bounds(area);
      currentZoom = 0.6 / Math.max((b[1][0] - b[0][0]) / widthValue, (b[1][1] - b[0][1]) / heightValue);
      onAutoZoom(currentZoom);
    }
    zoomLevel = currentZoom;

    let factor = 1 / (currentZoom || 1);

    svg.attr('width', widthValue).attr('height', heightValue).style('background', '#efefef');
    svg
      .select('#uncertainty' + index)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('width', 6 * factor)
      .attr('height', 6 * factor);
    svg
      .select('#uncertainty' + index + ' circle')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('r', 1.7 * factor)
      .attr('transform', `translate(${1.7 * factor},${1.7 * factor})`);
    svg.select('style').text(`@keyframes marching {
        to {
          stroke-dashoffset: -${14};
        }
      }`);

    centerArea = processedCenterArea;

    // Work out where the center of the map is
    if (!centerPoint || recenter) {
      let newCenter;
      if (area) {
        newCenter = path.centroid(area);
      } else {
        newCenter = path.centroid({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[136, -27]] }
        });
        currentZoom = 1;
        factor = 1;
      }
      centerPoint = newCenter;
    }

    const transform = `translate(${widthValue / 2}, ${
      heightValue / 2
    }) scale(${currentZoom}) translate(${-centerPoint[0]}, ${-centerPoint[1]})`;

    if (willTransition) {
      everythingGroup.transition().duration(TRANSITION_DURATION).attr('transform', transform);
    } else {
      everythingGroup.attr('transform', transform);
    }

    mapFeatures.attr('d', path).style('stroke-width', 1 * factor);

    // Render the warning areas
    areaFeatures.selectAll('path').data(areaData).attr('d', path);

    // Render place dots and names
    // These need to be trashed and re-added because they might all completely change
    const citiesData = getCitiesFunc(currentZoom);
    places.selectAll('path').remove();
    places
      .selectAll('path')
      .data(citiesData)
      .enter()
      .append('path')
      .attr(
        'd',
        geoPath()
          .projection(projection)
          .pointRadius(3 * factor)
      )
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5 * factor);
    places.selectAll('text').remove();
    places
      .selectAll('text')
      .data(citiesData)
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
    images
      .selectAll('image')
      .data(cycloneData)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .style('opacity', 0.8)
      .attr('x', d => d.x - cycloneSize / 2)
      .attr('y', d => d.y - cycloneSize / 2)
      .attr('width', cycloneSize)
      .attr('height', cycloneSize);

    const trackLines = findMidPoints(features.select('path.track'), fixData);
    const arrowSize = 4;
    arrows
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
    features
      .selectAll('path')
      .data(weatherData)
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('d', path)
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

    dots.data(fixData.filter(d => d.properties.fixtype !== 'Current'));
    dots
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

    dots
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

    dots
      .selectAll('text.letter')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
      .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
      .style('pointer-events', 'none');

    current
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

    current
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

    current
      .selectAll('text.letter')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', d => (d.properties.fixtype === 'Observed' ? 10 : 14) * factor)
      .attr('dy', d => (d.properties.fixtype === 'Observed' ? 3 : 5) * factor)
      .style('pointer-events', 'none');

    current
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

    current
      .selectAll('text.time-text')
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('font-size', 10 * factor)
      .attr('dy', 4 * factor)
      .attr('x', d => d.x + 82 * factor)
      .attr('y', d => d.y)
      .text(d => 'CURRENT: ' + format(d.properties.fixtime, 'ddd D/M ha').toUpperCase())
      .style('opacity', d => (d.properties.fixtype === 'Current' ? 1 : 0));

    balloons
      .transition()
      .duration(willTransition ? TRANSITION_DURATION : 0)
      .attr('transform', d => {
        return `translate(${d.x - 100 * factor}, ${d.y - (BALLOON_HEIGHT + 17) * factor}) scale(${1 / zoomLevel})`;
      })
      .style('opacity', d => (popupIndex === d.index ? 1 : 0))
      .style('pointer-events', d => {
        return popupIndex === d.index ? 'auto' : 'none';
      });

    if (hintBalloon) {
      const p = hintBalloon.props;
      hintBalloon
        .transition()
        .duration(willTransition ? TRANSITION_DURATION : 0)
        .attr(
          'transform',
          `translate(${p.x - (p.width / 2) * factor}, ${p.y - p.height * factor - 2}) scale(${factor})`
        );
    }
  }

  // Lifecycle effects
  $effect(() => {
    if (data && base) {
      initGraph();
      updateGraph();
    }
  });

  $effect(() => {
    if (base) {
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
      };
    }
  });

  $effect(() => {
    if (center && base && svg) {
      updateGraph({ willTransition: true, recenter: true });
    }
  });

  $effect(() => {
    if (data && base && svg) {
      updateGraph({ willTransition: embedded, recenter: embedded, updateZoom: embedded });
    }
  });
</script>

<div class="base" bind:this={base}></div>

<style lang="scss">
  .base {
    position: relative;
    overflow: hidden;
    max-height: 100vh;
    cursor: move;

    :global(*::selection) {
      background: transparent;
    }
  }

  .base :global(.track) {
    stroke-dashoffset: 0;
    pointer-events: none;
  }

  .base :global(path) {
    vector-effect: non-scaling-stroke;
  }
</style>
