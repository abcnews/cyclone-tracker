const React = require('react');
const format = require('date-fns/format');

const stylesModule = require('./index.scss');
const styles = stylesModule.default;
const cyclonePath = require('./cyclone-path.png');

class Legend extends React.Component {
  constructor(props) {
    super(props);

    this.processData = this.processData.bind(this);
  }

  processData(data) {
    let hasWind = false;
    let hasDamagingWinds = false;
    let hasDestructiveWinds = false;
    let hasVeryDestructiveWinds = false;

    let hasWindArea = false;
    let hasWatchArea = false;
    let hasWarningArea = false;

    let hasLikelyTrack = false;

    data.forEach(d => {
      if (d.properties.windtype === 'Damaging') {
        hasWind = true;
        hasDamagingWinds = true;
      }

      if (d.properties.windtype === 'Destructive') {
        hasWind = true;
        hasDestructiveWinds = true;
      }

      if (d.properties.windtype === 'Very Destructive') {
        hasWind = true;
        hasVeryDestructiveWinds = true;
      }

      if (d.properties.areatype === 'Watch Area') {
        hasWindArea = true;
        hasWatchArea = true;
      }

      if (d.properties.areatype == 'Warning Area') {
        hasWindArea = true;
        hasWarningArea = true;
      }

      if (d.properties.areatype === 'Likely Tracks Area') {
        hasLikelyTrack = true;
      }
    });

    return {
      hasWind,
      hasDamagingWinds,
      hasDestructiveWinds,
      hasVeryDestructiveWinds,
      hasWindArea,
      hasWatchArea,
      hasWarningArea,
      hasLikelyTrack
    };
  }

  render() {
    const { data } = this.props;

    if (!data) return <div />;

    const d = this.processData(data.features);

    return (
      <div className={styles.container}>
      <div className={styles.base}>
        <div className={styles.title}>{this.props.data.properties.title}</div>
        <div className={styles.info}>
          {d.hasWind && (
            <div className={styles.section}>
              <h3>Wind areas</h3>
              {d.hasDamagingWinds && (
                <div>
                  <div className={styles.circle} style={{ borderColor: '#b60707' }} />
                  Damaging
                </div>
              )}

              {d.hasDestructiveWinds && (
                <div>
                  <div className={styles.circle} style={{ borderColor: '#600000' }} />
                  Destructive
                </div>
              )}

              {d.hasVeryDestructiveWinds && (
                <div>
                  <div className={styles.circle} style={{ borderColor: '#000000' }} />
                  Very Destructive
                </div>
              )}
            </div>
          )}

          {d.hasWindArea && (
            <div className={styles.section}>
              <h3>Wind alert</h3>
              {d.hasWatchArea && (
                <div>
                  <div className={styles.area} style={{ background: '#ffbd55' }} />
                  Watch area
                </div>
              )}

              {d.hasWarningArea && (
                <div>
                  <div className={styles.area} style={{ background: '#ff9255' }} />
                  Warning area
                </div>
              )}
            </div>
          )}

          {d.hasLikelyTrack && (
            <div className={styles.section}>
              <h3>Possible range of cyclone centre</h3>
              <img className={styles.cyclonePath} src={cyclonePath} />
            </div>
          )}
        </div>

        <div className={styles.footer}>
          Updated {format(data.properties.issueTimeABC, 'D MMM YYYY h:mmA')}. Source: Bureau of Meteorology.
        </div>
      </div>
      </div>
    );
  }
}

module.exports = Legend;
