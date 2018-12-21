require('es6-promise/auto');

const React = require('react');
const { render } = require('react-dom');
const d3 = require('./d3');
const GML = require('./loader');

const PROJECT_NAME = 'cyclone-tracker';
const BASE_URL = `https://${document.location.host}/res/sites/news-projects/cyclone-tracker/3.0.13/`;

const getDistId = strings => {
  if (typeof strings === 'string') strings = [strings];

  return strings
    .map(s => {
      const matches = s.match(/\?cyclone\=([^\.]+\.gml)/);
      return matches && matches[1] ? matches[1] : null;
    })
    .filter(s => s)[0];
};

function init() {
  const App = require('./components/App');

  [].slice.call(document.querySelectorAll(`a[href*="/news/specials/cyclones"]`)).forEach(a => {
    // Create an iframe to house an instance of ourselves in it
    const iframe = document.createElement('iframe');
    const distId = getDistId([a.href, document.location.search]);
    if (distId) {
      iframe.src = `${BASE_URL}?cyclone=${distId}`;
    } else {
      iframe.src = BASE_URL;
    }
    iframe.width = a.parentElement.offsetWidth;
    iframe.height = 500;
    iframe.setAttribute('frameBorder', 0);

    // Find the nearest parent with the extended link embed class
    const replace = a.closest('.view-external-link-embedded') || a;
    replace.parentElement.insertBefore(iframe, replace);
    replace.parentElement.removeChild(replace);

    // Stop the page from moving while scrolling on mobile
    window.addEventListener('message', event => {
      if (typeof event.data.lockScroll !== 'undefined') {
        if (event.data.lockScroll) {
          document.body.style.setProperty('overflow', 'hidden');
          document.body.style.setProperty('width', '100%');
          document.body.style.setProperty('height', '100%');
        } else {
          document.body.style.removeProperty('overflow');
          document.body.style.removeProperty('width');
          document.body.style.removeProperty('height');
        }
      }
    });
  });

  [].slice.call(document.querySelectorAll(`[data-${PROJECT_NAME}-root]`)).forEach((root, index) => {
    if (document.location.search && document.location.search.indexOf('cyclone') > -1) {
      const distId = getDistId(document.location.search);
      const url =
        distId === 'example.gml' ? 'example.gml' : `//www.abc.net.au/dat/news/bom-cyclone-data/tcdata/${distId}`;

      // Load the cylone from the query param
      d3.xml(url, (err, xml) => {
        const data = GML.parse(xml);
        render(<App data={data} index={index} />, root);
      });
    } else if (root.getAttribute('data-url')) {
      // Load in a specific hard-coded cyclone
      d3.xml(root.getAttribute('data-url'), (err, xml) => {
        const data = GML.parse(xml);
        render(<App data={data} index={index} />, root);
      });
    } else {
      // Load from the data url
      const baseUrl = '//www.abc.net.au/dat/news/bom-cyclone-data/';
      d3.json(baseUrl + '/cyclones.json', (err, json) => {
        // Show the actual list of cyclones
        const List = require('./components/List');
        render(<List baseUrl={baseUrl} data={json} />, root);
      });
    }
  });
}

init();

if (module.hot) {
  module.hot.accept('./components/App', () => {
    try {
      init();
    } catch (err) {
      const ErrorBox = require('./components/ErrorBox');
      render(<ErrorBox error={err} />, root);
    }
  });
}

if (process.env.NODE_ENV === 'development') {
  console.debug(`[${PROJECT_NAME}] public path: ${__webpack_public_path__}`);
}

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
