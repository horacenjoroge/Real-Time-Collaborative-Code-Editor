// Lightweight OT helpers for the client.
// Mirrors the Operation type used on the server.

export type InsertOp = { type: 'insert'; position: number; char: string };
export type DeleteOp = { type: 'delete'; position: number; length: number };
export type RetainOp = { type: 'retain'; length: number };

export type Operation = InsertOp | DeleteOp | RetainOp;

export function insert(position: number, char: string): InsertOp {
  return { type: 'insert', position, char };
}

export function del(position: number, length: number): DeleteOp {
  return { type: 'delete', position, length };
}

export function retain(length: number): RetainOp {
  return { type: 'retain', length };
}

export function applyOperation(doc: string, op: Operation): string {
  switch (op.type) {
    case 'insert':
      return doc.slice(0, op.position) + op.char + doc.slice(op.position);
    case 'delete':
      return doc.slice(0, op.position) + doc.slice(op.position + op.length);
    case 'retain':
      return doc;
  }
}

export function applyOperations(doc: string, ops: Operation[]): string {
  return ops.reduce((current, op) => applyOperation(current, op), doc);
}

/**
 * Transform a sequence of operations `ops` so it can be applied after
 * another sequence of operations `against`.
 *
 * This mirrors the helper on the server and is intentionally simple:
 * we repeatedly apply the single-op transform logic for each op in
 * `against` to every op in `ops`.
 */
export function transformOperations(ops: Operation[], against: Operation[]): Operation[] {
  // Shallow copy so we don't mutate the input.
  let result = ops.map((op) => ({ ...op }));

  for (const opB of against) {
    result = result.map((opA) => transformSingle(opA, opB));
  }

  return result;
}

// Local copy of the single-op transform logic to keep the client
// independent from the server implementation details.
function transformSingle(opA: Operation, opB: Operation): Operation {
  if (opA.type === 'retain') return opA;
  if (opB.type === 'retain') return opA;

  // A: insert, B: insert
  if (opA.type === 'insert' && opB.type === 'insert') {
    const lenB = opB.char.length;
    if (opA.position > opB.position || opA.position === opB.position) {
      return insert(opA.position + lenB, opA.char);
    }
    return opA;
  }

  // A: insert, B: delete
  if (opA.type === 'insert' && opB.type === 'delete') {
    const { position: pA } = opA;
    const { position: pB, length: lenB } = opB;

    if (pA <= pB) {
      return opA;
    }
    if (pA > pB + lenB) {
      return insert(pA - lenB, opA.char);
    }
    return insert(pB, opA.char);
  }

  // A: delete, B: insert
  if (opA.type === 'delete' && opB.type === 'insert') {
    const { position: pA, length: lenA } = opA;
    const { position: pB, char } = opB;
    const lenB = char.length;

    if (pB >= pA + lenA) {
      return opA;
    }
    if (pB <= pA) {
      return del(pA + lenB, lenA);
    }
    return del(pA, lenA + lenB);
  }

  // A: delete, B: delete
  if (opA.type === 'delete' && opB.type === 'delete') {
    const { position: pA, length: lenA } = opA;
    const { position: pB, length: lenB } = opB;

    if (pA >= pB + lenB) {
      return del(pA - lenB, lenA);
    }
    if (pA + lenA <= pB) {
      return opA;
    }

    const start = Math.min(pA, pB);
    const endA = pA + lenA;
    const endB = pB + lenB;
    const overlapStart = Math.max(pA, pB);
    const overlapEnd = Math.min(endA, endB);
    const overlap = Math.max(0, overlapEnd - overlapStart);
    const newLen = lenA - overlap;

    if (newLen <= 0) {
      return { type: 'retain', length: 0 };
    }

    if (pA < pB) {
      return del(pA, newLen);
    }

    return del(start, newLen);
  }

  return opA;
}

/**
 * Compute a simple diff between oldText and newText and convert it to
 * a sequence of OT operations:
 *   retain(prefix) [, delete] [, insert]
 */
export function diffToOperations(
  oldText: string,
  newText: string
): Operation[] {
  if (oldText === newText) {
    return [];
  }

  let start = 0;
  while (
    start < oldText.length &&
    start < newText.length &&
    oldText[start] === newText[start]
  ) {
    start += 1;
  }

  let endOld = oldText.length;
  let endNew = newText.length;
  while (
    endOld > start &&
    endNew > start &&
    oldText[endOld - 1] === newText[endNew - 1]
  ) {
    endOld -= 1;
    endNew -= 1;
  }

  const deletedLen = endOld - start;
  const insertedText = newText.slice(start, endNew);

  const ops: Operation[] = [];

  if (start > 0) {
    ops.push(retain(start));
  }

  if (deletedLen > 0) {
    ops.push(del(start, deletedLen));
  }

  if (insertedText.length > 0) {
    ops.push(insert(start, insertedText));
  }

  return ops;
}

