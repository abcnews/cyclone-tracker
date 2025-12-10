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
  <div class="info">No cyclone specified</div>
{/if}
{#if cyclone && !cycloneData}
  <div class="info loader"><div class="pill">Loading…</div></div>
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
