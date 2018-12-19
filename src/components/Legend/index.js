const React = require('react');
const format = require('date-fns/format');

const styles = require('./index.scss');
const cyclonePath = require('./cyclone-path.png');

class Legend extends React.Component {
  constructor(props) {
    super(props);

    this.processData = this.processData.bind(this);

    this.state = {
      hidden: false
    };
  }

  processData(data) {
    let hasWind = false;
    let hasDamagingWinds = false;
    let hasDestructiveWinds = false;

    let hasWindArea = false;
    let has24Hours = false;
    let has48Hours = false;

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

      if (d.properties.areatype === 'Watch Area') {
        hasWindArea = true;
        has24Hours = true;
      }

      if (d.properties.areatype == 'Warning Area') {
        hasWindArea = true;
        has48Hours = true;
      }

      if (d.properties.areatype === 'Likely Tracks Area') {
        hasLikelyTrack = true;
      }
    });

    return { hasWind, hasDamagingWinds, hasDestructiveWinds, hasWindArea, has24Hours, has48Hours, hasLikelyTrack };
  }

  render() {
    const { data } = this.props;

    if (!data) return <div />;

    const baseStyle = {
      transform: this.state.hidden ? `translate(-50%, 90%)` : ''
    };

    const d = this.processData(data.features);

    return (
      <div className={styles.base} onClick={e => this.setState(state => ({ hidden: !state.hidden }))} style={baseStyle}>
        <div className={styles.hideIndicator} />
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
            </div>
          )}

          {d.hasWindArea && (
            <div className={styles.section}>
              <h3>Wind areas</h3>
              {d.has24Hours && (
                <div>
                  <div className={styles.area} style={{ background: '#ff9255' }} />
                  24 hours
                </div>
              )}

              {d.has48Hours && (
                <div>
                  <div className={styles.area} style={{ background: '#ffbd55' }} />
                  48 hours
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
    );
  }
}

module.exports = Legend;
