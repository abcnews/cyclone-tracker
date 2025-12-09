<script lang="ts">
  import { onMount } from 'svelte';
  import type * as MapLibre from './maplibre-gl.d.ts';

  const MAPLIBRE_URL = 'https://www.abc.net.au/res/sites/news-projects/maplibre/v5.3.0/maplibre-gl.js';
  const MAPLIBRE_CSS_URL = 'https://www.abc.net.au/res/sites/news-projects/maplibre/v5.3.0/maplibre-gl.css';
  const {
    onLoad,
    style
  }: {
    onLoad: ({}: {
      rootNode: HTMLDivElement;
      maplibregl: typeof window.maplibregl;
      style: any;
    }) => void | Promise<void>;
    style: string;
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
    const [loadedStyle] = await Promise.all([
      style && fetch(style).then(res => res.json()),
      importModule(MAPLIBRE_URL),
      loadCss(MAPLIBRE_CSS_URL)
    ]);
    onLoad({ rootNode, maplibregl: window.maplibregl, style: loadedStyle });
  });
</script>

<div class="maplibre" bind:this={rootNode}></div>

<style lang="scss">
  .maplibre {
    width: 100%;
    height: 100%;
  }
</style>
