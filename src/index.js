require('es6-promise/auto');

const React = require('react');
const { render } = require('react-dom');
const d3 = require('./d3');
const GML = require('./loader');

const PROJECT_NAME = 'cyclone-tracker';

function init() {
  const App = require('./components/App');

  [].slice.call(document.querySelectorAll(`[data-${PROJECT_NAME}-root]`)).forEach((root, index) => {
    if (document.location.search && document.location.search.indexOf('cyclone') > -1) {
      // Load the cylone from the query param
      d3.xml(
        `//www.abc.net.au/dat/news/bom-cyclone-data/tcdata/${document.location.search.replace('?cyclone=', '')}`,
        (err, xml) => {
          const data = GML.parse(xml);
          render(<App data={data} index={index} />, root);
        }
      );
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
