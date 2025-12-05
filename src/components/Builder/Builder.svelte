<script lang="ts">
  import { BuilderStyleRoot, BuilderFrame } from '@abcnews/components-builder';
  import cities from '../Map/cities.topo.json';
  import { onMount } from 'svelte';
  const defaultParams = new URLSearchParams(location.hash.slice(1));
  const citiesArray = cities.features.reduce((obj, feature) => {
    const name = `${feature.properties.name} - pop ${feature.properties.population} #${feature.properties.id}`;
    obj[name] = {
      id: feature.properties.id,
      name
    };
    return obj;
  }, {});
  let selectedCyclone = $state(defaultParams.get('cyclone') || '');
  let checkDate = $state();
  let cycloneList = $state([]);
  let hash = $state(window.location.hash.slice(1));
  let selectedCities = $state(
    defaultParams.get('cities')
      ? (defaultParams.get('cities') || '')
          .split('x')
          .map(id => Object.values(citiesArray).find(city => city.id === Number(id))?.name)
          .filter(Boolean)
      : []
  );
  let isOverridingLabels = $state(false);
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
    if (isOverridingLabels) {
      params.append('cities', selectedCities.map(key => citiesArray[key].id).join('x'));
    }
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
    <legend>Labels</legend>
    <label>
      <input type="checkbox" bind:checked={isOverridingLabels} />
      Override labels
    </label>
    {#if isOverridingLabels}
      <div>
        <label>
          Pick a city
          <br />
          <input
            list="cities-list"
            onchange={e => {
              const selectedCity = citiesArray[e.target.value];
              if (selectedCity) {
                selectedCities = Array.from(new Set([...selectedCities, e.target.value]));
                e.target.value = '';
                e.target.focus();
              }
            }}
          />
        </label>
      </div>
      {#if selectedCities.length > 0}
        <div>Click to remove:</div>
        <ul>
          {#each selectedCities as selectedCity}
            <li>
              <button
                onclick={e => {
                  e.preventDefault();
                  selectedCities = selectedCities.filter(city => selectedCity !== city);
                }}
              >
                {selectedCity} [x]
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <datalist id="cities-list">
        {#each Object.keys(citiesArray) as city}
          <option value={city}>{city}</option>
        {/each}
      </datalist>
    {/if}
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
