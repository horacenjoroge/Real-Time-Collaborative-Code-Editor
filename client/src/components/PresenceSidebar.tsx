import type { PresenceUser } from '../websocket/types';

interface PresenceSidebarProps {
  users: PresenceUser[];
  currentUserId?: string;
}

/**
 * Sidebar showing who's online in the document (avatars and names).
 */
export function PresenceSidebar({ users, currentUserId }: PresenceSidebarProps) {
  return (
    <div className="w-48 flex-shrink-0 flex flex-col bg-gray-800 border-r border-gray-700">
      <div className="px-3 py-2 border-b border-gray-700 text-xs font-medium text-gray-400 uppercase tracking-wider">
        Online ({users.length})
      </div>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1">
        {users.map((user) => {
          const isMe = currentUserId && user.id === currentUserId;
          const initial = (user.name || user.id).slice(0, 1).toUpperCase();
          return (
            <li
              key={user.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-200"
              title={`${user.name} (${user.id})`}
            >
              <span
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                style={{ backgroundColor: user.color }}
              >
                {initial}
              </span>
              <span className="truncate flex-1 min-w-0">
                {user.name || 'Anonymous'}
                {isMe && (
                  <span className="ml-1 text-gray-500 text-xs">(you)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
