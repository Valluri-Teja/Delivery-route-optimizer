# 🚴 Real-Time Delivery Route Optimizer

Live API: http://3.108.42.154:8001  
Frontend: https://delivery-route-optimizer-tan.vercel.app

## Tech Stack
- **Backend**: Python, FastAPI, WebSockets, NetworkX, Dijkstra
- **Frontend**: React, Vite, Leaflet, Recharts
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Infrastructure**: Docker, AWS EC2, GitHub Actions CI/CD

## Features
- Real-time agent movement via WebSockets
- Dijkstra routing on 4x4 grid + Chennai OSM map
- Multi-order batching per agent (up to 3 orders)
- Traffic-aware routing with time-based multipliers
- Fleet analytics dashboard with Recharts
- Auto-deploy on every push via GitHub Actions

## Run Locally
```bash
# Backend
docker-compose up --build

# Frontend
cd dashboard && npm run dev
```

## Architecture
- 5 delivery agents with real-time GPS tracking
- WebSocket broadcasts agent position every 2 seconds
- Chennai map with 68,533 real intersections
- PostgreSQL persists all orders and agent states