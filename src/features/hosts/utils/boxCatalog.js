const organizationOf = box =>
  box?.user?.primaryOrganization?.name ||
  box?.organization?.name ||
  (typeof box?.organization === 'string' ? box.organization : '') ||
  box?.user?.username ||
  box?.owner ||
  '';

const versionNumberOf = version =>
  typeof version === 'string'
    ? version
    : version?.versionNumber || version?.version || version?.name || '';

const architecturesOf = versionRows => [
  ...new Set(
    versionRows.flatMap(version =>
      (Array.isArray(version?.providers) ? version.providers : []).flatMap(provider =>
        (Array.isArray(provider?.architectures) ? provider.architectures : [])
          .map(architecture => architecture?.name)
          .filter(Boolean)
      )
    )
  ),
];

const rowOf = box => {
  const organization = organizationOf(box);
  const boxName = box?.name || '';
  if (!boxName) {
    return null;
  }
  const versionRows = Array.isArray(box.versions) ? box.versions : [];
  return {
    value: organization ? `${organization}/${boxName}` : boxName,
    organization,
    boxName,
    versions: versionRows.map(versionNumberOf).filter(Boolean),
    architectures: architecturesOf(versionRows),
  };
};

/**
 * The rows of the image picker from a registry's catalog, BoxVault's
 * discover answer as the agent relays it, filtered to what the host can
 * install: the bare array of boxes, or the same list under `boxes` or
 * `data`, each box read for its organization, its name, its versions and
 * the architectures its providers list; an entry without a name is
 * skipped.
 *
 * @param {Array|Object} payload - The catalog answer
 * @returns {Array<{ value: string, organization: string, boxName: string, versions: Array<string>, architectures: Array<string> }>} The rows
 */
export const flattenBoxCatalog = payload => {
  const list = Array.isArray(payload)
    ? payload
    : (Array.isArray(payload?.boxes) && payload.boxes) ||
      (Array.isArray(payload?.data) && payload.data);
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(rowOf).filter(Boolean);
};

/**
 * The registry a box is fetched from when the spec names none: the source
 * of `GET templates/sources` marked `default`, else the first, else null.
 *
 * @param {Array<Object>} sources - The sources
 * @returns {Object|null} The default source
 */
export const pickDefaultSource = sources => {
  const list = Array.isArray(sources) ? sources : [];
  return list.find(source => source?.default === true) || list[0] || null;
};
