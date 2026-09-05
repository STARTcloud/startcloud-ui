export const readReleaseNotes = version => version.releaseNotes ?? version.release_notes ?? null;

export const readDeprecated = version => Boolean(version.deprecated);

export const readDeprecationReason = version =>
  version.deprecationReason ?? version.deprecation_reason ?? null;
