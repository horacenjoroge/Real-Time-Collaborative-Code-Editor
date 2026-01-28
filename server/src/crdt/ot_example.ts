import { insert, applyOperation, transform, type Operation } from './ot';

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

// Allow running via ts-node/tsx: `tsx src/crdt/ot_example.ts`
if (require.main === module) {
  runBasicOtExample();
}

