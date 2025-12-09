<script lang="ts">
  import { onMount } from 'svelte';
  import GML from './loader';
  import App from '../App/App.svelte';
  import { xml } from 'd3-request';

  const params = new URLSearchParams(location.search);
  let cyclone = $state(params.get('cyclone'));
  let sample = $state(params.get('sample'));
  let cities = $state(params.get('cities')?.split('x').map(Number) || []);
  let cycloneData = $state();

  onMount(() => {
    if (!cyclone) {
      return;
    }
    let url = `https://abcnewsdata.sgp1.digitaloceanspaces.com/cyclonetracker-svc/tcdata/${encodeURIComponent(cyclone)}`;
    if (sample === 'true') {
      url = '/examples/' + encodeURIComponent(cyclone);
    }
    // const url = `/examples/AU202425_29U-2025-04-11-11-04.gml`;
    // Load in a cyclone based on the `cyclone` URL parameter
    xml(url, (err, xml) => {
      cycloneData = GML.parse(xml);
    });
  });
</script>

{#if !cyclone}
  <div class="info">No cyclone specified</div>
{/if}
{#if cyclone && !cycloneData}
  <div class="info loader">Loading</div>
{/if}

{#if cycloneData}
  <App {cities} data={cycloneData} />
{/if}

<style lang="scss">
  :global {
    html,
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  }
</style>
