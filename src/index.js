const React = require('react');
const { render } = require('react-dom');
const d3 = require('./d3');
const GML = require('./loader');

const PROJECT_NAME = 'cyclone-tracker';

function init() {
  [].slice.call(document.querySelectorAll(`[data-${PROJECT_NAME}-root]`)).forEach(root => {
    d3.xml(root.getAttribute('data-url'), (err, xml) => {
      const data = GML.parse(xml);
      const App = require('./components/App');
      render(<App data={data} />, root);
    });
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
