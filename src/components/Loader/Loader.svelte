<script lang="ts">
  import { onMount } from 'svelte';
  import GML from './loader';
  import App from '../App/App.svelte';
  import { xml } from 'd3-request';

  const params = new URLSearchParams(location.search);
  let cyclone = $state(params.get('cyclone'));
  let sample = $state(params.get('sample'));
  let cycloneData = $state();

  onMount(() => {
    if (!cyclone) {
      return;
    }
    let url = `https://abcnewsdata.sgp1.digitaloceanspaces.com/cyclonetracker-svc/tcdata/${encodeURIComponent(cyclone)}`;
    if (sample === 'true') {
      url = '/examples/' + encodeURIComponent(cyclone);
    }
    xml(url, (err, xml) => {
      cycloneData = GML.parse(xml);
    });
  });
</script>

{#if !cyclone}
  <div class="info">No cyclone specified</div>
{/if}
{#if cyclone && !cycloneData}
  <div class="info loader">Loading…</div>
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
      background: #fff;
      color: black;
      font-family: ABCSans, Helvetica, Arial, sans-serif;
    }
  }

  .info.loader {
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
