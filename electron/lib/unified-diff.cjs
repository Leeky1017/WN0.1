function splitLines(text) {
  const raw = typeof text === 'string' ? text : ''
  if (!raw) return []
  const lines = raw.split('\n')
  if (raw.endsWith('\n') && lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

function myersDiff(a, b) {
  const n = a.length
  const m = b.length
  const max = n + m
  const offset = max

  let v = new Array(2 * max + 1).fill(-1)
  v[offset + 1] = 0

  const trace = []

  for (let d = 0; d <= max; d += 1) {
    trace.push(v.slice())

    for (let k = -d; k <= d; k += 2) {
      const kIndex = offset + k

      let x
      const down = k === -d || (k !== d && v[kIndex - 1] < v[kIndex + 1])
      if (down) {
        x = v[kIndex + 1]
      } else {
        x = v[kIndex - 1] + 1
      }

      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x += 1
        y += 1
      }

      v[kIndex] = x

      if (x >= n && y >= m) {
        return backtrack(trace, a, b, offset)
      }
    }
  }

  return []
}

function backtrack(trace, a, b, offset) {
  let x = a.length
  let y = b.length
  const edits = []

  for (let d = trace.length - 1; d > 0; d -= 1) {
    const v = trace[d]
    const k = x - y

    const kIndex = offset + k
    const down = k === -d || (k !== d && v[kIndex - 1] < v[kIndex + 1])
    const prevK = down ? k + 1 : k - 1

    const prevX = v[offset + prevK]
    const prevY = prevX - prevK

    while (x > prevX && y > prevY) {
      edits.push({ op: 'equal', value: a[x - 1] })
      x -= 1
      y -= 1
    }

    if (x === prevX) {
      edits.push({ op: 'insert', value: b[y - 1] })
      y -= 1
    } else {
      edits.push({ op: 'delete', value: a[x - 1] })
      x -= 1
    }
  }

  while (x > 0 && y > 0) {
    edits.push({ op: 'equal', value: a[x - 1] })
    x -= 1
    y -= 1
  }

  while (x > 0) {
    edits.push({ op: 'delete', value: a[x - 1] })
    x -= 1
  }

  while (y > 0) {
    edits.push({ op: 'insert', value: b[y - 1] })
    y -= 1
  }

  edits.reverse()
  return edits
}

function formatHunkRange(start, count) {
  if (count === 0) return `${start},0`
  if (count === 1) return String(start)
  return `${start},${count}`
}

function unifiedDiff(fromText, toText) {
  const a = splitLines(fromText)
  const b = splitLines(toText)

  const edits = myersDiff(a, b)

  const fromStart = a.length === 0 ? 0 : 1
  const toStart = b.length === 0 ? 0 : 1

  const header = [
    '--- a',
    '+++ b',
    `@@ -${formatHunkRange(fromStart, a.length)} +${formatHunkRange(toStart, b.length)} @@`,
  ]

  const body = edits.map((edit) => {
    const prefix = edit.op === 'insert' ? '+' : edit.op === 'delete' ? '-' : ' '
    return `${prefix}${edit.value}`
  })

  return [...header, ...body].join('\n') + '\n'
}

module.exports = { unifiedDiff }

