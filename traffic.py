from datetime import datetime
import networkx as nx

MORNING_PEAK = (8, 10)
EVENING_PEAK = (17, 20)

def get_traffic_multiplier():
    current_hour = datetime.now().hour
    if MORNING_PEAK[0] <= current_hour < MORNING_PEAK[1]:
        return 2.5
    elif EVENING_PEAK[0] <= current_hour < EVENING_PEAK[1]:
        return 3.0
    elif 22 <= current_hour or current_hour < 6:
        return 0.8
    else:
        return 1.0

def apply_traffic_weights(G):
    multiplier = get_traffic_multiplier()
    G_traffic = G.copy()
    for u, v, data in G_traffic.edges(data=True):
        original_weight = data.get("weight", 1)
        G_traffic[u][v]["weight"] = original_weight * multiplier
        G_traffic[u][v]["traffic_multiplier"] = multiplier
    return G_traffic, multiplier

def get_traffic_status():
    hour = datetime.now().hour
    multiplier = get_traffic_multiplier()
    if multiplier >= 2.5:
        status = "Heavy Traffic"
        color = "#f85149"
    elif multiplier >= 1.5:
        status = "Moderate Traffic"
        color = "#d29922"
    else:
        status = "Clear Roads"
        color = "#3fb950"
    return {
        "status": status,
        "multiplier": multiplier,
        "color": color,
        "current_hour": hour,
        "is_peak": multiplier > 1.5
    }

def calculate_eta(remaining_steps, total_steps, route_distance_km=None):
    multiplier = get_traffic_multiplier()
    avg_speed_kmh = 30
    if route_distance_km and total_steps > 0:
        remaining_distance = route_distance_km * (remaining_steps / total_steps)
    else:
        remaining_distance = remaining_steps * 0.15
    eta_minutes = (remaining_distance / avg_speed_kmh) * 60 * multiplier
    return max(1, round(eta_minutes))