<script lang="ts">
  import { onMount } from 'svelte';
  import GML from './loader';
  import App from '../App/App.svelte';
  import { xml } from 'd3-request';
  import type { CycloneGeoJson } from './types';

  let { cyclone = '', sample = false } = $props();
  let cycloneData = $state<CycloneGeoJson>();
  let error = $state('');

  $effect(() => {
    console.log('loading cyclone');
    if (!cyclone) {
      return;
    }
    let url = `https://abcnewsdata.sgp1.digitaloceanspaces.com/cyclonetracker-svc/${sample ? 'examples' : 'tcdata'}/${encodeURIComponent(cyclone)}`;
    // Sample data should only be used in the builder. index.ts hard-codes false
    // for prod.
    if (sample) {
      url = '/examples/' + encodeURIComponent(cyclone);
    }
    xml(url, (err, xml) => {
      if (err) {
        error = 'Could not load cyclone data';
        console.error(err);
        return;
      }
      cycloneData = GML.parse(xml);
      document.title = `${cycloneData.properties.distName} map`;
    });
  });

  onMount(() => {
    try {
      const frame = Array.from(window.parent.document.querySelectorAll('iframe'))?.find(
        iframe => (iframe.src = String(window.location))
      );
      if (frame) {
        frame.style.colorScheme = 'light';
      }
    } catch (e) {
      console.warn(
        'Cyclone tracker: Could not set dark mode on iframe. This only works in prod/same domain.',
        e.message
      );
    }
  });
</script>

{#if !cyclone}
  <div class="info loader"><div class="pill">No cyclone specified</div></div>
{/if}
{#if cyclone && !cycloneData}
  <div class="info loader">
    <div class="pill">
      {error || 'Loading…'}
    </div>
  </div>
{/if}

{#if cycloneData}
  <App data={cycloneData} />
{/if}

<style lang="scss">
  :global {
    html,
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
      color: black;
      font-family: ABCSans, Helvetica, Arial, sans-serif;
    }
    * {
      box-sizing: border-box;
    }
  }

  .info.loader {
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pill {
    padding: 20px 40px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 1rem;
    backdrop-filter: blur(10px);
    color: black;
  }
</style>
