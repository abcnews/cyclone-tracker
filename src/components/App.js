const React = require('react');
const Map = require('./Map');
const Legend = require('./Legend');

const styles = require('./App.scss');

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      center: '',
      zoom: null
    };
  }

  render() {
    //<button onClick={e => this.setState(state => ({ zoom: null, center: '' }))}>Default</button>

    return (
      <div className={styles.base}>
        <Map data={this.props.data} zoom={this.state.zoom} index={this.props.index} center={this.state.center} />
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
          <button onClick={e => this.setState(state => ({ zoom: 1 }))}>1</button>
          <button onClick={e => this.setState(state => ({ zoom: 2 }))}>2</button>
          <button onClick={e => this.setState(state => ({ zoom: 4 }))}>3</button>
          <button onClick={e => this.setState(state => ({ zoom: 8 }))}>4</button>
          &nbsp;
          <button onClick={e => this.setState(state => ({ center: state.center === '' ? 'current' : '' }))}>
            Center
          </button>
          <button onClick={e => this.setState(state => ({ center: 'Brisbane' }))}>Brisbane</button>
        </div>
        <Legend />
      </div>
    );
  }
}

module.exports = App;
