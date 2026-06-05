import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000/ws";

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

function agentIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:50%;
      background:${color};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function pinIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${color};
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 14],
  });
}

export default function TrackOrder() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [agent, setAgent] = useState(null);
  const [agentPos, setAgentPos] = useState(null);
  const [eta, setEta] = useState(null);
  const [trail, setTrail] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    fetchOrder();
    connectWS();
    return () => wsRef.current?.close();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API}/chennai/orders`);
      const found = res.data.find(o => o.id === orderId);
      if (found) setOrder(found);
      const agentsRes = await axios.get(`${API}/chennai/agents`);
      const assignedAgent = agentsRes.data.find(a => a.id === found?.assigned_agent_id);
      if (assignedAgent) {
        setAgent(assignedAgent);
        if (assignedAgent.lat && assignedAgent.lng) {
          setAgentPos([assignedAgent.lat, assignedAgent.lng]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch order", e);
    }
  };

  const connectWS = () => {
    const ws = new WebSocket(WS);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "chennai_agent_update") {
        if (data.order?.id === orderId) {
          setOrder(data.order);
          setAgentPos([data.lat, data.lng]);
          setTrail(prev => [...prev.slice(-50), [data.lat, data.lng]]);
          if (data.eta_minutes) setEta(data.eta_minutes);
          setAgent(data.agent);
        }
      }
    };
    ws.onclose = () => setTimeout(connectWS, 2000);
  };

  const getStatusColor = (status) => {
    if (status === "delivered") return "#3fb950";
    if (status === "picked_up") return "#f0883e";
    if (status === "assigned") return "#388bfd";
    return "#8b949e";
  };

  const getStatusLabel = (status) => {
    if (status === "delivered") return "✅ Delivered!";
    if (status === "picked_up") return "🚴 On the way";
    if (status === "assigned") return "🔍 Finding pickup";
    return "⏳ Pending";
  };

  if (!order) return (
    <div style={{ backgroundColor: "#0d1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#e6edf3", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "24px", marginBottom: "12px" }}>🔍</div>
        <div style={{ color: "#8b949e" }}>Loading order...</div>
      </div>
    </div>
  );

  const pickupCoords = CHENNAI_LOCATIONS[order.pickup_location];
  const deliveryCoords = CHENNAI_LOCATIONS[order.delivery_location];

  return (
    <div style={{ backgroundColor: "#0d1117", minHeight: "100vh", color: "#e6edf3", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      
      {/* Header */}
      <div style={{ backgroundColor: "#161b22", borderBottom: "1px solid #21262d", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: "14px" }}>← Back</button>
          <span style={{ fontSize: "14px", fontWeight: "600" }}>Track Order</span>
        </div>
        <span style={{ fontSize: "11px", color: "#8b949e", fontFamily: "monospace" }}>{orderId.slice(0, 8)}...</span>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)" }}>
        
        {/* Map */}
        <div style={{ flex: 1 }}>
          <MapContainer
            center={agentPos || pickupCoords || [13.0827, 80.2707]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            
            {/* Trail */}
            {trail.length > 1 && <Polyline positions={trail} color="#388bfd" weight={3} opacity={0.6} />}
            
            {/* Agent */}
            {agentPos && (
              <Marker position={agentPos} icon={agentIcon("#388bfd")}>
                <Popup>{agent?.name || "Agent"}</Popup>
              </Marker>
            )}

            {/* Pickup */}
            {pickupCoords && (
              <Marker position={pickupCoords} icon={pinIcon("#f0883e")}>
                <Popup>Pickup: {order.pickup_location}</Popup>
              </Marker>
            )}

            {/* Delivery */}
            {deliveryCoords && (
              <Marker position={deliveryCoords} icon={pinIcon("#3fb950")}>
                <Popup>Delivery: {order.delivery_location}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Right Panel */}
        <div style={{ width: "280px", backgroundColor: "#161b22", borderLeft: "1px solid #30363d", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Status */}
          <div style={{ backgroundColor: "#0d1117", borderRadius: "8px", padding: "16px", border: "1px solid #30363d" }}>
            <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "8px", fontWeight: "600", letterSpacing: "0.5px" }}>STATUS</div>
            <div style={{ fontSize: "20px", fontWeight: "600", color: getStatusColor(order.status) }}>
              {getStatusLabel(order.status)}
            </div>
            {eta && order.status !== "delivered" && (
              <div style={{ marginTop: "8px", fontSize: "13px", color: "#8b949e" }}>
                ⏱ ETA: <span style={{ color: "#e6edf3", fontWeight: "600" }}>{eta} min</span>
              </div>
            )}
          </div>

          {/* Order Details */}
          <div style={{ backgroundColor: "#0d1117", borderRadius: "8px", padding: "16px", border: "1px solid #30363d" }}>
            <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "12px", fontWeight: "600", letterSpacing: "0.5px" }}>ORDER DETAILS</div>
            <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8b949e" }}>Customer</span>
                <span style={{ color: "#e6edf3" }}>{order.customer_name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8b949e" }}>Pickup</span>
                <span style={{ color: "#f0883e" }}>{order.pickup_location}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#8b949e" }}>Delivery</span>
                <span style={{ color: "#3fb950" }}>{order.delivery_location}</span>
              </div>
              {agent && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#8b949e" }}>Agent</span>
                  <span style={{ color: "#e6edf3" }}>{agent.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ backgroundColor: "#0d1117", borderRadius: "8px", padding: "16px", border: "1px solid #30363d" }}>
            <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "12px", fontWeight: "600", letterSpacing: "0.5px" }}>MAP LEGEND</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#388bfd", border: "2px solid white" }}></div>
                <span style={{ color: "#8b949e" }}>Delivery agent</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", backgroundColor: "#f0883e" }}></div>
                <span style={{ color: "#8b949e" }}>Pickup point</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", backgroundColor: "#3fb950" }}></div>
                <span style={{ color: "#8b949e" }}>Delivery point</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}