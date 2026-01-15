<script lang="ts">
  import Legend from '../Legend/Legend.svelte';
  import GeoMap from '../GeoMap/GeoMap.svelte';

  interface Props {
    data?: any;
  }

  let { data = null }: Props = $props();
</script>

<div class="base">
  <div class="base__map">
    {#key data}
      <GeoMap {data} />
    {/key}
  </div>

  <Legend {data} />
</div>

<style lang="scss">
  .base {
    position: relative;
    overflow: hidden;

    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    @media (orientation: landscape) and (min-width: 500px) {
      flex-direction: row;
    }
  }

  .base__map {
    flex: 1;
    overflow: hidden;
  }
</style>
