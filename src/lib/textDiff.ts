export type DiffOp = 'equal' | 'insert' | 'delete';

export type DiffSegment = {
  op: DiffOp;
  text: string;
};

type DiffEdit = {
  op: DiffOp;
  token: string;
};

function myersEdits(a: readonly string[], b: readonly string[]): DiffEdit[] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const offset = max;

  const v: number[] = Array.from({ length: 2 * max + 1 }, () => -1);
  v[offset + 1] = 0;

  const trace: number[][] = [];

  for (let d = 0; d <= max; d += 1) {
    trace.push(v.slice());

    for (let k = -d; k <= d; k += 2) {
      const kIndex = offset + k;
      const down = k === -d || (k !== d && v[kIndex - 1] < v[kIndex + 1]);

      let x = down ? v[kIndex + 1] : v[kIndex - 1] + 1;
      let y = x - k;

      while (x < n && y < m && a[x] === b[y]) {
        x += 1;
        y += 1;
      }

      v[kIndex] = x;

      if (x >= n && y >= m) {
        return backtrack(trace, a, b, offset);
      }
    }
  }

  return [];
}

function backtrack(trace: readonly number[][], a: readonly string[], b: readonly string[], offset: number): DiffEdit[] {
  let x = a.length;
  let y = b.length;
  const edits: DiffEdit[] = [];

  for (let d = trace.length - 1; d > 0; d -= 1) {
    const v = trace[d];
    const k = x - y;
    const kIndex = offset + k;

    const down = k === -d || (k !== d && v[kIndex - 1] < v[kIndex + 1]);
    const prevK = down ? k + 1 : k - 1;

    const prevX = v[offset + prevK];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ op: 'equal', token: a[x - 1] });
      x -= 1;
      y -= 1;
    }

    if (x === prevX) {
      edits.push({ op: 'insert', token: b[y - 1] });
      y -= 1;
    } else {
      edits.push({ op: 'delete', token: a[x - 1] });
      x -= 1;
    }
  }

  while (x > 0 && y > 0) {
    edits.push({ op: 'equal', token: a[x - 1] });
    x -= 1;
    y -= 1;
  }

  while (x > 0) {
    edits.push({ op: 'delete', token: a[x - 1] });
    x -= 1;
  }

  while (y > 0) {
    edits.push({ op: 'insert', token: b[y - 1] });
    y -= 1;
  }

  edits.reverse();
  return edits;
}

function coalesce(edits: readonly DiffEdit[]): DiffSegment[] {
  const segments: DiffSegment[] = [];

  for (const edit of edits) {
    const last = segments.length > 0 ? segments[segments.length - 1] : null;
    if (last && last.op === edit.op) {
      last.text += edit.token;
      continue;
    }
    segments.push({ op: edit.op, text: edit.token });
  }

  return segments.filter((seg) => seg.text.length > 0);
}

export function diffChars(before: string, after: string): DiffSegment[] {
  const a = Array.from(typeof before === 'string' ? before : '');
  const b = Array.from(typeof after === 'string' ? after : '');
  return coalesce(myersEdits(a, b));
}
