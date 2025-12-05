<script lang="ts">
  import Map from '../Map/Map.svelte';
  import Legend from '../Legend/Legend.svelte';

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

  // Component state (reactive variables)
  let center = 'current';
  let zoom = $state<number | null>(null);
  let width = $state(10);
  let height = $state(10);

  // Ref for resize observer
  let base = $state();
  let resizeObserver;

  // Auto-zoom handler
  function handleAutoZoom(newZoom) {
    zoom = newZoom;
  }

  // Zoom controls
  function zoomIn() {
    zoom = Math.min((zoom || 1) * 2, 8);
  }

  function zoomOut() {
    zoom = Math.max((zoom || 1) / 2, 1);
  }

  // Computed class names
  let containerClasses = $derived(['base', embedded ? 'base--embedded' : ''].filter(Boolean).join(' '));
</script>

<div class={containerClasses} bind:this={base} bind:clientWidth={width} bind:clientHeight={height}>
  <div class="base__map">
    {#if width > 10 && height > 10}
      <Map {cities} {data} {embedded} {zoom} onAutoZoom={handleAutoZoom} {index} {center} {width} {height} />
    {/if}
  </div>

  <div class="toolbar">
    <button disabled={zoom ? zoom >= 8 : true} onclick={zoomIn} aria-label="Zoom in"> + </button>
    <button disabled={zoom ? zoom <= 1 : true} onclick={zoomOut} aria-label="Zoom out"> - </button>
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

  .toolbar {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: 1px solid #999;
    border-radius: 3px;
    overflow: hidden;

    button {
      font-size: 18px;
      line-height: 32px;
      text-transform: uppercase;
      padding: 0 16px;
      background: white;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease;
      outline: none;
      margin: 0;

      border-left: 1px solid #ccc;

      &:first-of-type {
        border-left: none;
      }

      &:hover {
        background: #efefef;
      }

      &[disabled] {
        color: #999;
        cursor: auto;
        &:hover {
          background: white;
        }
      }
    }
  }
</style>
