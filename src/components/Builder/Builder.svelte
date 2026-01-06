<script lang="ts">
  import { BuilderStyleRoot, BuilderFrame } from '@abcnews/components-builder';
  import { onMount } from 'svelte';
  import Loader from '../Loader/Loader.svelte';
  const defaultParams = new URLSearchParams(location.hash.slice(1));

  const params = new URLSearchParams(location.search);
  let sample = $state(params.get('sample'));

  let selectedCyclone = $state(defaultParams.get('cyclone') || '');
  let checkDate = $state();
  let cycloneList = $state([]);
  let hash = $state(window.location.hash.slice(1));
  onMount(async () => {
    addEventListener('hashchange', () => {
      hash = window.location.hash.slice(1);
    });

    const res = await fetch(
      `https://abcnewsdata.sgp1.digitaloceanspaces.com/cyclonetracker-svc/${
        sample ? 'examples-index.json' : 'cyclones.json'
      }`
    );
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
  $effect(() => console.log('hash', hash));
</script>

{#snippet Viz()}
  <div class="frame">
    <Loader cyclone={selectedCyclone} sample={!!sample} />
  </div>
{/snippet}

{#snippet Sidebar()}
  <fieldset>
    <legend>Cyclone</legend>
    {#if sample}
      <div>
        <strong>Historical data for evaluation only.</strong>
        Go <a href={String(window.location).replace('sample=true', '')}>back to live data</a>
      </div>
    {/if}
    {#if !sample}
      <small>
        Data last checked <br />
        {new Date(checkDate).toString().replace(/\(.*/, '')}
      </small>
    {/if}
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
      value={sample
        ? 'HISTORICAL DATA DO NOT USE'
        : `https://${location.host}${location.pathname.replace(/\/builder\/?/, '/')}?${hash}&abcnewsembedheight=600`}
    />
  </fieldset>
{/snippet}

<BuilderStyleRoot>
  <BuilderFrame {Viz} {Sidebar} />
</BuilderStyleRoot>

<style lang="scss">
  .frame {
    width: 100%;
    height: 100%;
    border: 0;
    position: relative;
  }
</style>
