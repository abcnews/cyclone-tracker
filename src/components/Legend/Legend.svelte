<script lang="ts">
  import format from 'date-fns/format';

  // Import the cyclone path image
  import cyclonePath from './cyclone-path.png';

  // Props
  export let data = null;

  // Process data to determine what legend items to show
  function processData(features) {
    if (!features)
      return {
        hasWind: false,
        hasDamagingWinds: false,
        hasDestructiveWinds: false,
        hasVeryDestructiveWinds: false,
        hasWindArea: false,
        hasWatchArea: false,
        hasWarningArea: false,
        hasLikelyTrack: false
      };

    let hasWind = false;
    let hasDamagingWinds = false;
    let hasDestructiveWinds = false;
    let hasVeryDestructiveWinds = false;
    let hasWindArea = false;
    let hasWatchArea = false;
    let hasWarningArea = false;
    let hasLikelyTrack = false;

    features.forEach(d => {
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

      if (d.properties.areatype === 'Warning Area') {
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

  // Reactive statement to process data when it changes
  $: legendData = processData(data?.features);
</script>

{#if data}
  <div class="container">
    <div class="base">
      <div class="title">{data.properties.title}</div>
      <div class="info">
        {#if legendData.hasWind}
          <div class="section">
            <h3>Wind areas</h3>
            {#if legendData.hasDamagingWinds}
              <div>
                <div class="circle" style="border-color: #b60707;"></div>
                Damaging
              </div>
            {/if}

            {#if legendData.hasDestructiveWinds}
              <div>
                <div class="circle" style="border-color: #600000;"></div>
                Destructive
              </div>
            {/if}

            {#if legendData.hasVeryDestructiveWinds}
              <div>
                <div class="circle" style="border-color: #000000;"></div>
                Very Destructive
              </div>
            {/if}
          </div>
        {/if}

        {#if legendData.hasWindArea}
          <div class="section">
            <h3>Wind alert</h3>
            {#if legendData.hasWatchArea}
              <div>
                <div class="area" style="background: #ffbd55;"></div>
                Watch area
              </div>
            {/if}

            {#if legendData.hasWarningArea}
              <div>
                <div class="area" style="background: #ff9255;"></div>
                Warning area
              </div>
            {/if}
          </div>
        {/if}

        {#if legendData.hasLikelyTrack}
          <div class="section">
            <h3>Possible range of cyclone centre</h3>
            <img class="cyclone-path" src={cyclonePath} alt="Cyclone path legend" />
          </div>
        {/if}
      </div>

      <div class="footer">
        Updated {format(data.properties.issueTimeABC, 'D MMM YYYY h:mma')}. Times shown in user's local time. Source:
        Bureau of Meteorology.
      </div>
    </div>
  </div>
{:else}
  <!-- Empty state - nothing renders when no data -->
{/if}

<style lang="scss">
  .container {
    container-type: inline-size;
    min-width: 200px;
  }

  .base {
    box-sizing: border-box;
    min-width: 200px;
    max-width: 350px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 3px;
    color: #111;
    font-family: ABCSans, Helvetica, Arial, sans-serif;
    font-size: 13px;
    transition: all 0.3s ease;

    * {
      box-sizing: border-box;
    }
  }

  .title {
    text-align: center;
    font-weight: bold;
    margin: 10px auto 0 auto;
  }

  .info {
    display: flex;

    @container (max-width:350px) {
      flex-direction: column;
    }
  }

  .section {
    flex: 1 0;
    padding: 10px 0 0 10px;

    &:last-of-type {
      padding-right: 10px;
    }

    font-size: 10px;
    line-height: 14px;
    text-transform: uppercase;

    h3 {
      font-size: 11px;
      font-weight: normal;
      margin: 0 0 5px 0;
      padding: 0;
    }
  }

  .cyclone-path {
    width: 60px;
    height: 20px;
  }

  .area {
    display: inline-block;
    vertical-align: baseline;
    width: 10px;
    height: 10px;
    border-radius: 100%;
    margin-right: 5px;
    background: black;
  }

  .circle {
    display: inline-block;
    vertical-align: baseline;
    width: 10px;
    height: 10px;
    border: 2px solid black;
    border-radius: 100%;
    margin-right: 5px;
  }

  .footer {
    font-size: 10px;
    text-align: center;
    margin: 10px auto 5px auto;
    padding: 0 5px;
  }
</style>
