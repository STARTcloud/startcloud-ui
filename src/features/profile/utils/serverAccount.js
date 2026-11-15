const POINTERS = { '/new_password': '/password', '/confirm_password': '/confirm' };

/**
 * The body `POST /api/auth/change-password` takes from the password
 * section's form: the current password, the new one and its confirmation.
 *
 * @param {{ current_password?: string, password: string }} body - The section's body
 * @returns {{ current_password: string, new_password: string, confirm_password: string }} The wire body
 */
export const passwordBodyOf = body => ({
  current_password: body.current_password || '',
  new_password: body.password,
  confirm_password: body.password,
});

/**
 * A refusal of `POST /api/auth/change-password` with its pointers moved
 * onto the section's fields, `/new_password` to `/password` and
 * `/confirm_password` to `/confirm`, so a `422` paints where the person
 * typed; any other pointer and every other member stay as they are.
 *
 * @param {Object} error - The `ApiError`
 * @returns {Object} The same error, its `fieldErrors` re-pointed
 */
export const passwordRefusalOf = error => {
  if (!Array.isArray(error?.fieldErrors)) {
    return error;
  }
  return Object.assign(error, {
    fieldErrors: error.fieldErrors.map(entry => ({
      ...entry,
      pointer: POINTERS[entry.pointer] || entry.pointer,
    })),
  });
};
