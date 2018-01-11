const React = require('react');
const format = require('date-fns/format');

const styles = require('./index.scss');
const cyclonePath = require('./cyclone-path.png');

class Legend extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hidden: false
    };
  }

  render() {
    const { data } = this.props;

    const baseStyle = {
      transform: this.state.hidden ? `translate(-50%, 90%)` : ''
    };

    return (
      <div className={styles.base} onClick={e => this.setState(state => ({ hidden: !state.hidden }))} style={baseStyle}>
        <div className={styles.hideIndicator} />
        <div className={styles.title}>{this.props.data.properties.title}</div>
        <div className={styles.info}>
          <div className={styles.section}>
            <h3>Wind areas</h3>
            <div>
              <div className={styles.circle} style={{ borderColor: '#b60707' }} />
              Damaging
            </div>

            <div>
              <div className={styles.circle} style={{ borderColor: '#600000' }} />
              Destructive
            </div>
          </div>

          <div className={styles.section}>
            <h3>Wind areas</h3>
            <div>
              <div className={styles.area} style={{ background: '#ffbd55' }} />
              24 hours
            </div>

            <div>
              <div className={styles.area} style={{ background: '#ff9255' }} />
              48 hours
            </div>
          </div>

          <div className={styles.section}>
            <h3>Possible range of cyclone centre</h3>
            <img className={styles.cyclonePath} src={cyclonePath} />
          </div>
        </div>

        <div className={styles.footer}>
          Updated {format(data.properties.issueTimeABC, 'D MMM YYYY h:mmA')}. Source: Bureau of Meteorology.
        </div>
      </div>
    );
  }
}

module.exports = Legend;
