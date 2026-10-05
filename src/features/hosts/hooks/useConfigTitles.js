import { useEffect, useState } from 'react';

import { hostConfig } from '../api/agentSettings';

const NONE = { id: '', titles: {} };

const titleOf = (config, name) =>
  config.schema(name).then(
    schema => schema.title || name,
    () => name
  );

/**
 * The titles of a host's configuration files, one per name of the row's
 * `capabilities.config`: the schema's root `title` once
 * `GET config/<name>/schema` answers through the host's adapter, the one
 * read the configuration page and the sidebar tree share, and the name
 * when the schema carries none or the read fails; empty until every
 * schema of the host answered, and empty for any other host.
 *
 * @param {Object} status - The payload from `probeStatus`
 * @param {string} id - The registry id, or `self` on an agent role
 * @param {Array<string>} names - The names from `configNamesOf`
 * @returns {Object<string, string>} The title held per name
 */
export const useConfigTitles = (status, id, names) => {
  const [held, setHeld] = useState(NONE);

  useEffect(() => {
    if (names.length === 0) {
      return undefined;
    }
    let live = true;
    const config = hostConfig(status, id);
    Promise.all(names.map(name => titleOf(config, name))).then(titles => {
      if (live) {
        setHeld({
          id,
          titles: Object.fromEntries(names.map((name, index) => [name, titles[index]])),
        });
      }
    });
    return () => {
      live = false;
    };
  }, [status, id, names]);

  return held.id === id ? held.titles : NONE.titles;
};
