import { insert, applyOperation, transform, transformOperations, type Operation } from './ot';

function assertEqual(label: string, a: string, b: string) {
  if (a !== b) {
    // eslint-disable-next-line no-console
    console.error(`[FAIL] ${label}: "${a}" !== "${b}"`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[OK] ${label}: "${a}" === "${b}"`);
  }
}

/**
 * Basic example from Task 5:
 *
 * Doc: "hello"
 * Client 1: insert(5, "!") -> "hello!"
 * Client 2: insert(0, "Hi ") -> "Hi hello"
 * After transformation -> "Hi hello!"
 */
export function runBasicOtExample() {
  const doc = 'hello';

  // Client 1 operation: append "!"
  const opA = insert(5, '!');

  // Client 2 operation: prepend "Hi "
  const opB = insert(0, 'Hi ');

  // Transform according to OT core:
  // A' is A transformed against B (apply after B)
  const APrime: Operation = transform(opA, opB);
  // B' is B transformed against A (apply after A)
  const BPrime: Operation = transform(opB, opA);

  const docAfterBThenAPrime = applyOperation(applyOperation(doc, opB), APrime);
  const docAfterAThenBPrime = applyOperation(applyOperation(doc, opA), BPrime);

  // Expected final document
  const expected = 'Hi hello!';

  // eslint-disable-next-line no-console
  console.log('Doc + B  ->', applyOperation(doc, opB));
  // eslint-disable-next-line no-console
  console.log('Doc + A  ->', applyOperation(doc, opA));
  // eslint-disable-next-line no-console
  console.log('Doc + B + A\' ->', docAfterBThenAPrime);
  // eslint-disable-next-line no-console
  console.log('Doc + A + B\' ->', docAfterAThenBPrime);

  assertEqual('OT invariant', docAfterBThenAPrime, docAfterAThenBPrime);
  assertEqual('Expected final doc', docAfterBThenAPrime, expected);
}

/**
 * Simple conflict resolution example mirroring the Task 7 scenario:
 *
 * Server at version 10, both clients at base version 10.
 * A: insert(5, "X"), B: insert(7, "Y").
 *
 * We simulate the server receiving A first, then transforming B
 * against A using the transformOperations helper.
 */
export function runConflictResolutionExample() {
  const baseDoc = 'abcdefghij'; // length 10

  const opA = insert(5, 'X');
  const opB = insert(7, 'Y');

  // Server applies A first
  const docAfterA = applyOperation(baseDoc, opA);

  // Server transforms B against A before applying
  const [bPrime] = transformOperations([opB], [opA]);
  const docAfterABPrime = applyOperation(docAfterA, bPrime);

  // For comparison: apply B first, then transform A against B
  const docAfterB = applyOperation(baseDoc, opB);
  const aPrime: Operation = transform(opA, opB);
  const docAfterBAPrime = applyOperation(docAfterB, aPrime);

  assertEqual('Conflict resolution invariant', docAfterABPrime, docAfterBAPrime);
}

/**
 * Stress test: apply a large number of operations and ensure the final
 * state matches the expected deterministic result.
 *
 * This does not hit the database, but it exercises the OT core in a
 * way that is representative of "replaying history".
 */
export function runReplayStressTest() {
  let doc = '';

  const operations: Operation[] = [];

  // Build up a sequence of 1000 simple insert operations that
  // deterministically create a known string.
  for (let i = 0; i < 1000; i++) {
    operations.push(insert(i, 'x'));
  }

  for (const op of operations) {
    doc = applyOperation(doc, op);
  }

  const expected = 'x'.repeat(1000);
  assertEqual('Replay 1000 operations', doc, expected);
}

// Allow running via ts-node/tsx: `tsx src/crdt/ot_example.ts`
if (require.main === module) {
  runBasicOtExample();
  runConflictResolutionExample();
  runReplayStressTest();
}

