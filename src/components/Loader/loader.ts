// @ts-nocheck
// This is a legacy file and it needs to be largely rewritten for TypeScript
import flattenDeep from 'lodash-es/flattenDeep';
import type { CycloneGeoJson } from './types';

const TROPICAL_LOW = 'Tropical Low';

class GML {
  /**
   * Find the first child of node that has 'coordinates' in its name
   * @param {Element} node
   * @return {array<Element>}
   */
  findCoordinatesNodes(node, depth = 0) {
    if (!node) return [];

    if (node.nodeName.toLowerCase().indexOf('coordinates') > -1) return [node];

    // if it has no children then its not it
    if (!node.childNodes || node.childNodes.length === 0) return null;

    // Recursively check the children for tags with coordinates in their name
    let coordinates = [].slice
      .call(node.childNodes)
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
   * @param {Element} node
   * @return {object}
   */
  getNodeProperties(node: Element) {
    let properties = {};

    if (!node || !node.childNodes || node.childNodes.length === 0) return properties;

    Array.from(node.childNodes).forEach(child => {
      if (child.nodeName === 'geometry') return;
      properties[child.nodeName.toLowerCase()] = child.textContent;
    });

    return properties;
  }

  /**
   * Create a line object
   * @param {Element} node
   * @returns {object}
   */
  createLine(node: Element) {
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
   * @param {Element} node
   * @returns {object}
   */
  createPolygon(node: Element) {
    const coordinates = this.findCoordinatesNodes(node).map(el => {
      return this.parseCoordinates(el.textContent);
    });

    return coordinates.map(coordinate => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinate]
      },
      properties: this.getNodeProperties(node)
    }));
  }

  /**
   * Parse an XML document
   * @param {XMLDocument} xml
   */
  parse(xml) {
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
      const times = Array.from(xml.querySelectorAll('tcFix'));
      geo.properties.historicalRange = [
        times[0].querySelector('fixTime').textContent,
        times[times.length - 1].querySelector('fixTime').textContent
      ];
    }

    ['tcWarningArea', 'tcWatchArea', 'tcForecastArea', 'tcWindArea'].forEach(tag => {
      Array.from(xml.querySelectorAll(tag)).forEach(node => {
        geo.features.push(...this.createPolygon(node));
      });
    });

    Array.from(xml.querySelectorAll('tcTrack')).forEach(node => {
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
    Array.from(xml.querySelectorAll('tcFix')).forEach(node => {
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
          fixtype: node.querySelector('fixType').textContent,
          fixtime: node.querySelector('fixTime').textContent,
          symbol: node.querySelector('symbol').textContent,
          category: node.querySelector('category').textContent || 0
        }
      };

      geo.features.push(fix);

      if (fix.properties.fixtype === 'Current') {
        currentFix = fix;
      }
    });

    // Center in the middle of all of the points
    geo.properties.box = box;
    geo.properties.currentFix = currentFix;

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

    return geo as CycloneGeoJson;
  }
}

const gmlClass = new GML();

export default gmlClass;
