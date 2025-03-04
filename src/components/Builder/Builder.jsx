import React, { useEffect, useMemo, useState } from 'react';
import styles from './Builder.scss';
import cities from '../Map/cities.topo.json';

export default function Builder() {
  const citiesArray = useMemo(() =>
    cities.features.reduce((obj, feature) => {
      const name = `${feature.properties.name} - pop ${feature.properties.population} #${feature.properties.id}`;
      obj[name] = {
        id: feature.properties.id,
        name
      };
      return obj;
    }, {})
  );
  const defaultParams = new URLSearchParams(location.hash.slice(1));
  const [checkDate, setCheckDate] = useState('');
  const [cycloneList, setCycloneList] = useState(null);
  const [selectedCyclone, setSelectedCyclone] = useState(defaultParams.get('cyclone') || null);
  const [isOverridingLabels, setIsOverridingLabels] = useState(!!defaultParams.get('cities'));
  const [hash, setHash] = useState(window.location.hash.slice(1));
  const [selectedCities, setSelectedCities] = useState(
    defaultParams.get('cities')
      ? defaultParams
          .get('cities')
          .split('x')
          .map(id => Object.values(citiesArray).find(city => city.id === Number(id))?.name)
          .filter(Boolean)
      : []
  );

  useEffect(() => {
    (async () => {
      const res = await fetch('https://www.abc.net.au/dat/news/bom-cyclone-data/cyclones.json');
      const cycloneList = await res.json();
      const cyclones = cycloneList.cyclones.map(({ name, data, path }) => ({
        name,
        data,
        path: path.replace('tcdata/', '')
      }));
      setCheckDate(cycloneList.updated);
      if (cyclones.length === 1 && !selectedCyclone) {
        setSelectedCyclone(cyclones[0].path);
      }
      setCycloneList(cyclones);
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.append('cyclone', selectedCyclone);
    if (isOverridingLabels) {
      params.append('cities', selectedCities.map(key => citiesArray[key].id).join('x'));
    }
    window.location.hash = params.toString();
  }, [selectedCyclone, selectedCities, isOverridingLabels]);

  useEffect(() => {
    addEventListener('hashchange', () => {
      setHash(window.location.hash.slice(1));
    });
  }, []);

  if (!cycloneList) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.containerViz}>
        <iframe className={styles.iframe} src={`../?${hash}`} />
      </div>

      <form className={styles.containerControls}>
        <fieldset>
          <legend>Cyclone</legend>
          <p>Data last checked {String(new Date(checkDate))}</p>
          <label>
            Cyclone:
            <select value={selectedCyclone} onChange={e => setSelectedCyclone(e.target.value)}>
              {cycloneList.map(cyclone => (
                <option value={cyclone.path}>
                  {cyclone.name} - {cyclone.path}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>Labels</legend>
          <label>
            <input
              type="checkbox"
              checked={isOverridingLabels}
              onChange={e => setIsOverridingLabels(e.target.checked)}
            />{' '}
            Override labels
          </label>
          {isOverridingLabels && (
            <>
              <div>
                <label>
                  Pick a city
                  <br />
                  <input
                    list="cities-list"
                    onChange={e => {
                      const selectedCity = citiesArray[e.target.value];
                      if (selectedCity) {
                        setSelectedCities(Array.from(new Set([...selectedCities, e.target.value])));
                        e.target.value = '';
                        e.target.focus();
                      }
                    }}
                  />
                </label>
              </div>
              {selectedCities.length && (
                <>
                  <p>Click to remove:</p>
                  <ul>
                    {selectedCities.map(selectedCity => (
                      <li>
                        <button
                          onClick={e => {
                            e.preventDefault();
                            setSelectedCities(selectedCities.filter(city => selectedCity !== city));
                          }}
                        >
                          {selectedCity} [x]
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <datalist id="cities-list">
                {Object.keys(citiesArray).map(city => (
                  <option value={city}>{city}</option>
                ))}
              </datalist>
            </>
          )}
        </fieldset>
      </form>
    </div>
  );
}
