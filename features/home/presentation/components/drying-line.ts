/**
 * How a drying line hangs. A light rope tied at both ends and loaded with
 * weights takes the shape of the bending-moment diagram of the same loads on a
 * simply supported beam (y = M(x) / H): straight runs between the clips, a
 * bend at each one, deepest where the heavy pieces hang. The rope's own
 * weight rounds it off a little.
 *
 * Positions use the pieces' nominal (sm+) widths. The result is read back per
 * piece as heights at its edges and clips, so other widths keep a continuous
 * rope, just stretched sideways. The rope is tied `reach` before the first
 * piece and after the last (off screen, like hooks on the far walls), so it
 * enters already sagging and the end pieces don't hang on a steep slope; it
 * is drawn for `lead` px beyond the end pieces, which is always far enough
 * to run off the edge of the scroller.
 */
export type LinePiece = {
  /** Nominal width in px. */
  width: number;
  /** Where the clips bite, as fractions of the width. */
  clips: number[];
  /** Relative weight, shared between its clips. */
  weight: number;
};

export type HungPiece = {
  /** Rope drop (px below the anchors) at the piece's left edge, each clip, and its right edge. */
  left: number;
  clips: number[];
  right: number;
  /** Drop halfway to the next piece (or halfway along the lead, after the last). */
  after: number;
};

export function hangOnLine(pieces: LinePiece[], { gap, reach, lead, sag }: { gap: number; reach: number; lead: number; sag: number }) {
  const loads: { x: number; p: number }[] = [];
  const starts: number[] = [];
  let x = reach;
  pieces.forEach((piece, index) => {
    starts.push(x);
    piece.clips.forEach((clip) => loads.push({ x: x + clip * piece.width, p: piece.weight / piece.clips.length }));
    x += piece.width + (index < pieces.length - 1 ? gap : 0);
  });
  const last = x;
  const span = last + reach;
  // The rope itself is light (15% of what hangs on it), so it visibly dips at each clip.
  const q = (0.15 * loads.reduce((sum, load) => sum + load.p, 0)) / span;
  const reaction = loads.reduce((sum, load) => sum + (load.p * (span - load.x)) / span, 0) + (q * span) / 2;
  const moment = (at: number) => reaction * at - loads.reduce((sum, load) => sum + (at > load.x ? load.p * (at - load.x) : 0), 0) - (q * at * at) / 2;

  const raw = pieces.map((piece, index) => {
    const start = starts[index];
    const end = start + piece.width;
    const next = index < pieces.length - 1 ? end + gap / 2 : end + lead / 2;
    return {
      left: moment(start),
      clips: piece.clips.map((clip) => moment(start + clip * piece.width)),
      right: moment(end),
      after: moment(next),
    };
  });
  const start = moment(reach - lead);
  const before = moment(reach - lead / 2);
  const end = moment(last + lead);
  const deepest = Math.max(before, ...raw.flatMap((piece) => [piece.left, piece.right, piece.after, ...piece.clips]));
  const drop = (m: number) => Math.round(((sag * m) / deepest) * 10) / 10;

  return {
    /** Drop `lead` px before the first piece, halfway from there to it, and `lead` px after the last. */
    start: drop(start),
    before: drop(before),
    end: drop(end),
    pieces: raw.map<HungPiece>((piece) => ({
      left: drop(piece.left),
      clips: piece.clips.map(drop),
      right: drop(piece.right),
      after: drop(piece.after),
    })),
  };
}
