const React = require('react');
const Map = require('../Map');
const Legend = require('../Legend');

const styles = require('./index.scss');

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      center: '',
      zoom: null,
      width: 10,
      height: 10
    };
  }

  componentDidMount() {
    if (this.base) {
      const { width, height } = this.base.getBoundingClientRect();
      this.setState(() => ({ width, height }));
    }
  }

  render() {
    return (
      <div className={styles.base} ref={el => (this.base = el)}>
        {this.base && (
          <Map
            data={this.props.data}
            zoom={this.state.zoom}
            onAutoZoom={zoom => this.setState(state => ({ zoom }))}
            index={this.props.index}
            center={this.state.center}
            width={this.state.width}
            height={this.state.height}
          />
        )}

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
