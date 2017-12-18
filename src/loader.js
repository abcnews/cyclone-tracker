const flattenDeep = require('lodash/flattenDeep');

const TROPICAL_LOW = 'Tropical Low';

class GML {
  /**
   * Find the first child of node that has 'coordinates' in its name
   * @param {XMLElement} node
   * @return {array<XMLElement>}
   */
  findCoordinatesNodes(node, depth) {
    depth = typeof depth === 'undefined' ? 0 : depth;

    if (!node) return [];

    if (node.nodeName.toLowerCase().indexOf('coordinates') > -1) return [node];

    // if it has no children then its not it
    if (!node.children) return null;

    // Recursively check the children for tags with coordinates in their name
    let coordinates = [].slice
      .call(node.children)
      .map(child => {
        return this.findCoordinatesNodes(child, depth + 1);
      })
      .filter(e => e);

    // Don't bother flattening while we are still building the tree
    if (depth > 0) {
      return coordinates;
    }

    return flattenDeep(coordinates);
  }

  /**
   * Convert a comma separated string to
   * @param {*} string
   * @returns {array<Number>} [latitude, longitude]
   */
  parseCoordinate(string) {
    return string
      .trim()
      .split(',')
      .map(coordinate => Number(coordinate));
  }

  /**
   * Convert a string of lat,lng lines into an array of [lat, lng]s as numbers
   * @param {string} string A set of lat,lng in a string
   * @return {array<array<Number>>}
   */
  parseCoordinates(string) {
    return string
      .trim()
      .split('\n')
      .map(line => {
        return this.parseCoordinate(line);
      });
  }

  /**
   * Get a hash child elements/values for a given  node
   * @param {XMLElement} node
   * @return {object}
   */
  getNodeProperties(node) {
    let properties = {};

    if (!node || !node.children) return properties;

    [].slice.call(node.children).forEach(child => {
      if (child.nodeName === 'geometry') return;
      properties[child.nodeName.toLowerCase()] = child.textContent;
    });

    return properties;
  }

  /**
   * Create a line object
   * @param {XMLElement} node
   * @returns {object}
   */
  createLine(node) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: this.parseCoordinates(this.findCoordinatesNodes(node)[0].textContent)
      },
      properties: this.getNodeProperties(node)
    };
  }

  /**
   * Create a polygon
   * @param {XMLElement} node
   * @returns {object}
   */
  createPolygon(node) {
    window.NODES = window.NODES || [];
    window.NODES.push(node);

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: this.findCoordinatesNodes(node).map(el => {
          return this.parseCoordinates(el.textContent);
        })
      },
      properties: this.getNodeProperties(node)
    };
  }

  /**
   * Parse an XML document
   * @param {XMLDocument} xml
   */
  parse(xml) {
    window.XML = xml;

    // Basic GeoJSON structure
    let geo = {
      type: 'FeatureCollection',
      features: [],
      properties: {}
    };

    // Grab some known metadata
    ['fcastTime', 'expiryHrs', 'distId', 'distName', 'issueTimeABC'].forEach(tag => {
      const node = xml.querySelector(tag);
      if (node) {
        geo.properties[tag] = node.textContent;
      }
    });

    geo.properties.isArchived = xml.querySelectorAll('geometry').length === 0;
    if (geo.properties.isArchived) {
      const times = [].slice.call(xml.querySelectorAll('tcFix'));
      geo.properties.historicalRange = [
        times[0].querySelector('fixTime').textContent,
        times[times.length - 1].querySelector('fixTime').textContent
      ];
    }

    ['tcWarningArea', 'tcWatchArea', 'tcForecastArea'].forEach(tag => {
      geo.features.push(this.createPolygon(xml.querySelector(tag)));
    });

    [].slice.call(xml.querySelectorAll('tcWindArea')).forEach(node => {
      geo.features.push(this.createPolygon(node));
    });

    [].slice.call(xml.querySelectorAll('tcTrack')).forEach(node => {
      geo.features.push(this.createLine(node));
    });

    // Grab the cyclone points
    let currentFix = false;
    let box = {
      top: Infinity,
      left: Infinity,
      bottom: -Infinity,
      right: -Infinity
    };
    [].slice.call(xml.querySelectorAll('tcFix')).forEach(node => {
      const coordinates = this.parseCoordinate(node.querySelector('gml\\:coordinates, coordinates').textContent);

      box.top = Math.min(coordinates[1], box.top);
      box.left = Math.min(coordinates[0], box.left);
      box.bottom = Math.max(coordinates[1], box.bottom);
      box.right = Math.max(coordinates[0], box.right);

      const fix = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates
        },
        properties: {
          fixType: node.querySelector('fixType').textContent,
          fixTime: node.querySelector('fixTime').textContent,
          symbol: node.querySelector('symbol').textContent,
          category: node.querySelector('category').textContent || 0
        }
      };

      geo.features.push(fix);

      if (fix.properties.fixType === 'Current') {
        currentFix = fix;
      }
    });

    // Center in the middle of all of the points
    geo.properties.box = box;

    // BOM specific cyclone naming stuff
    let title = geo.properties.distName;
    if (title !== TROPICAL_LOW) {
      // If it's not a tropical low, it's the name of the tropical cyclone
      title = 'Tropical Cyclone ' + title;
    }

    // If the cyclone is archive or the current observation is no longer a cyclone...
    if (geo.properties.isArchived || (title !== TROPICAL_LOW && currentFix && currentFix.properties.category < 1)) {
      title = 'Ex-' + title;
    }

    geo.properties.title = title;

    return geo;
  }
}

module.exports = new GML();
