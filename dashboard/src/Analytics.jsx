import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const styles = {
  container: {
    backgroundColor: "#0d1117",
    padding: "0",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: "20px",
  },
  statCard: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "8px",
    padding: "14px 16px",
  },
  statLabel: {
    fontSize: "11px",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: "0 0 6px 0",
    fontWeight: "500",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "600",
    margin: "0",
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },
  chart: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "8px",
    padding: "16px",
  },
  chartTitle: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#8b949e",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    margin: "0 0 16px 0",
  },
  utilizationCard: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "8px",
    padding: "16px",
  },
  agentRow: {
    marginBottom: "14px",
  },
  agentHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
    fontSize: "13px",
  },
  progressBg: {
    backgroundColor: "#21262d",
    borderRadius: "4px",
    height: "4px",
    overflow: "hidden",
  },
};

const TOOLTIP_STYLE = {
  backgroundColor: "#161b22",
  border: "1px solid #30363d",
  borderRadius: "6px",
  color: "#e6edf3",
  fontSize: "12px",
};

export default function Analytics({ analytics }) {
  if (!analytics) return (
    <div style={{ color: "#8b949e", textAlign: "center", padding: "40px", fontSize: "13px" }}>
      Loading analytics...
    </div>
  );

  const statusData = [
    { name: "Delivered", value: analytics.delivered },
    { name: "Assigned", value: analytics.assigned },
    { name: "Pending", value: analytics.pending },
  ].filter(d => d.value > 0);

  const PIE_COLORS = ["#3b82f6", "#f59e0b", "#30363d"];

  const statCards = [
    { label: "Total Orders", value: analytics.total_orders, color: "#e6edf3" },
    { label: "Delivered", value: analytics.delivered, color: "#3fb950" },
    { label: "Pending", value: analytics.pending, color: "#f85149" },
    { label: "Delivery Rate", value: `${analytics.delivery_rate}%`, color: "#3b82f6" },
  ];

  return (
    <div style={styles.container}>
      {/* Stat Cards */}
      <div style={styles.statsGrid}>
        {statCards.map(({ label, value, color }) => (
          <div key={label} style={styles.statCard}>
            <p style={styles.statLabel}>{label}</p>
            <p style={{ ...styles.statValue, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={styles.chartsGrid}>
        <div style={styles.chart}>
          <p style={styles.chartTitle}>Deliveries per Agent</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.agent_stats} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="name" stroke="#8b949e" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#8b949e" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#21262d" }} />
              <Bar dataKey="deliveries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chart}>
          <p style={styles.chartTitle}>Order Status</p>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                  label={({ name, value }) => `${name} ${value}`} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: "13px" }}>
              No orders yet
            </div>
          )}
        </div>

        <div style={styles.chart}>
          <p style={styles.chartTitle}>Popular Pickup Locations</p>
          {analytics.pickup_counts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.pickup_counts} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis dataKey="location" stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8b949e" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#21262d" }} />
                <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontSize: "13px" }}>
              No data yet
            </div>
          )}
        </div>

        <div style={styles.utilizationCard}>
          <p style={styles.chartTitle}>Agent Utilization</p>
          {analytics.agent_stats.map((agent, i) => (
            <div key={i} style={styles.agentRow}>
              <div style={styles.agentHeader}>
                <span style={{ color: "#e6edf3", fontWeight: "500" }}>{agent.name}</span>
                <span style={{ color: agent.status === "idle" ? "#8b949e" : "#3b82f6", fontSize: "11px" }}>
                  {agent.status === "idle" ? "Idle" : "Active"} · {agent.deliveries} deliveries
                </span>
              </div>
              <div style={styles.progressBg}>
                <div style={{
                  height: "100%",
                  borderRadius: "4px",
                  backgroundColor: agent.status === "idle" ? "#30363d" : "#3b82f6",
                  width: agent.status === "idle" ? "10%" : "100%",
                  transition: "width 0.5s ease"
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}