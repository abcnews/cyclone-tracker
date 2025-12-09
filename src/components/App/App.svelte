<script lang="ts">
  import Legend from '../Legend/Legend.svelte';
  import GeoMap from '../GeoMap/GeoMap.svelte';

  interface Props {
    // Props
    cities?: any;
    data?: any;
    embedded?: boolean;
    index?: any;
  }

  let {
    cities = [],
    data = null,
    embedded = false,
    index = Math.floor(Math.random() * 100000).toString()
  }: Props = $props();

  // Ref for resize observer
  let base = $state();

  // Computed class names
  let containerClasses = $derived(['base', embedded ? 'base--embedded' : ''].filter(Boolean).join(' '));
</script>

<div class={containerClasses} bind:this={base}>
  <div class="base__map">
    <GeoMap {data} />
  </div>

  <Legend {data} />
</div>

<style lang="scss">
  :global {
    html,
    body {
      margin: 0;
      padding: 0;
    }
    * {
      box-sizing: border-box;
    }
  }
  .base {
    position: relative;
    overflow: hidden;

    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    // Doesn't work on dark mode yet
    // border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid #cccccc;
    background: white;
    color: black;
    @media (orientation: landscape) and (min-width: 500px) {
      flex-direction: row;
    }
  }

  .base__map {
    flex: 1;
    overflow: hidden;
  }
</style>
