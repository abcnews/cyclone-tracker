<script lang="ts">
  import type { CycloneGeoJson, FixType, CategoryType, SymbolType } from '../../Loader/types';

  // Runes: accept the full geojson object
  const { data }: { data: CycloneGeoJson } = $props();

  // Extract unique warning and watch areas with deduplication, excluding Likely Tracks Area

  // Use $derived for reactive data
  const uniqueWarnings = $derived.by(() => {
    const areas = new Map<string, { areatype: string; extent: string }>();

    for (const feature of data.features) {
      if (
        feature.properties.areatype &&
        feature.properties.areatype !== 'Likely Tracks Area' &&
        feature.properties.extent
      ) {
        const key = `${feature.properties.areatype}-${feature.properties.extent}`;
        if (!areas.has(key)) {
          areas.set(key, {
            areatype: feature.properties.areatype,
            extent: feature.properties.extent
          });
        }
      }
    }

    return Array.from(areas.values());
  });

  // Get forecast points for intensity changes
  const forecastPoints = $derived(data.features.filter(f => f.geometry.type === 'Point' && f.properties.fixtime));

  // Find the point with the highest category number from forecast points
  const highestCategory = $derived.by(() => {
    return forecastPoints.reduce((highest, current) =>
      (current.properties.category ?? 0) > (highest.properties.category ?? 0) ? current : highest
    );
  });

  $effect(() => console.log({ highestCategory }));

  // Format time for display
  function formatTime(timeString: string) {
    return new Date(timeString).toLocaleString('en-AU', {
      timeZone: 'Australia/Brisbane',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }
</script>

<div class="geo-map-alt-text sr-only">
  <p>
    A map shows the path of {data.properties.title}
    {#if !data.properties.isArchived}
      which is currently a {data.properties.currentFix.properties.symbol === 'Low'
        ? 'tropical low'
        : `category ${data.properties.currentFix.properties.category} system`}
    {/if}.
  </p>

  {#if uniqueWarnings.length > 0}
    {#each uniqueWarnings as area}
      <p>{area.areatype}: {area.extent}</p>
    {/each}
  {/if}

  <p>
    At the peak this {highestCategory.properties.fixtype === 'Observed' ? 'was' : 'will be'}
    a {highestCategory.properties.symbol === 'Low'
      ? 'tropical low'
      : `category ${highestCategory.properties.category} system`} (at {formatTime(highestCategory.properties.fixtime)}).
  </p>

  {#if forecastPoints.length > 0}
    <p>Track map intensity changes:</p>
    <ol>
      {#each forecastPoints as point}
        <li>
          {point.properties.fixtype}
          {formatTime(point.properties.fixtime!)}:
          {#if point.properties.symbol === 'Low'}
            Tropical Low
          {:else}
            Category {point.properties.category}
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style lang="scss">
  .sr-only {
    clip: rect(1px, 1px, 1px, 1px);
    clip-path: inset(50%);
    height: 1px;
    width: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
  }
</style>
