const React = require('react');
const styles = require('./App.scss');

const Map = require('./Map');

class App extends React.Component {
  render() {
    return (
      <div className={styles.root}>
        <Map data={this.props.data} />
      </div>
    );
  }
}

module.exports = App;
