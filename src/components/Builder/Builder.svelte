<script lang="ts">
  import { BuilderStyleRoot, BuilderFrame } from '@abcnews/components-builder';
  import { onMount } from 'svelte';
  const defaultParams = new URLSearchParams(location.hash.slice(1));

  let selectedCyclone = $state(defaultParams.get('cyclone') || '');
  let checkDate = $state();
  let cycloneList = $state([]);
  let hash = $state(window.location.hash.slice(1));
  onMount(async () => {
    addEventListener('hashchange', () => {
      hash = window.location.hash.slice(1);
    });

    const res = await fetch('https://abcnewsdata.sgp1.digitaloceanspaces.com/cyclonetracker-svc/cyclones.json');
    const data = await res.json();
    const cyclones = data.cyclones.map(({ path, ...rest }) => ({
      path: path.replace('dist/', ''),
      ...rest
    }));
    checkDate = data.updated;
    if (cyclones.length === 1 && !selectedCyclone) {
      selectedCyclone = cyclones[0].path;
    }
    cycloneList = cyclones;
  });

  $effect(() => {
    const params = new URLSearchParams();
    params.append('cyclone', selectedCyclone);
    window.location.hash = params.toString();
  });
</script>

{#snippet Viz()}
  <iframe class="iframe" src={`../?${hash}`} title="Preview"></iframe>
{/snippet}

{#snippet Sidebar()}
  <fieldset>
    <legend>Cyclone</legend>
    <small>
      Data last checked <br />
      {new Date(checkDate).toString().replace(/\(.*/, '')}
    </small>
    <hr />
    <label>
      Cyclone:
      <select bind:value={selectedCyclone}>
        {#each cycloneList as cyclone}
          <option value={cyclone.path}>
            {cyclone.name} - {cyclone.path}
          </option>
        {/each}
        {#if !cycloneList.length}
          <option value="" disabled={true}>No cyclones current</option>
          <option value="AU202526_02U.gml">EXAMPLE: ex-TC Fina</option>
        {/if}
      </select>
    </label>
  </fieldset>
  <fieldset>
    <legend>Iframe url</legend>
    <input
      readonly
      value={`https://${location.host}${location.pathname.replace('/builder', '/')}?${hash}&abcnewsembedheight=600`}
    />
  </fieldset>
{/snippet}

<BuilderStyleRoot>
  <BuilderFrame {Viz} {Sidebar} />
</BuilderStyleRoot>

<style lang="scss">
  .iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
</style>
