<script lang="ts">
  import { onMount } from 'svelte';
  import type * as MapLibre from './maplibre-gl.d.ts';
  import versions from './_versions.json' assert { type: 'json' };

  const {
    onLoad
  }: {
    onLoad: ({}: { rootNode: HTMLDivElement; maplibregl: typeof window.maplibregl }) => void | Promise<void>;
  } = $props();
  let rootNode = $state<HTMLDivElement>();

  const promises = {};
  function importModule(url) {
    const key = 'module' + url;
    if (promises[key]) {
      return promises[key];
    }
    promises[key] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.type = 'module';
      s.addEventListener('load', resolve);
      s.addEventListener('error', reject);
      document.head.appendChild(s);
    });
    return promises[key];
  }

  function loadCss(url) {
    const key = 'css' + url;
    if (promises[key]) {
      return promises[key];
    }
    promises[key] = new Promise((resolve, reject) => {
      const s = document.createElement('link');
      s.rel = 'stylesheet';
      s.type = 'text/css';
      s.href = url;
      s.addEventListener('load', resolve);
      s.addEventListener('error', reject);
      document.head.appendChild(s);
    });
    return promises[key];
  }

  onMount(async () => {
    if (!rootNode) {
      throw new Error('Root missing');
    }
    await Promise.all([importModule(versions.MAPLIBRE_URL), loadCss(versions.MAPLIBRE_CSS_URL)]);
    onLoad({ rootNode, maplibregl: window.maplibregl });
  });
</script>

<div class="maplibre" bind:this={rootNode}></div>

<style lang="scss">
  .maplibre {
    width: 100%;
    height: 100%;
  }
</style>
