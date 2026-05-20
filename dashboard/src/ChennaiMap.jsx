import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

const API = "http://127.0.0.1:8000";

const CHENNAI_LOCATIONS = {
  "Central Station": [13.0827, 80.2707],
  "Marina Beach":    [13.0500, 80.2824],
  "Anna Nagar":      [13.0850, 80.2101],
  "Tambaram":        [12.9249, 80.1000],
  "T Nagar":         [13.0418, 80.2341],
  "Adyar":           [13.0012, 80.2565],
  "Velachery":       [12.9815, 80.2209],
  "Chromepet":       [12.9516, 80.1462],
  "Porur":           [13.0367, 80.1567],
  "Sholinganallur":  [12.9010, 80.2279],
};

const LOCATION_TO_NODE = {
  "Central Station": "J",
  "Marina Beach":    "H",
  "Anna Nagar":      "I",
  "Tambaram":        "A",
  "T Nagar":         "G",
  "Adyar":           "F",
  "Velachery":       "C",
  "Chromepet":       "B",
  "Porur":           "E",
  "Sholinganallur":  "D",
};

const NODE_TO_COORDS = {
  A: [12.9249, 80.1000],
  B: [12.9516, 80.1462],
  C: [12.9815, 80.2209],
  D: [12.9010, 80.2279],
  E: [13.0367, 80.1567],
  F: [13.0012, 80.2565],
  G: [13.0418, 80.2341],
  H: [13.0500, 80.2824],
  I: [13.0850, 80.2101],
  J: [13.0827, 80.2707],
  K: [13.0600, 80.2500],
  L: [13.0700, 80.2800],
  M: [13.1200, 80.2100],
  N: [13.1100, 80.2600],
  O: [13.1300, 80.2900],
  P: [13.1500, 80.3000],
};

const STATUS_COLORS = {
  idle: "#3fb950",
  moving_to_pickup: "#f0883e",
  delivering: "#388bfd",
};

const agentNames = ["Ravi", "Priya", "Arjun", "Sneha", "Kiran"];
const locationNames = Object.keys(CHENNAI_LOCATIONS);

function makeIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2px solid #0d1117;box-shadow:0 0 0 1px ${color}"></div>`,
    iconSize: [13, 13],
    iconAnchor: [6, 6],
  });
}

function locationIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:8px;height:8px;border-radius:50%;background:#30363d;border:1px solid #8b949e"></div>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

export default function ChennaiMap({ agents, orders, onOrderPlaced }) {
  const [form, setForm] = useState({
    customer_name: "Teja",
    pickup_location: "Central Station",
    delivery_location: "Marina Beach",
  });
  const [message, setMessage] = useState("");
  const [agentPositions, setAgentPositions] = useState({});

  useEffect(() => {
    const positions = {};
    agents.forEach(agent => {
      const coords = NODE_TO_COORDS[agent.current_location];
      if (coords) positions[agent.name] = coords;
    });
    if (Object.keys(positions).length > 0) {
      setAgentPositions(positions);
    } else {
      const initial = {};
      agentNames.forEach((name, i) => {
        initial[name] = CHENNAI_LOCATIONS[locationNames[i % locationNames.length]];
      });
      setAgentPositions(initial);
    }
  }, [agents]);

  const placeOrder = async () => {
    try {
      const res = await axios.post(`${API}/orders`, {
        customer_name: form.customer_name,
        pickup_location: LOCATION_TO_NODE[form.pickup_location],
        delivery_location: LOCATION_TO_NODE[form.delivery_location],
      });
      setMessage(`✅ Assigned to ${res.data.assigned_agent?.name || "No agent"}!`);
      onOrderPlaced();
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Failed to place order!");
    }
  };

  const recentOrders = [...orders].reverse().slice(0, 15);

  const inputStyle = {
    width: "100%", padding: "7px 10px", borderRadius: "6px",
    backgroundColor: "#21262d", color: "#e6edf3",
    border: "1px solid #30363d", fontSize: "12px",
    fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 88px)", borderRadius: "8px", overflow: "hidden", border: "1px solid #30363d" }}>

      <div style={{ flex: 1, position: "relative" }}>
        <div style={{
          position: "absolute", top: "10px", left: "50px", zIndex: 1000,
          background: "rgba(13,17,23,0.85)", color: "#8b949e",
          padding: "4px 12px", borderRadius: "6px", fontSize: "11px",
          display: "flex", gap: "16px", alignItems: "center",
          border: "1px solid #30363d",
        }}>
          <span style={{ color: "#e6edf3", fontWeight: "600" }}>CHENNAI LIVE MAP</span>
          <span>68,533 intersections · Real-time GPS</span>
        </div>

        <MapContainer center={[13.0827, 80.2707]} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {Object.entries(CHENNAI_LOCATIONS).map(([name, coords]) => (
            <Marker key={name} position={coords} icon={locationIcon()}>
              <Popup>{name}</Popup>
            </Marker>
          ))}
          {agents.map(agent => {
            const pos = agentPositions[agent.name];
            if (!pos) return null;
            const color = STATUS_COLORS[agent.status] || "#e6edf3";
            return (
              <Marker key={agent.id} position={pos} icon={makeIcon(color)}>
                <Popup>{agent.name} — {agent.current_location} — {agent.status}</Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div style={{
          position: "absolute", bottom: "16px", left: "10px", zIndex: 1000,
          background: "rgba(13,17,23,0.85)", padding: "6px 12px",
          borderRadius: "6px", fontSize: "11px", display: "flex", gap: "12px",
          border: "1px solid #30363d",
        }}>
          <span style={{ color: "#3fb950" }}>● Idle</span>
          <span style={{ color: "#f0883e" }}>● To pickup</span>
          <span style={{ color: "#388bfd" }}>● Delivering</span>
        </div>
      </div>

      <div style={{ width: "270px", backgroundColor: "#161b22", borderLeft: "1px solid #30363d", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #21262d" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#8b949e", letterSpacing: "0.5px", marginBottom: "10px" }}>PLACE CHENNAI ORDER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} style={inputStyle} />
            <select value={form.pickup_location} onChange={e => setForm({ ...form, pickup_location: e.target.value })} style={inputStyle}>
              {locationNames.map(n => <option key={n} value={n}>Pickup: {n}</option>)}
            </select>
            <select value={form.delivery_location} onChange={e => setForm({ ...form, delivery_location: e.target.value })} style={inputStyle}>
              {locationNames.map(n => <option key={n} value={n}>Deliver to: {n}</option>)}
            </select>
            <button onClick={placeOrder} style={{
              padding: "8px", backgroundColor: "#238636", color: "#fff",
              border: "1px solid #2ea043", borderRadius: "6px", cursor: "pointer",
              fontSize: "13px", fontWeight: "600", fontFamily: "inherit",
            }}>Place Order</button>
            {message && <div style={{ color: "#3fb950", fontSize: "11px" }}>{message}</div>}
          </div>
        </div>

        <div style={{ padding: "16px", borderBottom: "1px solid #21262d" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#8b949e", letterSpacing: "0.5px", marginBottom: "10px" }}>AGENTS</div>
          {agentNames.map(name => {
            const agent = agents.find(a => a.name === name);
            const color = agent ? (STATUS_COLORS[agent.status] || "#e6edf3") : "#3fb950";
            return (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #21262d", fontSize: "12px" }}>
                <span style={{ color: "#e6edf3" }}><span style={{ color }}>●</span> {name}</span>
                <span style={{ color: "#8b949e", fontSize: "11px" }}>{agent?.status || "idle"}</span>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "16px", flex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#8b949e", letterSpacing: "0.5px", marginBottom: "10px" }}>RECENT ORDERS</div>
          {recentOrders.length === 0
            ? <div style={{ color: "#8b949e", fontSize: "12px" }}>No orders yet</div>
            : recentOrders.map(order => (
              <div key={order.id} style={{ padding: "7px 0", borderBottom: "1px solid #21262d" }}>
                <div style={{ color: "#e6edf3", fontSize: "12px" }}>{order.customer_name} · {order.pickup_location} → {order.delivery_location}</div>
                <span style={{
                  fontSize: "11px", padding: "1px 8px", borderRadius: "12px",
                  display: "inline-block", marginTop: "3px",
                  backgroundColor: order.status === "delivered" ? "rgba(63,185,80,0.15)" : order.status === "assigned" ? "rgba(56,139,253,0.15)" : "rgba(139,148,158,0.15)",
                  color: order.status === "delivered" ? "#3fb950" : order.status === "assigned" ? "#388bfd" : "#8b949e",
                }}>{order.status}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}