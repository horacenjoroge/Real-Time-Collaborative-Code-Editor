/**
 * Utility functions for testing WebSocket connection
 */

export function testWebSocketConnection(
  emit: (event: string, data: unknown) => void,
  on: (event: string, handler: (data: unknown) => void) => void
) {
  console.log('Testing WebSocket connection...');

  // Send a test message
  emit('message', {
    type: 'test',
    payload: { message: 'Hello from client!', timestamp: Date.now() },
  });

  // Listen for response
  on('message-response', (data) => {
    console.log('✅ Received message response:', data);
  });

  // Test broadcast
  emit('broadcast', {
    type: 'test-broadcast',
    payload: { message: 'This is a broadcast test' },
  });

  on('broadcast-received', (data) => {
    console.log('✅ Received broadcast:', data);
  });
}
