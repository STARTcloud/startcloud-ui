/**
 * The key one series is kept under in the browser's store of samples,
 * its parts joined by a bar: the host and the series, and for a
 * machine's series the machine between them.
 *
 * @param {...string} parts - The host, the machine where there is one, and the series
 * @returns {string} The key
 */
export const ringKey = (...parts) => parts.join('|');
