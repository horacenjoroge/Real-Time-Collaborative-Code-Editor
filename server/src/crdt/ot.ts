export type InsertOp = { type: 'insert'; position: number; char: string };
export type DeleteOp = { type: 'delete'; position: number; length: number };
export type RetainOp = { type: 'retain'; length: number };

export type Operation = InsertOp | DeleteOp | RetainOp;

/**
 * Apply an operation to a string document.
 * This is primarily for testing / demonstration.
 */
export function applyOperation(doc: string, op: Operation): string {
  switch (op.type) {
    case 'insert': {
      const { position, char } = op;
      return doc.slice(0, position) + char + doc.slice(position);
    }
    case 'delete': {
      const { position, length } = op;
      return doc.slice(0, position) + doc.slice(position + length);
    }
    case 'retain': {
      // Retain is a no-op on its own (used when composing/translating sequences)
      return doc;
    }
  }
}

/**
 * Apply a sequence of operations to a document.
 */
export function applyOperations(doc: string, ops: Operation[]): string {
  return ops.reduce((current, op) => applyOperation(current, op), doc);
}

// Convenience constructors
export function insert(position: number, char: string): InsertOp {
  return { type: 'insert', position, char };
}

export function del(position: number, length: number): DeleteOp {
  return { type: 'delete', position, length };
}

export function retain(length: number): RetainOp {
  return { type: 'retain', length };
}

/**
 * Compose two operations that are defined on the same base document to
 * produce a single equivalent operation.
 *
 * For this task we keep things intentionally simple and support only
 * single-step operations (one insert/delete/retain each).
 */
export function compose(op1: Operation, op2: Operation): Operation {
  // If op2 is retain, it has no effect
  if (op2.type === 'retain') {
    return op1;
  }

  // If op1 is retain, the result is just op2
  if (op1.type === 'retain') {
    return op2;
  }

  // Compose insert after insert
  if (op1.type === 'insert' && op2.type === 'insert') {
    const len2 = op2.char.length;
    if (op2.position <= op1.position) {
      // Insert before or at same index shifts first insert
      return insert(op1.position + len2, op1.char);
    }
    return op1;
  }

  // Compose delete after insert
  if (op1.type === 'insert' && op2.type === 'delete') {
    if (op2.position <= op1.position) {
      // Deleting before the insert shifts its position left
      const removed = Math.min(op2.length, op1.position - op2.position);
      return insert(op1.position - removed, op1.char);
    }
    // Deleting after the insert does not affect its index
    return op1;
  }

  // Compose insert after delete
  if (op1.type === 'delete' && op2.type === 'insert') {
    const len2 = op2.char.length;
    if (op2.position <= op1.position) {
      // Insert before the deletion shifts delete right
      return del(op1.position + len2, op1.length);
    }
    return op1;
  }

  // Compose delete after delete
  if (op1.type === 'delete' && op2.type === 'delete') {
    // Simple model: if ranges overlap, extend the deletion;
    // otherwise keep op1 as-is (a full OT impl would merge precisely).
    const start1 = op1.position;
    const end1 = op1.position + op1.length;
    const start2 = op2.position;
    const end2 = op2.position + op2.length;

    const newStart = Math.min(start1, start2);
    const newEnd = Math.max(end1, end2);
    return del(newStart, newEnd - newStart);
  }

  return op2;
}

/**
 * Transform opA against opB so it can be applied after opB.
 * This is the core of OT.
 *
 * For this basic task we support:
 * - insert vs insert
 * - insert vs delete
 * - delete vs insert
 * - delete vs delete
 * - retain vs anything (no-op)
 */
export function transform(opA: Operation, opB: Operation): Operation {
  // Retain is identity in this simple model
  if (opA.type === 'retain') return opA;
  if (opB.type === 'retain') return opA;

  // A: insert, B: insert
  if (opA.type === 'insert' && opB.type === 'insert') {
    const lenB = opB.char.length;
    if (opA.position > opB.position || opA.position === opB.position) {
      // If B inserts before or at the same position, A shifts right
      return insert(opA.position + lenB, opA.char);
    }
    return opA;
  }

  // A: insert, B: delete
  if (opA.type === 'insert' && opB.type === 'delete') {
    const { position: pA } = opA;
    const { position: pB, length: lenB } = opB;

    if (pA <= pB) {
      // Insert before the deleted range: unaffected
      return opA;
    }
    if (pA > pB + lenB) {
      // Insert after the deleted range: shift left by lenB
      return insert(pA - lenB, opA.char);
    }
    // Insert inside deleted range: collapse to insert at pB
    return insert(pB, opA.char);
  }

  // A: delete, B: insert
  if (opA.type === 'delete' && opB.type === 'insert') {
    const { position: pA, length: lenA } = opA;
    const { position: pB, char } = opB;
    const lenB = char.length;

    if (pB >= pA + lenA) {
      // Insert after deleted range: unaffected
      return opA;
    }
    if (pB <= pA) {
      // Insert before or at start: shift delete right
      return del(pA + lenB, lenA);
    }
    // Insert inside delete range: effectively increases delete length
    return del(pA, lenA + lenB);
  }

  // A: delete, B: delete
  if (opA.type === 'delete' && opB.type === 'delete') {
    const { position: pA, length: lenA } = opA;
    const { position: pB, length: lenB } = opB;

    if (pA >= pB + lenB) {
      // B deletes before A: shift A left by lenB
      return del(pA - lenB, lenA);
    }
    if (pA + lenA <= pB) {
      // A deletes entirely before B: unaffected
      return opA;
    }

    // Overlapping deletions – shrink A to only delete what's left
    const start = Math.min(pA, pB);
    const endA = pA + lenA;
    const endB = pB + lenB;
    const overlapStart = Math.max(pA, pB);
    const overlapEnd = Math.min(endA, endB);
    const overlap = Math.max(0, overlapEnd - overlapStart);
    const newLen = lenA - overlap;

    if (newLen <= 0) {
      // Fully covered by B, nothing left to delete
      return retain(0);
    }

    if (pA < pB) {
      // A starts before B, keep start the same but shorten
      return del(pA, newLen);
    }

    // A starts inside B's deletion, shift start left to B.start
    return del(start, newLen);
  }

  return opA;
}

/**
 * Transform a sequence of operations `ops` so that it can be applied
 * after another sequence of operations `against`.
 *
 * This is a very small helper that simply applies the single-op
 * `transform` function pairwise in order. For our current diff model
 * (retain/delete/insert in short sequences) this is sufficient.
 */
export function transformOperations(ops: Operation[], against: Operation[]): Operation[] {
  // Start with a shallow copy so we don't mutate the original array.
  let result = ops.map((op) => ({ ...op }));

  for (const opB of against) {
    result = result.map((opA) => transform(opA, opB));
  }

  return result;
}


