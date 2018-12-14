const React = require('react');
const d3 = require('../../d3');
const GML = require('../../loader');
const styles = require('./styles.scss');

class List extends React.Component {
  render() {
    const { baseUrl, data } = this.props;

    return (
      <div className={styles.base}>
        {data.cyclones.map(cyclone => (
          <Cyclone key={cyclone.name} baseUrl={baseUrl} data={cyclone} />
        ))}
      </div>
    );
  }
}

class Cyclone extends React.Component {
  constructor(props) {
    super(props);

    this.copyLink = this.copyLink.bind(this);

    this.state = {
      geo: null
    };
  }

  componentDidMount() {
    d3.xml(this.props.baseUrl + '/' + this.props.data.path, (err, xml) => {
      this.setState(s => ({ geo: GML.parse(xml) }));
    });
  }

  copyLink() {
    this.input.select();
    document.execCommand('copy');
  }

  render() {
    const { geo } = this.state;

    if (geo == null) return <div>Loading...</div>;

    const watchArea = geo.features.filter(f => f.properties.areatype === 'Watch Area')[0];
    const current = geo.features.filter(f => f.properties.category && f.properties.fixtype === 'Current')[0];

    return (
      <div onClick={e => this.copyLink()}>
        <div className={styles.title}>
          {geo.properties.title}
          {current && ` (Category ${current.properties.category})`}
        </div>
        <div className={styles.dist}>{geo.properties.distId}</div>
        {watchArea && <div className={styles.description}>{watchArea.properties.extent}</div>}
        <input
          readOnly
          ref={el => (this.input = el)}
          className={styles.input}
          defaultValue={`https://www.abc.net.au/news/specials/cyclones/?cyclone=${geo.properties.distId}`}
        />
        <div className={styles.help}>Click to copy</div>
      </div>
    );
  }
}

module.exports = List;
