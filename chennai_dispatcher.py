from models import DeliveryAgent, Order, AgentStatus, OrderStatus
from chennai_graph import load_chennai_graph, find_shortest_path_chennai, get_nearest_node
import uuid
from datetime import datetime

CHENNAI_LOCATIONS = {
    "Central Station": (13.0827, 80.2707),
    "Marina Beach":    (13.0500, 80.2824),
    "Anna Nagar":      (13.0850, 80.2101),
    "Tambaram":        (12.9249, 80.1000),
    "T Nagar":         (13.0418, 80.2341),
    "Adyar":           (13.0012, 80.2565),
    "Velachery":       (12.9815, 80.2209),
    "Chromepet":       (12.9516, 80.1462),
    "Porur":           (13.0367, 80.1567),
    "Sholinganallur":  (12.9010, 80.2279),
}

chennai_G = None
chennai_agents = {}
chennai_orders = {}
agent_gps = {}
agent_routes = {}

def init_chennai():
    global chennai_G, chennai_agents
    chennai_G = load_chennai_graph()
    agent_list = [
        DeliveryAgent(id=str(uuid.uuid4()), name="Ravi",  current_location="Central Station"),
        DeliveryAgent(id=str(uuid.uuid4()), name="Priya", current_location="Anna Nagar"),
        DeliveryAgent(id=str(uuid.uuid4()), name="Arjun", current_location="T Nagar"),
        DeliveryAgent(id=str(uuid.uuid4()), name="Sneha", current_location="Adyar"),
        DeliveryAgent(id=str(uuid.uuid4()), name="Kiran", current_location="Tambaram"),
    ]
    chennai_agents = {a.id: a for a in agent_list}
    for agent in agent_list:
        lat, lng = CHENNAI_LOCATIONS[agent.current_location]
        agent_gps[agent.id] = {"lat": lat, "lng": lng}
    print(f"Chennai dispatcher ready with {len(chennai_agents)} agents!")

def get_route_coords(from_loc, to_loc):
    """Get real road route coordinates using Dijkstra on OSM graph"""
    lat1, lng1 = CHENNAI_LOCATIONS[from_loc]
    lat2, lng2 = CHENNAI_LOCATIONS[to_loc]
    origin_node = get_nearest_node(chennai_G, lat1, lng1)
    dest_node = get_nearest_node(chennai_G, lat2, lng2)
    path, distance = find_shortest_path_chennai(chennai_G, origin_node, dest_node)
    if not path:
        # fallback to linear interpolation
        steps = 20
        return [
            {"lat": lat1 + (lat2-lat1)*i/steps, "lng": lng1 + (lng2-lng1)*i/steps}
            for i in range(steps+1)
        ], 0
    coords = []
    for node in path:
        node_data = chennai_G.nodes[node]
        coords.append({"lat": node_data["y"], "lng": node_data["x"]})
    return coords, distance

def haversine(lat1, lng1, lat2, lng2):
    import math
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def find_nearest_chennai_agent(pickup_location):
    pickup_lat, pickup_lng = CHENNAI_LOCATIONS[pickup_location]
    nearest_agent, min_distance = None, float("inf")
    for agent in chennai_agents.values():
        if agent.status == AgentStatus.IDLE:
            agent_lat, agent_lng = CHENNAI_LOCATIONS.get(
                agent.current_location, (pickup_lat, pickup_lng))
            distance = haversine(agent_lat, agent_lng, pickup_lat, pickup_lng)
            if distance < min_distance:
                min_distance = distance
                nearest_agent = agent
    return nearest_agent, min_distance

def assign_chennai_order(customer_name, pickup_location, delivery_location):
    order = Order(
        id=str(uuid.uuid4()),
        customer_name=customer_name,
        pickup_location=pickup_location,
        delivery_location=delivery_location
    )
    chennai_orders[order.id] = order
    agent, _ = find_nearest_chennai_agent(pickup_location)
    if not agent:
        return order, None, 0

    to_pickup, _ = get_route_coords(agent.current_location, pickup_location)
    to_delivery, dist = get_route_coords(pickup_location, delivery_location)
    full_route = to_pickup + to_delivery[1:]

    agent_routes[agent.id] = {
        "route": full_route,
        "index": 0,
        "pickup_index": len(to_pickup) - 1,
        "order_id": order.id
    }
    agent.status = AgentStatus.MOVING_TO_PICKUP
    agent.current_order_id = order.id
    agent.route = [r["lat"] for r in full_route]
    agent.route_index = 0
    order.status = OrderStatus.ASSIGNED
    order.assigned_agent_id = agent.id
    from traffic import calculate_eta
    route_len = len(full_route)
    initial_eta = calculate_eta(route_len, route_len)
    order_dict = order.to_dict()
    order_dict["eta_minutes"] = initial_eta
    return order, agent, dist if dist != float("inf") else 0, initial_eta

def move_chennai_agents_step():
    updates = []
    for agent in chennai_agents.values():
        if agent.status not in [AgentStatus.MOVING_TO_PICKUP, AgentStatus.DELIVERING]:
            continue
        route_info = agent_routes.get(agent.id)
        if not route_info:
            continue
        route = route_info["route"]
        idx = route_info["index"]
        # Move multiple steps at once for smoother movement on long OSM routes
        steps_per_tick = max(1, len(route) // 50)
        idx = min(idx + steps_per_tick, len(route) - 1)
        route_info["index"] = idx
        pos = route[idx]
        agent_gps[agent.id] = {"lat": pos["lat"], "lng": pos["lng"]}
        order = chennai_orders.get(route_info["order_id"])
        if idx >= route_info["pickup_index"] and agent.status == AgentStatus.MOVING_TO_PICKUP and order:
            agent.status = AgentStatus.DELIVERING
            order.status = OrderStatus.PICKED_UP
        if idx >= len(route) - 1 and order:
            agent.status = AgentStatus.IDLE
            agent.current_order_id = None
            agent.total_deliveries += 1
            agent.current_location = order.delivery_location
            order.status = OrderStatus.DELIVERED
            order.delivered_at = datetime.now().isoformat()
            agent_routes.pop(agent.id, None)
        
        from traffic import calculate_eta
        remaining = len(route) - idx
        total = len(route)
        eta = calculate_eta(remaining, total)

        updates.append({
        "agent": agent.to_dict(),
        "lat": pos["lat"],
        "lng": pos["lng"],
        "order": order.to_dict() if order else None,
        "eta_minutes": eta
    })
    return updates

def get_all_chennai_agents():
    result = []
    for agent in chennai_agents.values():
        d = agent.to_dict()
        gps = agent_gps.get(agent.id, {})
        d["lat"] = gps.get("lat", 0)
        d["lng"] = gps.get("lng", 0)
        result.append(d)
    return result

def get_all_chennai_orders():
    return [o.to_dict() for o in chennai_orders.values()]

def get_chennai_locations():
    return list(CHENNAI_LOCATIONS.keys())

def get_location_coords():
    return {name: {"lat": lat, "lng": lng} for name, (lat, lng) in CHENNAI_LOCATIONS.items()}