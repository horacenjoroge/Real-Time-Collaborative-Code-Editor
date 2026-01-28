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

