import React from 'react';
import { render } from 'react-dom';
import d3 from './d3';
import GML from './loader.js';

const PROJECT_NAME = 'cyclone-tracker';
const root = document.querySelector(`[data-${PROJECT_NAME}-root]`);

const getDistId = strings => {
  if (typeof strings === 'string') strings = [strings];

  const distId = strings
    .map(s => {
      const matches = s.match(/\?cyclone\=([^\.\&]+)/);
      return matches && matches[1] ? matches[1] : null;
    })
    .filter(s => s)[0];

  if (distId && distId.indexOf('.gml') === -1) return distId + '.gml';

  return distId;
};

async function initBuilder(root) {
  const Builder = await import('./components/Builder/Builder.jsx');

  render(<Builder.default />, root);
}

function init() {
  const App = require('./components/App');
  const params = new URLSearchParams(location.search);
  const cyclone = params.get('cyclone');
  const cities = params.get('cities');
  if (root && cyclone) {
    const url = `//www.abc.net.au/dat/news/bom-cyclone-data/tcdata/${cyclone}`;
    // Load in a cyclone based on the `cyclone` URL parameter
    d3.xml(url, (err, xml) => {
      const data = GML.parse(xml);
      render(<App data={data} cities={cities ? cities.split('x').map(Number) : []} embedded />, root);
    });
  }
}

const builderEl = document.querySelector('[data-cyclone-tracker-builder]');
if (builderEl) {
  initBuilder(builderEl);
} else {
  init();
}
