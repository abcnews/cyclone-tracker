const React = require('react');
const Map = require('../Map');
const Legend = require('../Legend');

const styles = require('./index.scss');

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      center: '',
      zoom: null
    };
  }

  render() {
    return (
      <div className={styles.base}>
        <Map
          data={this.props.data}
          zoom={this.state.zoom}
          onAutoZoom={zoom => this.setState(state => ({ zoom }))}
          index={this.props.index}
          center={this.state.center}
        />

        <div className={styles.toolbar}>
          <button
            disabled={this.state.zoom === 8}
            onClick={e => this.setState(state => ({ zoom: Math.min((state.zoom || 1) * 2, 8) }))}>
            +
          </button>
          <button
            disabled={this.state.zoom === 1}
            onClick={e => this.setState(state => ({ zoom: Math.max((state.zoom || 1) / 2, 1) }))}>
            -
          </button>
        </div>
        <Legend data={this.props.data} />
      </div>
    );
  }
}

module.exports = App;
