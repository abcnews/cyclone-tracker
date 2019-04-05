require('es6-promise/auto');

const React = require('react');
const { render } = require('react-dom');
const d3 = require('./d3');
const GML = require('./loader');

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

function init() {
  const App = require('./components/App');

  [].slice
    .call(
      document.querySelectorAll(
        `.embed-content a[href*="/news/specials/cyclones"], .inline-content a[href*="/news/specials/cyclones"]`
      )
    )
    .forEach(a => {
      const mountNode = document.createElement('div');
      // Find the nearest parent with the extended link embed class
      const replace = a.closest('.view-external-link-embedded') || a;
      replace.parentElement.insertBefore(mountNode, replace);
      replace.parentElement.removeChild(replace);

      if (a.href.indexOf('cyclone=') > -1) {
        const distId = getDistId(a.href.split('?')[0]);
        const url =
          distId === 'example.gml' ? 'example.gml' : `//www.abc.net.au/dat/news/bom-cyclone-data/tcdata/${distId}`;

        // Load the cylone from the query param
        d3.xml(url, (err, xml) => {
          const data = GML.parse(xml);
          render(<App data={data} />, mountNode);
        });
      } else if (root && root.getAttribute('data-url')) {
        // Load in a specific hard-coded cyclone
        d3.xml(root.getAttribute('data-url'), (err, xml) => {
          const data = GML.parse(xml);
          render(<App data={data} />, root);
        });
      } else {
        // Load from the data url
        const baseUrl = '//www.abc.net.au/dat/news/bom-cyclone-data/';
        d3.json(baseUrl + '/cyclones.json', (err, json) => {
          // Show the actual list of cyclones
          const List = require('./components/List');
          render(<List baseUrl={baseUrl} data={json} />, mountNode);
        });
      }
    });
}

init();

// POLYFILLS

if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    if (!document.documentElement.contains(el)) return null;
    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}
