/**
 * The `folded` and `onFold` pair one section card takes, read from the
 * page's `useFolds` under one key.
 *
 * @param {{ folded: Function, toggle: Function }} folds - The page's folds
 * @param {string} key - The section's key
 * @returns {{ folded: boolean, onFold: Function }} The card's fold props
 */
export const foldOf = (folds, key) => ({
  folded: folds.folded(key),
  onFold: () => folds.toggle(key),
});
