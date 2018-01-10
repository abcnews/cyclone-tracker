require('es6-promise/auto');

const React = require('react');
const { render } = require('react-dom');
const d3 = require('./d3');
const GML = require('./loader');

const PROJECT_NAME = 'cyclone-tracker';

function init() {
  const App = require('./components/App');

  [].slice.call(document.querySelectorAll(`[data-${PROJECT_NAME}-root]`)).forEach((root, index) => {
    if (root.getAttribute('data-url').indexOf('.json') > -1) {
      // Find the latest cyclone (if there is one)
      d3.json(root.getAttribute('data-url'), (err, json) => {
        // Get the path where the json file was loaded to see where the GML files are
        const baseURL = root
          .getAttribute('data-url')
          .split('/')
          .slice(0, -1)
          .join('/');

        // TODO: load more than 1 cyclone if possible
        if (json.cyclones.length > 0) {
          d3.xml(baseURL + '/' + json.cyclones[0].path, (err, xml) => {
            const data = GML.parse(xml);
            render(<App data={data} index={index} />, root);
          });
        } else {
          render(<App index={index} />, root);
        }
      });
    } else {
      // Load in the specific cyclone
      d3.xml(root.getAttribute('data-url'), (err, xml) => {
        const data = GML.parse(xml);
        render(<App data={data} index={index} />, root);
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
