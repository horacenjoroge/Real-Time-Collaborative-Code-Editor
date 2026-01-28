import { ConnectionStatus } from '../websocket/types';

interface DisconnectionBannerProps {
  status: ConnectionStatus;
  onReconnect?: () => void;
}

export function DisconnectionBanner({
  status,
  onReconnect,
}: DisconnectionBannerProps) {
  // Only show banner when disconnected or reconnecting
  if (status.connected && !status.reconnecting) {
    return null;
  }

  return (
    <div className="bg-yellow-600 text-white px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        <div>
          {status.reconnecting ? (
            <div>
              <p className="font-medium">Reconnecting to server...</p>
              <p className="text-sm text-yellow-100">
                Attempt {status.reconnectAttempts} of 10
                {status.error && ` - ${status.error}`}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium">Disconnected from server</p>
              <p className="text-sm text-yellow-100">
                Your changes are saved locally. Reconnecting automatically...
                {status.error && ` - ${status.error}`}
              </p>
            </div>
          )}
        </div>
      </div>
      {onReconnect && (
        <button
          onClick={onReconnect}
          className="px-4 py-2 bg-yellow-700 hover:bg-yellow-800 rounded font-medium transition-colors"
        >
          Reconnect Now
        </button>
      )}
    </div>
  );
}
