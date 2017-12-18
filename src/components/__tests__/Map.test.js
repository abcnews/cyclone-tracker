const React = require('react');
const renderer = require('react-test-renderer');

const Map = require('../Map');

describe('Map', () => {
  test('It renders', () => {
    const component = renderer.create(<Map />);

    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
  });
});
