import React from 'react';
import { render } from 'react-dom';
import d3 from './d3';
import GML from './loader.js';

const PROJECT_NAME = 'cyclone-tracker';
const root = document.querySelector(`[data-${PROJECT_NAME}-root]`);

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
    const url = `https://abcnewsdata.sgp1.digitaloceanspaces.com/cyclonetracker-svc/tcdata/${cyclone}`;
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
