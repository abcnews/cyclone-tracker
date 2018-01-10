const React = require('react');

const styles = require('./index.scss');

class Legend extends React.Component {
  render() {
    return (
      <div className={styles.base}>
        <div>
          <div className={styles.area} style={{ background: '#ffbd55' }} />
          Watch Area
        </div>

        <div>
          <div className={styles.area} style={{ background: '#ff9255' }} />
          Warning Area
        </div>

        <div>
          <div className={styles.circle} style={{ borderColor: '#b60707' }} />
          Damaging winds
        </div>

        <div>
          <div className={styles.circle} style={{ borderColor: '#600000' }} />
          Destructive winds
        </div>
      </div>
    );
  }
}

module.exports = Legend;
