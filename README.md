# Real-Time Collaborative Code Editor

A real-time collaborative code editor similar to Google Docs, but designed specifically for code editing. Built with modern web technologies including WebSockets, CRDT (Conflict-free Replicated Data Types), and Monaco Editor.

## 🚀 Features

- **Real-time Collaboration**: Multiple users can edit code simultaneously
- **Monaco Editor**: Powered by VS Code's editor component
- **CRDT-based Synchronization**: Conflict-free data structures for seamless collaboration
- **WebSocket Communication**: Low-latency real-time updates
- **Redis Pub/Sub**: Efficient message broadcasting
- **PostgreSQL**: Persistent document storage

## 📋 Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- Git

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express**
- **TypeScript** for type safety
- **WebSocket** (ws) for real-time communication
- **Redis** for Pub/Sub and session storage
- **PostgreSQL** for data persistence
- **Docker Compose** for containerized services

### Frontend
- **React 18** with **TypeScript**
- **Monaco Editor** (VS Code's editor)
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Socket.io Client** for WebSocket communication

## 📁 Project Structure

```
collab-code-editor/
├── server/                 # Backend server
│   ├── src/
│   │   ├── websocket/     # WebSocket server implementation
│   │   ├── document/      # Document management
│   │   ├── auth/          # Authentication & authorization
│   │   ├── crdt/          # CRDT implementation
│   │   └── index.ts       # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── editor/        # Monaco editor integration
│   │   ├── websocket/     # WebSocket client
│   │   └── main.tsx       # App entry point
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml     # Docker services configuration
```

## 🚦 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Real-Time Collaborative Code Editor"
```

### 2. Environment Setup

#### Backend Environment

Copy the example environment file and configure it:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your configuration:

```env
NODE_ENV=development
PORT=3001
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=collab_editor
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGIN=http://localhost:5173
```

#### Frontend Environment

Create `client/.env` if needed:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### 3. Install Dependencies

#### Backend

```bash
cd server
npm install
```

#### Frontend

```bash
cd client
npm install
```

### 4. Start Services with Docker Compose

Start PostgreSQL and Redis:

```bash
docker-compose up -d postgres redis
```

Or start all services (including the server):

```bash
docker-compose up
```

### 5. Run Development Servers

#### Backend (Terminal 1)

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

#### Frontend (Terminal 2)

```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173`

## 📝 Available Scripts

### Backend (`server/`)

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check without building

### Frontend (`client/`)

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check without building

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up

# Start services in background
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up --build

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

## 🧪 Development

### Code Quality

Both server and client are configured with:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Run linting and formatting before committing:

```bash
# Server
cd server
npm run lint:fix
npm run format

# Client
cd client
npm run lint:fix
npm run format
```

### Database Migrations

Database migrations will be set up in later phases.

## 📦 Production Build

### Backend

```bash
cd server
npm run build
npm start
```

### Frontend

```bash
cd client
npm run build
```

The production build will be in `client/dist/`

## 🔐 Security Notes

- Change `JWT_SECRET` in production
- Use strong database passwords
- Configure CORS properly for production
- Enable HTTPS in production
- Review and update dependencies regularly

## 🗺️ Roadmap

### Phase 1: Foundation & Basic Editor (Current)
- ✅ Project setup
- ⏳ Basic Monaco Editor integration
- ⏳ WebSocket connection setup

### Phase 2: Real-time Synchronization
- CRDT implementation
- Document state management
- Operational transformation

### Phase 3: User Features
- User authentication
- Document sharing
- Cursor positions
- User presence

### Phase 4: Advanced Features
- Syntax highlighting
- Code completion
- Multi-file support
- Version history

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

- Monaco Editor by Microsoft
- VS Code team for inspiration
