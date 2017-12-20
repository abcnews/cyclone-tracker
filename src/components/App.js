const React = require('react');
const styles = require('./App.scss');

const Map = require('./Map');

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      zoom: 1
    };
  }

  render() {
    return (
      <div className={styles.root} style={{ position: 'relative', borderTop: '2px solid black' }}>
        <Map data={this.props.data} zoom={this.state.zoom} index={this.props.index} />
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
          <button onClick={e => this.setState(state => ({ zoom: state.zoom === 1 ? 2 : 1 }))}>
            Toggle {this.props.index + 1}
          </button>
        </div>
      </div>
    );
  }
}

module.exports = App;
