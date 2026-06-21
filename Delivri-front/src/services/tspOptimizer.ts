type Coordinates = [number, number];

const INF = Number.POSITIVE_INFINITY;

/** ממיר null/undefined במטריצת OSRM ל-Infinity */
export const sanitizeMatrix = (matrix: (number | null)[][]): number[][] =>
  matrix.map((row) => row.map((v) => (v == null || v < 0 ? INF : v)));

/** Nearest Neighbor — מתחיל מנקודה 0 (מיקום המשתמש) */
export const nearestNeighborTour = (durations: number[][], start = 0): number[] => {
  const n = durations.length;
  if (n <= 1) return [start];

  const tour = [start];
  const used = new Set([start]);

  while (tour.length < n) {
    const last = tour[tour.length - 1];
    let best = -1;
    let bestTime = INF;

    for (let j = 0; j < n; j++) {
      if (!used.has(j) && durations[last][j] < bestTime) {
        bestTime = durations[last][j];
        best = j;
      }
    }

    if (best < 0) break;
    used.add(best);
    tour.push(best);
  }

  return tour;
};

const tourDuration = (tour: number[], durations: number[][]): number => {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) {
    const d = durations[tour[i]][tour[i + 1]];
    if (!Number.isFinite(d)) return INF;
    total += d;
  }
  return total;
};

/** 2-opt — משפר סדר תחנות (שומר על אינדקס 0 קבוע) */
export const twoOptImprove = (tour: number[], durations: number[][]): number[] => {
  if (tour.length <= 3) return tour;

  const best = [...tour];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 2; i++) {
      for (let j = i + 1; j < best.length - 1; j++) {
        const a = best[i - 1];
        const b = best[i];
        const c = best[j];
        const d = best[j + 1];

        const before = durations[a][b] + durations[c][d];
        const after = durations[a][c] + durations[b][d];

        if (after + 0.5 < before) {
          best.splice(i, j - i + 1, ...best.slice(i, j + 1).reverse());
          improved = true;
        }
      }
    }
  }

  return best;
};

export const optimizeTourOrder = (durations: number[][], start = 0): number[] => {
  const matrix = sanitizeMatrix(durations);
  const nn = nearestNeighborTour(matrix, start);
  return twoOptImprove(nn, matrix);
};

export const reorderCoords = (coords: Coordinates[], order: number[]): Coordinates[] =>
  order.map((i) => coords[i]).filter(Boolean);

export const estimateTourSeconds = (order: number[], durations: number[][]): number =>
  tourDuration(order, sanitizeMatrix(durations));
