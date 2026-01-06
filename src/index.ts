import acto from '@abcnews/alternating-case-to-object';
import { whenDOMReady } from '@abcnews/env-utils';
import { getMountValue, selectMounts } from '@abcnews/mount-utils';
import type { Mount } from '@abcnews/mount-utils';
import Loader from './components/Loader/Loader.svelte';
import { mount } from 'svelte';

let appMountEl: Mount;
let appProps;

whenDOMReady.then(async () => {
  [appMountEl] = selectMounts('interactivecyclonetracker');

  if (appMountEl) {
    const params = new URLSearchParams(location.search);
    let cyclone = params.get('cyclone') || undefined;

    mount(Loader, {
      target: appMountEl,
      props: {
        cyclone,
        sample: false
      }
    });
  }

  const [builderMountEl] = selectMounts('interactivecyclonebuilder');

  if (builderMountEl) {
    appProps = acto(getMountValue(builderMountEl));
    const builderModule = await import('./components/Builder/Builder.svelte');

    mount(builderModule.default, {
      target: builderMountEl,
      props: appProps
    });
  }
});

if (process.env.NODE_ENV === 'development') {
  console.debug(`[interactive-cyclone-tracker] public path: ${__webpack_public_path__}`);
}
