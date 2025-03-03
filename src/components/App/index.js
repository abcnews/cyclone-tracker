const React = require('react');
const Map = require('../Map');
const Legend = require('../Legend');

const stylesModule = require('./index.scss');
const styles = stylesModule.default;

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      center: 'current',
      zoom: null,
      width: 10,
      height: 10
    };
  }

  componentDidMount() {
    if (this.base) {
      const resizeObserver = new ResizeObserver((entries) => {
        const { width, height } = this.base.getBoundingClientRect();
        this.setState(() => ({ width, height }));
      });

      resizeObserver.observe(this.base);
    }
  }

  render() {
    const classNames = [styles.base, this.props.embedded ? styles.embedded : ""];

    return (
      <div className={classNames.join(" ")} >
        <div className={styles['base__map']} ref={el => (this.base = el)}>
          {this.base && (
            <Map
              data={this.props.data}
              embedded={this.props.embedded}
              zoom={this.state.zoom}
              onAutoZoom={zoom => this.setState(state => ({ zoom }))}
              index={this.props.index}
              center={this.state.center}
              width={this.state.width}
              height={this.state.height}
            />
          )}
        </div>
        <div className={styles.toolbar}>
          <button
            disabled={this.state.zoom >= 8}
            onClick={e => this.setState(state => ({ zoom: Math.min((state.zoom || 1) * 2, 8) }))}>
            +
          </button>
          <button
            disabled={this.state.zoom <= 1}
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
