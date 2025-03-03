require('es6-promise/auto');
const React = require('react');
const { render } = require('react-dom');
const d3 = require('./d3');
const GML = require('./loader');

const PROJECT_NAME = 'cyclone-tracker';
const root = document.querySelector(`[data-${PROJECT_NAME}-root]`);

const detectDistId = href => {
  if (href && href.indexOf('cyclone=') > -1) {
    return getDistId('?' + href.split('?')[1]);
  } else if (document.location.search && document.location.search.indexOf('cyclone=')) {
    return getDistId(document.location.search);
  }

  return false;
};

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
  if (root && detectDistId()) {
    const distId = detectDistId();

    const url = `//www.abc.net.au/dat/news/bom-cyclone-data/tcdata/${distId}`;
    // Load in a cyclone based on the `cyclone` URL parameter
    d3.xml(url, (err, xml) => {
      const data = GML.parse(xml);
      render(<App data={data} embedded />, root);
    });
  } else {
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

        const distId = detectDistId(a.href);
        if (distId) {
          const url =
            distId === 'example.gml'
              ? `//www.abc.net.au/res/sites/news-projects/cyclone-tracker/master/example.gml`
              : `//www.abc.net.au/dat/news/bom-cyclone-data/tcdata/${distId}`;
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
}

init();