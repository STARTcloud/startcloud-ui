const LEAST_BUCKETS = 3;

const isPoint = point => point[1] !== null && point[1] !== undefined;

const triangleArea = (a, b, c) =>
  Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]));

const averageOf = (points, start, end) => {
  const count = Math.max(1, end - start);
  let x = 0;
  let y = 0;
  for (let index = start; index < end; index += 1) {
    x += points[index][0];
    y += points[index][1];
  }
  return [x / count, y / count];
};

const pickOf = (points, anchor, start, end, average) => {
  let largest = -1;
  let pick = start;
  for (let index = start; index < end; index += 1) {
    const area = triangleArea(anchor, points[index], average);
    if (area > largest) {
      largest = area;
      pick = index;
    }
  }
  return pick;
};

/**
 * The Largest-Triangle-Three-Buckets downsample of a line without
 * holes: `threshold` points at most, the first and the last kept, and
 * of every bucket between them the point that spans the largest
 * triangle with the point kept before it and the average of the bucket
 * after it. The points come back unchanged while they are no more than
 * the threshold or the threshold is under three.
 *
 * @param {Array<Array<number>>} points - `[[ms, value]]`, oldest first, no null values
 * @param {number} threshold - The most points to keep
 * @returns {Array<Array<number>>} The points kept
 */
export const lttb = (points, threshold) => {
  const count = points.length;
  if (threshold >= count || threshold < LEAST_BUCKETS) {
    return points;
  }
  const every = (count - 2) / (threshold - 2);
  const kept = [points[0]];
  let anchor = 0;
  for (let bucket = 0; bucket < threshold - 2; bucket += 1) {
    const nextStart = Math.floor((bucket + 1) * every) + 1;
    const nextEnd = Math.min(Math.floor((bucket + 2) * every) + 1, count);
    const average = averageOf(points, nextStart, nextEnd);
    const start = Math.floor(bucket * every) + 1;
    const end = Math.min(Math.floor((bucket + 1) * every) + 1, count - 1);
    anchor = pickOf(points, points[anchor], start, end, average);
    kept.push(points[anchor]);
  }
  kept.push(points[count - 1]);
  return kept;
};

const segmentsOf = points => {
  const segments = [];
  let segment = [];
  points.forEach(point => {
    if (isPoint(point)) {
      segment.push(point);
      return;
    }
    if (segment.length > 0) {
      segments.push(segment);
      segment = [];
    }
  });
  if (segment.length > 0) {
    segments.push(segment);
  }
  return segments;
};

/**
 * A line thinned to `threshold` points across the plot, its holes kept:
 * the line is cut at every null point, each piece is thinned by `lttb`
 * to its share of the threshold, three points at least, and the pieces
 * are joined again with one null point between two of them, at the
 * midpoint of the hole, so the break draws where it was.
 *
 * @param {Array<Array<number>>} points - `[[ms, value|null]]`, oldest first
 * @param {number} threshold - The most points to draw, the pixels across the plot
 * @returns {Array<Array<number|null>>} The points drawn
 */
export const thinned = (points, threshold) => {
  const segments = segmentsOf(points);
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (total === 0) {
    return [];
  }
  return segments.flatMap((segment, index) => {
    const budget = Math.max(LEAST_BUCKETS, Math.round((threshold * segment.length) / total));
    const piece = lttb(segment, budget);
    if (index === 0) {
      return piece;
    }
    const before = segments[index - 1];
    const hole = (before[before.length - 1][0] + segment[0][0]) / 2;
    return [[hole, null], ...piece];
  });
};
