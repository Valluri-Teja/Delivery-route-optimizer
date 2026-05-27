from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dispatcher import assign_order, reassign_order, get_all_agents, get_all_orders, agents, orders
from simulation import connected_clients, move_agents
from city_graph import create_city_graph
from chennai_dispatcher import (
    assign_chennai_order, get_all_chennai_agents,
    get_all_chennai_orders, get_chennai_locations, get_location_coords, init_chennai
)
from traffic import get_traffic_status
import asyncio

app = FastAPI(title="Delivery Route Optimizer")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

G, intersections = create_city_graph()

@app.on_event("startup")
async def startup():
    init_chennai()
    asyncio.create_task(move_agents())
    print("Delivery simulation started!")

class OrderRequest(BaseModel):
    customer_name: str
    pickup_location: str
    delivery_location: str

@app.post("/orders")
def create_order(request: OrderRequest):
    order, agent = assign_order(request.customer_name, request.pickup_location, request.delivery_location)
    return {"order": order.to_dict(), "assigned_agent": agent.to_dict() if agent else None}

@app.get("/agents")
def get_agents():
    return get_all_agents()

@app.get("/orders")
def get_orders():
    return get_all_orders()

@app.get("/graph")
def get_graph():
    nodes = [{"id": n, "x": d["x"], "y": d["y"]} for n, d in G.nodes(data=True)]
    edges = [{"from": u, "to": v, "weight": d["weight"]} for u, v, d in G.edges(data=True)]
    return {"nodes": nodes, "edges": edges}

@app.post("/chennai/orders")
def create_chennai_order(request: OrderRequest):
    order, agent, distance = assign_chennai_order(
        request.customer_name, request.pickup_location, request.delivery_location)
    return {"order": order.to_dict(), "assigned_agent": agent.to_dict() if agent else None,
            "distance_km": round(distance/1000, 2) if distance and distance != float("inf") else 0 }

@app.get("/chennai/agents")
def get_chennai_agents():
    return get_all_chennai_agents()

@app.get("/chennai/orders")
def get_chennai_orders():
    return get_all_chennai_orders()

@app.get("/chennai/locations")
def get_locations():
    return get_chennai_locations()

@app.get("/chennai/location-coords")
def get_coords():
    return get_location_coords()

@app.get("/traffic")
def get_traffic():
    return get_traffic_status()

@app.get("/analytics")
def get_analytics():
    all_orders = list(orders.values())
    all_agents = list(agents.values())
    total = len(all_orders)
    delivered = len([o for o in all_orders if o.status.value == "delivered"])
    pending = len([o for o in all_orders if o.status.value == "pending"])
    assigned = len([o for o in all_orders if o.status.value == "assigned"])
    agent_stats = [{"name": a.name, "deliveries": a.total_deliveries,
                    "status": a.status.value, "utilization": 0 if a.status.value == "idle" else 100}
                   for a in all_agents]
    pickup_counts = {}
    for o in all_orders:
        pickup_counts[o.pickup_location] = pickup_counts.get(o.pickup_location, 0) + 1
    return {
        "total_orders": total, "delivered": delivered, "pending": pending, "assigned": assigned,
        "delivery_rate": round(delivered / total * 100, 1) if total > 0 else 0,
        "agent_stats": agent_stats,
        "pickup_counts": [{"location": k, "orders": v} for k, v in pickup_counts.items()]
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        await websocket.send_json({"type": "initial_state",
                                   "agents": get_all_agents(), "orders": get_all_orders()})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.discard(websocket)

@app.get("/")
def root():
    return {"message": "Delivery Route Optimizer is running!"}