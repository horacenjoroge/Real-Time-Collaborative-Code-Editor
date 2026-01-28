import { ConnectionStatus as Status } from '../websocket/types';

interface ConnectionStatusProps {
  status: Status;
  onReconnect?: () => void;
}

export function ConnectionStatus({ status, onReconnect }: ConnectionStatusProps) {
  if (status.connected && !status.reconnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>Connected</span>
      </div>
    );
  }

  if (status.reconnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>
          Reconnecting... ({status.reconnectAttempts}/10)
        </span>
        {onReconnect && (
          <button
            onClick={onReconnect}
            className="ml-2 px-2 py-0.5 bg-yellow-700 hover:bg-yellow-800 rounded text-xs"
          >
            Retry Now
          </button>
        )}
      </div>
    );
  }

  if (status.connecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded">
      <div className="w-2 h-2 bg-white rounded-full" />
      <span>Disconnected</span>
      {onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-2 px-2 py-0.5 bg-red-700 hover:bg-red-800 rounded text-xs"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
