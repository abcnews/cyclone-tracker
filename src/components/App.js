const React = require('react');
const styles = require('./App.scss');

const Map = require('./Map');

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      center: '',
      zoom: 2
    };
  }

  render() {
    return (
      <div className={styles.root} style={{ position: 'relative', borderTop: '2px solid black' }}>
        <Map data={this.props.data} zoom={this.state.zoom} index={this.props.index} center={this.state.center} />
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
          <button onClick={e => this.setState(state => ({ zoom: 1 }))}>1</button>
          <button onClick={e => this.setState(state => ({ zoom: 2 }))}>2</button>
          <button onClick={e => this.setState(state => ({ zoom: 4 }))}>3</button>
          <button onClick={e => this.setState(state => ({ zoom: 8 }))}>4</button>
          <button onClick={e => this.setState(state => ({ center: state.center === '' ? 'current' : '' }))}>
            Center
          </button>
          <button onClick={e => this.setState(state => ({ center: 'Rockhampton' }))}>Rockhampton</button>
        </div>
      </div>
    );
  }
}

module.exports = App;
