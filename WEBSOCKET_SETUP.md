# WebSocket Connection Setup

## Overview

This document describes the WebSocket implementation for the Real-Time Collaborative Code Editor.

## Server-Side Implementation

### Features

1. **Socket.io Server**
   - Integrated with Express HTTP server
   - CORS configured for frontend origin
   - Supports both WebSocket and polling transports

2. **Authentication**
   - JWT token-based authentication (optional for now, allows anonymous)
   - Token can be passed via `auth.token` or `Authorization` header
   - Anonymous connections allowed for development

3. **Room Management**
   - Each document = one room
   - Users can join/leave document rooms
   - Automatic cleanup of empty rooms (after 60s delay)
   - Tracks all users in each room

4. **Heartbeat/Ping-Pong**
   - Server sends ping every 30 seconds
   - Client responds with pong
   - Users removed if no ping for 60 seconds
   - Prevents dead connections from lingering

5. **Connection Handling**
   - Tracks user connections
   - Handles disconnections gracefully
   - Notifies other users when someone joins/leaves

### Server Events

**Client → Server:**
- `join-document` - Join a document room
- `leave-document` - Leave current document room
- `ping` - Heartbeat ping
- `pong` - Heartbeat pong response
- `message` - Generic message (for testing)
- `broadcast` - Broadcast message to room

**Server → Client:**
- `connected` - Connection confirmed
- `joined-document` - Successfully joined document
- `user-joined` - Another user joined the room
- `user-left` - A user left the room
- `left-document` - Successfully left document
- `broadcast-received` - Received broadcast message
- `message-response` - Response to message
- `pong` - Heartbeat pong
- `error` - Error occurred

## Client-Side Implementation

### Features

1. **WebSocket Hook (`useWebSocket`)**
   - Automatic connection on mount
   - Manual connect/disconnect methods
   - Connection status tracking
   - Auto-reconnect with exponential backoff

2. **Reconnection Logic**
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
   - Maximum 10 reconnection attempts
   - Manual reconnect option
   - Prevents reconnection on manual disconnect

3. **Connection Status**
   - `connected` - Fully connected
   - `connecting` - Initial connection attempt
   - `reconnecting` - Attempting to reconnect
   - `error` - Connection error occurred

4. **UI Components**
   - **ConnectionStatus** - Small status indicator in toolbar
   - **DisconnectionBanner** - Full-width banner when disconnected/reconnecting
   - Shows reconnect attempts and error messages
   - Manual reconnect button

### Client Events

The client automatically:
- Joins document room when file is loaded and socket connects
- Leaves document room when switching files
- Handles user join/leave notifications
- Maintains connection status

## Testing

### Manual Testing Steps

1. **Start Server:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Start Client:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. **Test Connection:**
   - Open browser console
   - Check for "✅ WebSocket connected" message
   - Verify connection status indicator shows "Connected"

4. **Test Disconnection:**
   - Stop the server
   - Verify disconnection banner appears
   - Check console for reconnection attempts
   - Restart server and verify auto-reconnect

5. **Test Reconnection:**
   - Disconnect network or stop server
   - Wait for reconnection attempts
   - Verify exponential backoff timing
   - Reconnect network/server and verify connection

6. **Test Room Joining:**
   - Open multiple browser tabs
   - Load same document in each
   - Check console for "User joined" messages
   - Verify all users see each other

## Configuration

### Environment Variables

**Server:**
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Allowed origin (default: http://localhost:5173)
- `JWT_SECRET` - Secret for JWT tokens

**Client:**
- `VITE_WS_URL` - WebSocket server URL (default: http://localhost:3001)

## Deep End Questions

### What if user disconnects mid-edit?

**Current Implementation:**
- Changes are saved to localStorage automatically
- When user reconnects, they can continue editing
- No data loss due to local persistence

**Future Improvements:**
- Implement operational transformation or CRDT
- Queue changes during disconnection
- Sync changes on reconnection
- Show conflict resolution UI if needed

### How long do you wait before removing user from room?

**Current Implementation:**
- **Ping Interval:** 30 seconds
- **Disconnect Timeout:** 60 seconds (2 missed pings)
- **Empty Room Cleanup:** 60 seconds after last user leaves

**Rationale:**
- 30s ping interval balances responsiveness vs. server load
- 60s timeout accounts for temporary network issues
- 60s room cleanup prevents memory leaks while allowing quick rejoin

**Future Considerations:**
- Make timeouts configurable
- Add "away" status for inactive users
- Implement presence indicators (typing, active, away)

## Architecture Decisions

1. **Socket.io over raw WebSocket:**
   - Better browser compatibility
   - Built-in reconnection
   - Room management features
   - Easier to implement

2. **Room-based architecture:**
   - Each document = one room
   - Scalable to many documents
   - Easy to track users per document
   - Natural isolation

3. **Exponential backoff:**
   - Reduces server load during outages
   - Better user experience
   - Industry standard approach

4. **LocalStorage persistence:**
   - Works offline
   - No data loss on disconnect
   - Fast local access
   - Sync with server on reconnect
