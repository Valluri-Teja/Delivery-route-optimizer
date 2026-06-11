import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

const API = "https://delivery-optimizer.hopto.org";

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

const STATUS_COLORS = {
  idle: "#3fb950",
  moving_to_pickup: "#f0883e",
  delivering: "#388bfd",
};

const agentNames = ["Ravi", "Priya", "Arjun", "Sneha", "Kiran"];
const locationNames = Object.keys(CHENNAI_LOCATIONS);

function makeIcon(color, name) {
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="
          background:${color};
          width:10px;height:10px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 1px 4px rgba(0,0,0,0.5);
        "></div>
        <div style="
          background:rgba(10,12,16,0.85);
          color:${color};
          font-size:8px;font-weight:700;
          padding:1px 4px;border-radius:3px;
          white-space:nowrap;font-family:monospace;
          margin-top:2px;
          border:1px solid ${color}33;
          letter-spacing:0.3px;
        ">${name}</div>
      </div>
    `,
    iconSize: [10, 24],
    iconAnchor: [5, 10],
  });
}

function locationIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:10px;height:10px;border-radius:50%;
        background:#1a73e8;
        border:2px solid rgba(255,255,255,0.8);
        box-shadow:0 1px 4px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

export default function ChennaiMap({ agents, orders, onOrderPlaced, onTrackOrder, isMobile, isTablet }) {
  const [form, setForm] = useState({
    customer_name: "Teja",
    pickup_location: "Central Station",
    delivery_location: "Marina Beach",
  });
  const [message, setMessage] = useState("");
  const [agentPositions, setAgentPositions] = useState({});
  const [localOrders, setLocalOrders] = useState([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const positions = {};
    agents.forEach(agent => {
      if (agent.lat && agent.lng) {
        positions[agent.name] = [agent.lat, agent.lng];
      } else if (CHENNAI_LOCATIONS[agent.current_location]) {
        positions[agent.name] = CHENNAI_LOCATIONS[agent.current_location];
      } else {
        positions[agent.name] = CHENNAI_LOCATIONS["Central Station"];
      }
    });
    if (Object.keys(positions).length === 0) {
      agentNames.forEach((name, i) => {
        positions[name] = CHENNAI_LOCATIONS[locationNames[i % locationNames.length]];
      });
    }
    setAgentPositions(positions);
  }, [agents]);

  useEffect(() => {
    if (orders.length > 0) setLocalOrders(orders);
  }, [orders]);

  const placeOrder = async () => {
    try {
      const res = await axios.post(`${API}/chennai/orders`, {
        customer_name: form.customer_name,
        pickup_location: form.pickup_location,
        delivery_location: form.delivery_location,
      });
      const newOrder = res.data.order;
      const eta = res.data.eta_minutes;
      if (newOrder) setLocalOrders(prev => [{ ...newOrder, eta_minutes: eta }, ...prev]);
      setMessage(`✅ Assigned to ${res.data.assigned_agent?.name || "No agent"}! ETA: ${eta} min`);
      setTimeout(() => setMessage(""), 4000);
    } catch (e) {
      setMessage("❌ Failed to place order!");
    }
  };

  const recentOrders = [...localOrders].slice(0, 15);

  const inputStyle = {
    width: "100%", padding: "7px 10px", borderRadius: "6px",
    backgroundColor: "#21262d", color: "#e6edf3",
    border: "1px solid #30363d", fontSize: "12px",
    fontFamily: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      height: isMobile ? "auto" : "calc(100vh - 88px)",
      borderRadius: "8px",
      overflow: isMobile ? "visible" : "hidden",
      border: "1px solid #30363d",
    }}>

      {/* Map */}
      <div style={{
        flex: 1,
        position: "relative",
        height: isMobile ? "60vh" : "100%",
        minHeight: "300px",
      }}>
        <div style={{
          position: "absolute", top: "10px", left: "50px", zIndex: 1000,
          background: "rgba(13,17,23,0.85)", color: "#8b949e",
          padding: "4px 12px", borderRadius: "6px", fontSize: "11px",
          display: "flex", gap: "16px", alignItems: "center",
          border: "1px solid #30363d",
        }}>
          <span style={{ color: "#e6edf3", fontWeight: "600" }}>CHENNAI LIVE MAP</span>
          {!isMobile && <span>68,533 intersections · Real-time GPS</span>}
        </div>

        {/* Mobile toggle button */}
        {isMobile && (
          <button onClick={() => setShowPanel(!showPanel)} style={{
            position: "absolute", top: "10px", right: "10px", zIndex: 1000,
            backgroundColor: "#161b22", border: "1px solid #30363d",
            color: "#e6edf3", padding: "6px 12px", borderRadius: "6px",
            fontSize: "11px", cursor: "pointer", fontFamily: "inherit",
          }}>
            {showPanel ? "Hide Panel" : "Order / Agents"}
          </button>
        )}

        <MapContainer
          center={[13.0827, 80.2707]}
          zoom={isMobile ? 10 : 11}
          style={{ height: "100%", width: "100%", minHeight: "300px" }}
          zoomControl
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />

          {Object.entries(CHENNAI_LOCATIONS).map(([name, coords]) => (
            <Marker key={name} position={coords} icon={locationIcon()}>
              <Popup><span style={{ fontSize: "12px", fontWeight: "600" }}>{name}</span></Popup>
            </Marker>
          ))}

          {agentNames.map(name => {
            const pos = agentPositions[name];
            if (!pos) return null;
            const agent = agents.find(a => a.name === name);
            const color = agent ? (STATUS_COLORS[agent.status] || "#3fb950") : "#3fb950";
            return (
              <Marker key={name} position={pos} icon={makeIcon(color, name)}>
                <Popup>
                  <div style={{ fontSize: "12px" }}>
                    <strong>{name}</strong><br />
                    Status: {agent?.status || "idle"}
                  </div>
                </Popup>
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

      {/* Right Panel - always visible on desktop, toggle on mobile */}
      {(!isMobile || showPanel) && (
        <div style={{
          width: isMobile ? "100%" : "270px",
          backgroundColor: "#161b22",
          borderLeft: isMobile ? "none" : "1px solid #30363d",
          borderTop: isMobile ? "1px solid #30363d" : "none",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          maxHeight: isMobile ? "60vh" : "unset",
        }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "11px", padding: "1px 8px", borderRadius: "12px", display: "inline-block",
                      backgroundColor: order.status === "delivered" ? "rgba(63,185,80,0.15)" : order.status === "assigned" ? "rgba(56,139,253,0.15)" : order.status === "picked_up" ? "rgba(240,136,62,0.15)" : "rgba(139,148,158,0.15)",
                      color: order.status === "delivered" ? "#3fb950" : order.status === "assigned" ? "#388bfd" : order.status === "picked_up" ? "#f0883e" : "#8b949e",
                    }}>{order.status}</span>
                    {order.eta_minutes && order.status !== "delivered" && (
                      <span style={{ fontSize: "11px", padding: "1px 8px", borderRadius: "12px", backgroundColor: "rgba(139,148,158,0.1)", color: "#8b949e", display: "inline-block" }}>
                        ⏱ {order.eta_minutes} min
                      </span>
                    )}
                    {order.status !== "delivered" && onTrackOrder && (
                      <button onClick={() => onTrackOrder(order.id)} style={{
                        fontSize: "10px", padding: "1px 7px", borderRadius: "3px",
                        backgroundColor: "transparent", border: "1px solid #388bfd",
                        color: "#388bfd", cursor: "pointer", fontFamily: "inherit",
                      }}>Track</button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}