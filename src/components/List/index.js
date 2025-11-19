const React = require('react');
const format = require('date-fns/format');
const d3 = require('../../d3');
const GML = require('../../loader');
const stylesModule = require('./styles.scss');
const styles = stylesModule.default;

class List extends React.Component {
  render() {
    const { baseUrl, data } = this.props;

    return (
      <div className={styles.base}>
        <div className={styles.heading}>Current Cyclones</div>
        <div className={styles.meta}>Updated {format(data.updated, 'D MMM YYYY h:mma')}</div>
        {data.cyclones.length === 0 && <div className={styles.none}>There are no active cyclones.</div>}
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

    this.state = {
      geo: null
    };
  }

  componentDidMount() {
    d3.xml(this.props.baseUrl + '/' + this.props.data.path, (err, xml) => {
      this.setState(s => ({ geo: GML.parse(xml) }));
    });
  }

  render() {
    const { geo } = this.state;

    if (geo == null) return <div>Loading...</div>;

    const watchArea = geo.features.filter(f => f.properties.areatype === 'Watch Area')[0];
    const current = geo.features.filter(f => f.properties.category && f.properties.fixtype === 'Current')[0];

    return (
      <div>
        <div className={styles.title}>
          <a href={`https://www.abc.net.au/news/specials/cyclones/?cyclone=${geo.properties.distId}`}>
            {geo.properties.title}
            {current && ` (Category ${current.properties.category})`}
          </a>
        </div>
        <div className={styles.dist}>{geo.properties.distId}</div>
        {watchArea && <div className={styles.description}>Watch area: {watchArea.properties.extent}</div>}
      </div>
    );
  }
}

module.exports = List;
