export const readReleaseNotes = version => version.release_notes ?? null;

export const readDeprecated = version => Boolean(version.deprecated);

export const readDeprecationReason = version => version.deprecation_reason ?? null;
