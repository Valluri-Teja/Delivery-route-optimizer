import osmnx as ox
import networkx as nx
import pickle
import os

def load_chennai_graph():
    cache_file = "chennai_graph.pkl"
    if os.path.exists(cache_file):
        print("Loading Chennai graph from cache...")
        with open(cache_file, "rb") as f:
            G = pickle.load(f)
        print(f"Loaded! {len(G.nodes)} intersections, {len(G.edges)} roads")
        return G
    print("Downloading Chennai road network from OpenStreetMap...")
    G = ox.graph_from_place(
        "Chennai, Tamil Nadu, India",
        network_type="drive",
        simplify=True
    )
    with open(cache_file, "wb") as f:
        pickle.dump(G, f)
    print(f"Downloaded! {len(G.nodes)} intersections, {len(G.edges)} roads")
    return G

def find_shortest_path_chennai(G, origin_node, destination_node):
    try:
        path = nx.shortest_path(G, origin_node, destination_node, weight="length")
        length = nx.shortest_path_length(G, origin_node, destination_node, weight="length")
        return path, length
    except:
        return None, float("inf")

def get_nearest_node(G, lat, lng):
    return ox.nearest_nodes(G, lng, lat)