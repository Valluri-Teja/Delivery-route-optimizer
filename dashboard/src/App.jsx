import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ChennaiMap from "./ChennaiMap";
import Analytics from "./Analytics";

const API = "http://localhost:8000";
const WS = "ws://localhost:8000/ws";

const GRID_SIZE = 400;
const CELL = GRID_SIZE / 3;

const COLORS = {
  idle: "#00ff88",
  moving_to_pickup: "#ffaa00",
  delivering: "#00aaff",
};

const NODE_POSITIONS = {
  A: [0, 3], B: [1, 3], C: [2, 3], D: [3, 3],
  E: [0, 2], F: [1, 2], G: [2, 2], H: [3, 2],
  I: [0, 1], J: [1, 1], K: [2, 1], L: [3, 1],
  M: [0, 0], N: [1, 0], O: [2, 0], P: [3, 0],
};

const EDGES = [
  ["A","B"],["B","C"],["C","D"],
  ["E","F"],["F","G"],["G","H"],
  ["I","J"],["J","K"],["K","L"],
  ["M","N"],["N","O"],["O","P"],
  ["A","E"],["E","I"],["I","M"],
  ["B","F"],["F","J"],["J","N"],
  ["C","G"],["G","K"],["K","O"],
  ["D","H"],["H","L"],["L","P"],
];

function getPos(node) {
  const [col, row] = NODE_POSITIONS[node] || [0, 0];
  return { x: 60 + col * CELL, y: 60 + row * CELL };
}

export default function App() {
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chennaiAgents, setChennaiAgents] = useState([]);
  const [chennaiOrders, setChennaiOrders] = useState([]);
  const [form, setForm] = useState({ customer_name: "Teja", pickup_location: "A", delivery_location: "P" });
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("grid");
  const [traffic, setTraffic] = useState({ status: "Clear Roads", multiplier: 1, color: "#3fb950" });
  const wsRef = useRef(null);

  useEffect(() => {
    fetchData();
    connectWS();
    fetchTraffic();
    return () => wsRef.current?.close();
  }, []);

  const fetchData = async () => {
    const [a, o, ca, co] = await Promise.all([
      axios.get(`${API}/agents`),
      axios.get(`${API}/orders`),
      axios.get(`${API}/chennai/agents`),
      axios.get(`${API}/chennai/orders`),
    ]);
    setAgents(a.data);
    setOrders(o.data);
    setChennaiAgents(ca.data);
    setChennaiOrders(co.data);
  };

  const fetchTraffic = async () => {
    try {
      const res = await axios.get(`${API}/traffic`);
      setTraffic(res.data);
    } catch {}
  };

  const connectWS = () => {
    const ws = new WebSocket(WS);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "initial_state") {
        setAgents(data.agents);
        setOrders(data.orders);
      } else if (data.type === "agent_update") {
        setAgents(prev => prev.map(a => a.id === data.agent.id ? data.agent : a));
        if (data.order) setOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
      } else if (data.type === "reassignment") {
        setAgents(data.agents);
        setOrders(data.orders);
        setMessage(`🔄 ${data.message}`);
        setTimeout(() => setMessage(""), 3000);
      } else if (data.type === "chennai_agent_update") {
        setChennaiAgents(prev => prev.map(a =>
          a.id === data.agent.id
            ? { ...data.agent, lat: data.lat, lng: data.lng }
            : a
        ));
        if (data.order) setChennaiOrders(prev => {
          const exists = prev.find(o => o.id === data.order.id);
          if (exists) return prev.map(o => o.id === data.order.id ? data.order : o);
          return [...prev, data.order];
        });
      }
    };
    ws.onclose = () => setTimeout(connectWS, 2000);
  };

  const placeOrder = async () => {
    try {
      const res = await axios.post(`${API}/orders`, form);
      setMessage(`✅ Assigned to ${res.data.assigned_agent?.name || "No agent"}!`);
      fetchData();
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ Failed!");
    }
  };

  const nodes = Object.keys(NODE_POSITIONS);

  const analyticsData = {
    total_orders: orders.length,
    delivered: orders.filter(o => o.status === "delivered").length,
    assigned: orders.filter(o => o.status === "assigned").length,
    pending: orders.filter(o => o.status === "pending").length,
    delivery_rate: orders.length > 0
      ? Math.round((orders.filter(o => o.status === "delivered").length / orders.length) * 100)
      : 0,
    agent_stats: agents.map(agent => ({
      name: agent.name,
      deliveries: orders.filter(o => o.assigned_agent_id === agent.id && o.status === "delivered").length,
      status: agent.status,
    })),
    pickup_counts: Object.entries(
      orders.reduce((acc, o) => {
        acc[o.pickup_location] = (acc[o.pickup_location] || 0) + 1;
        return acc;
      }, {})
    ).map(([location, count]) => ({ location, orders: count })),
  };

  const activeCount = agents.filter(a => a.status !== "idle").length;

  return (
    <div style={{ backgroundColor: "#0d1117", minHeight: "100vh", color: "#e6edf3", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Navbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: "48px", borderBottom: "1px solid #21262d", backgroundColor: "#161b22" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#e6edf3" }}>Delivery Route Optimizer</span>

        <div style={{ display: "flex", gap: "4px" }}>
          {["grid", "chennai", "analytics"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "5px 14px", borderRadius: "6px", border: "1px solid",
              borderColor: tab === t ? "#388bfd" : "transparent",
              backgroundColor: tab === t ? "rgba(56,139,253,0.15)" : "transparent",
              color: tab === t ? "#388bfd" : "#8b949e",
              fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
            }}>
              {t === "grid" ? "Grid Map" : t === "chennai" ? "Chennai Map" : "Analytics"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: traffic.color }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: traffic.color, display: "inline-block" }} />
          {traffic.status} · {traffic.multiplier}x · {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 24px" }}>

        {/* Grid Tab */}
        {tab === "grid" && (
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "10px", padding: "20px" }}>
              <h2 style={{ color: "#e6edf3", fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>🗺️ City Map</h2>
              <svg width={GRID_SIZE + 80} height={GRID_SIZE + 80}>
                {EDGES.map(([a, b], i) => {
                  const pa = getPos(a), pb = getPos(b);
                  return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#30363d" strokeWidth={2} />;
                })}
                {nodes.map(node => {
                  const { x, y } = getPos(node);
                  return (
                    <g key={node}>
                      <circle cx={x} cy={y} r={18} fill="#21262d" stroke="#444c56" strokeWidth={2} />
                      <text x={x} y={y + 5} textAnchor="middle" fill="#e6edf3" fontSize={12}>{node}</text>
                    </g>
                  );
                })}
                {agents.map(agent => {
                  const { x, y } = getPos(agent.current_location);
                  const color = COLORS[agent.status] || "#fff";
                  return (
                    <g key={agent.id}>
                      <circle cx={x} cy={y} r={10} fill={color} opacity={0.9} />
                      <text x={x} y={y - 20} textAnchor="middle" fill={color} fontSize={10}>{agent.name}</text>
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "12px" }}>
                <span style={{ color: "#3fb950" }}>● Idle</span>
                <span style={{ color: "#f0883e" }}>● To Pickup</span>
                <span style={{ color: "#388bfd" }}>● Delivering</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: "300px" }}>
              <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "10px", padding: "20px" }}>
                <h2 style={{ color: "#e6edf3", fontSize: "14px", fontWeight: "600", marginBottom: "14px" }}>📦 Place Order</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "#21262d", color: "#e6edf3", border: "1px solid #30363d", fontSize: "13px", fontFamily: "inherit" }} />
                  <select value={form.pickup_location} onChange={e => setForm({ ...form, pickup_location: e.target.value })}
                    style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "#21262d", color: "#e6edf3", border: "1px solid #30363d", fontSize: "13px", fontFamily: "inherit" }}>
                    {nodes.map(n => <option key={n} value={n}>Pickup: {n}</option>)}
                  </select>
                  <select value={form.delivery_location} onChange={e => setForm({ ...form, delivery_location: e.target.value })}
                    style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "#21262d", color: "#e6edf3", border: "1px solid #30363d", fontSize: "13px", fontFamily: "inherit" }}>
                    {nodes.map(n => <option key={n} value={n}>Deliver to: {n}</option>)}
                  </select>
                  <button onClick={placeOrder}
                    style={{ padding: "9px", backgroundColor: "#238636", color: "#fff", border: "1px solid #2ea043", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "inherit" }}>
                    Place Order 🚴
                  </button>
                  {message && <span style={{ color: "#3fb950", fontSize: "12px" }}>{message}</span>}
                </div>
              </div>

              <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "10px", padding: "20px" }}>
                <h2 style={{ color: "#e6edf3", fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>🚴 Agents</h2>
                {agents.map(agent => (
                  <div key={agent.id} style={{ padding: "8px 0", borderBottom: "1px solid #21262d", fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                    <span><span style={{ color: COLORS[agent.status] }}>●</span> {agent.name}</span>
                    <span style={{ color: "#8b949e" }}>{agent.current_location} · {agent.status}</span>
                  </div>
                ))}
              </div>

              <div style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "10px", padding: "20px" }}>
                <h2 style={{ color: "#e6edf3", fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>📋 Orders</h2>
                {orders.length === 0
                  ? <p style={{ color: "#8b949e", fontSize: "13px" }}>No orders yet</p>
                  : orders.map(order => (
                    <div key={order.id} style={{ padding: "8px 0", borderBottom: "1px solid #21262d", fontSize: "12px" }}>
                      <div style={{ color: "#e6edf3" }}>{order.customer_name} · {order.pickup_location} → {order.delivery_location}</div>
                      <span style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "12px", display: "inline-block", marginTop: "3px",
                        backgroundColor: order.status === "delivered" ? "rgba(63,185,80,0.15)" : order.status === "assigned" ? "rgba(56,139,253,0.15)" : "rgba(139,148,158,0.15)",
                        color: order.status === "delivered" ? "#3fb950" : order.status === "assigned" ? "#388bfd" : "#8b949e",
                      }}>{order.status}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {tab === "chennai" && (
          <ChennaiMap
            agents={chennaiAgents}
            orders={chennaiOrders}
            onOrderPlaced={fetchData}
          />
        )}
        {tab === "analytics" && <Analytics analytics={analyticsData} />}
      </div>
    </div>
  );
}