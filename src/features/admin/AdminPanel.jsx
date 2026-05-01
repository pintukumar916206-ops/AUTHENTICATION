import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import useUIStore from "../../store/uiStore";
import {
  PageHeader,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  StatBox,
  Table,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  SkeletonCard,
  EmptyState,
} from "../../ui";
import {
  Users,
  Flag,
  BarChart3,
  ShieldAlert,
  Trash2,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../../styles/dashboard.css";

function InvestigationModal({ report, isOpen, onClose }) {
  const [notes, setNotes] = useState(report.internalNotes || "");
  const [status, setStatus] = useState(report.moderationStatus || "PENDING");
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const moderate = useMutation({
    mutationFn: (payload) => api.patch(`/api/admin/reports/${report._id}/moderate`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminFlagged"] });
      addToast("Forensic record committed", "success");
      onClose();
    },
    onError: () => addToast("Update failed", "error")
  });

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h3>Case Investigation #{report._id.slice(-8).toUpperCase()}</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="admin-modal-body">
          <div className="investigation-target-box">
            <div className="it-row"><strong>Hostname:</strong> {report.product?.hostname}</div>
            <div className="it-row"><strong>System Score:</strong> {report.score}% ({report.verdict})</div>
            <div className="it-row"><strong>Evidence:</strong> {report.risk_signals?.length || 0} Anomalies Detected</div>
          </div>
          
          <div className="investigation-field">
            <label>Internal Audit Log (Private)</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter forensic findings..."
            />
          </div>

          <div className="investigation-ops">
            <label>Operational Decision</label>
            <div className="ops-btn-grid">
              <button className={status === "GENUINE" ? "active" : ""} onClick={() => setStatus("GENUINE")}>MARK SAFE</button>
              <button className={status === "FAKE" ? "active" : ""} onClick={() => setStatus("FAKE")}>MARK FRAUD</button>
              <button className={status === "SUSPICIOUS" ? "active" : ""} onClick={() => setStatus("SUSPICIOUS")}>ESCALATE</button>
            </div>
          </div>

          <div className="investigation-history-trail">
            <h4>AUDIT TRAIL</h4>
            {report.moderationHistory?.map((h, i) => (
              <div key={i} className="trail-item">
                <span className="trail-date">{new Date(h.timestamp).toLocaleString()}</span>
                <span className="trail-status">{h.status || h.action}</span>
                <p className="trail-note">{h.notes || "System action."}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="admin-modal-footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            loading={moderate.isPending}
            onClick={() => moderate.mutate({ status, notes })}
          >
            Authorize Verdict
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlaggedTable({ data }) {
  const [selectedReport, setSelectedReport] = useState(null);

  const columns = [
    {
      accessorKey: "product.title",
      header: "Incident Target",
      cell: (info) => (
        <div className="admin-cell-title">
          <div style={{ fontWeight: 600, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {info.getValue() || "Untitled Product"}
          </div>
          ID: {info.row.original._id.slice(-8).toUpperCase()}
        </div>
      ),
    },
    {
      accessorKey: "moderationStatus",
      header: "Ops Status",
      cell: (info) => (
        <span className={`status-pill status-${info.getValue()?.toLowerCase() || "pending"}`}>
          {info.getValue() || "PENDING"}
        </span>
      ),
    },
    {
      accessorKey: "score",
      header: "Trust",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>{info.getValue()}%</span>
        </div>
      ),
    },
    {
      id: "investigate",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedReport(row.original)}
        >
          <Flag size={12} style={{ marginRight: 6 }} />
          Investigate
        </Button>
      ),
    },
  ];

  if (!data?.length) return <EmptyState title="Queue Empty" message="No active incidents require review." />;

  return (
    <>
      <Table data={data} columns={columns} pagination />
      {selectedReport && (
        <InvestigationModal 
          report={selectedReport} 
          isOpen={Boolean(selectedReport)} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </>
  );
}

function UsersTable({ data }) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const setRole = useMutation({
    mutationFn: ({ id, role }) =>
      api.patch(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      addToast("Role updated", "success");
    },
    onError: () => addToast("Failed to update role", "error"),
  });

  const columns = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: (info) => (
        <span
          className={`role-badge ${info.getValue() === "admin" ? "role-admin" : "role-user"}`}
        >
          {info.getValue()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const u = row.original;
        return u.role !== "admin" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRole.mutate({ id: u._id, role: "admin" })}
          >
            Promote
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRole.mutate({ id: u._id, role: "user" })}
          >
            Demote
          </Button>
        );
      },
    },
  ];

  if (!data?.length) return <EmptyState title="No users found" />;

  return <Table data={data} columns={columns} pagination />;
}

function AuditTrailTable({ data }) {
  const columns = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: (info) => (
        <span style={{ fontSize: "0.8rem", color: "var(--accent-muted)" }}>
          {new Date(info.getValue()).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "adminId",
      header: "Admin ID",
      cell: (info) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          {info.getValue()?.toString().slice(-6) || "System"}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action Taken",
      cell: (info) => (
        <span style={{ fontWeight: 600, color: "var(--primary)" }}>
          {info.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "targetId",
      header: "Target ID",
      cell: (info) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          {info.getValue()?.toString().slice(-8) || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: (info) => {
        const details = info.getValue();
        if (!details) return <span className="txt-muted">-</span>;
        return (
          <div style={{ fontSize: "0.8rem", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {details.status ? `Status: ${details.status}` : ""} {details.notes ? `| Note: ${details.notes}` : ""}
          </div>
        );
      },
    },
    {
      accessorKey: "ip",
      header: "IP Address",
      cell: (info) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
          {info.getValue() || "unknown"}
        </span>
      ),
    }
  ];

  if (!data?.length) return <EmptyState title="No Audit Logs" message="The immutable trail is currently empty." />;

  return <Table data={data} columns={columns} pagination />;
}

const activityData = [
  { name: "Mon", genuine: 400, fake: 240, suspicious: 100 },
  { name: "Tue", genuine: 300, fake: 139, suspicious: 200 },
  { name: "Wed", genuine: 200, fake: 400, suspicious: 150 },
  { name: "Thu", genuine: 278, fake: 390, suspicious: 100 },
  { name: "Fri", genuine: 189, fake: 480, suspicious: 200 },
  { name: "Sat", genuine: 239, fake: 380, suspicious: 50 },
  { name: "Sun", genuine: 349, fake: 430, suspicious: 80 },
];

const distributionData = [
  { range: "0-20%", count: 120 },
  { range: "21-40%", count: 80 },
  { range: "41-60%", count: 50 },
  { range: "61-80%", count: 190 },
  { range: "81-100%", count: 300 },
];
function HealthHUD({ data }) {
  if (!data) return <SkeletonCard />;
  const { scrapers, uptime } = data;

  return (
    <div className="admin-health-hud" style={{ marginBottom: 32 }}>
      <div className="bl-header" style={{ marginBottom: 16 }}>
        <Activity size={14} /> <span>SYSTEM OPERATIONAL HEALTH</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        {Object.entries(scrapers).map(([id, stats]) => {
          const total = stats.success + stats.fail;
          const rate =
            total > 0 ? Math.round((stats.success / total) * 100) : 100;
          return (
            <div
              key={id}
              className="health-card"
              style={{
                padding: 16,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 12,
                border: "1px solid var(--panel-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "var(--accent-muted)",
                  }}
                >
                  {id} ADAPTER
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: rate > 80 ? "var(--success)" : "var(--error)",
                  }}
                >
                  {rate}% HEALTH
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${rate}%`,
                    background: rate > 80 ? "var(--success)" : "var(--error)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>S: {stats.success}</span>
                <span>F: {stats.fail}</span>
              </div>
            </div>
          );
        })}
        <div
          className="health-card"
          style={{
            padding: 16,
            background: "rgba(255,0,49,0.05)",
            borderRadius: 12,
            border: "1px solid rgba(255,0,49,0.2)",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "var(--nothing-red)",
            }}
          >
            SYSTEM UPTIME
          </span>
          <div
            style={{
              fontSize: "1.2rem",
              fontWeight: 700,
              marginTop: 4,
              color: "#fff",
            }}
          >
            {Math.floor(uptime / 3600)}h {Math.floor((uptime % 3600) / 60)}m
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => api.get("/api/admin/stats"),
  });

  const { data: health } = useQuery({
    queryKey: ["adminHealth"],
    queryFn: () => api.get("/api/admin/health"),
    refetchInterval: 10000,
  });

  const { data: flaggedData, isLoading: flaggedLoading } = useQuery({
    queryKey: ["adminFlagged"],
    queryFn: () => api.get("/api/admin/flagged"),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => api.get("/api/admin/users"),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["adminAuditLogs"],
    queryFn: () => api.get("/api/admin/audit-logs"),
  });

  return (
    <div className="admin-page" style={{ padding: "40px 60px" }}>
      <PageHeader
        title={
          <>
            <ShieldAlert
              size={28}
              style={{
                display: "inline",
                marginRight: 12,
                color: "var(--error)",
                verticalAlign: "bottom",
              }}
            />
            Fraud Operations Console
          </>
        }
        subtitle="Manage active threats and monitor platform telemetry."
      />

      <Tabs>
        <TabList activeTab={activeTab} onChange={setActiveTab}>
          <TabTrigger value="overview">Ops Dashboard</TabTrigger>
          <TabTrigger value="flagged">Investigation Queue</TabTrigger>
          <TabTrigger value="users">Access Control</TabTrigger>
          <TabTrigger value="audit">System Telemetry</TabTrigger>
        </TabList>
        <TabContent value="overview" activeTab={activeTab}>
          <HealthHUD data={health} />

          {statsLoading ? (
            <div style={{ display: "flex", gap: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 16,
                marginBottom: 32,
              }}
            >
              <StatBox
                label="Total Scans"
                value={stats?.total || 0}
                icon={BarChart3}
                trend={12}
              />
              <StatBox
                label="Total Users"
                value={stats?.userCount || 0}
                icon={Users}
                trend={5}
              />
              <StatBox
                label="In Queue"
                value={stats?.flaggedCount || 0}
                icon={Flag}
                trend={-2}
              />
              <StatBox
                label="Genuine"
                value={stats?.genuine || 0}
                icon={ShieldAlert}
              />
              <StatBox
                label="Fake Detected"
                value={stats?.fake || 0}
                icon={ShieldAlert}
              />
            </div>
          )}

          <div
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}
          >
            <Card>
              <CardHeader title="30-Day Threat Heatmap" />
              <CardBody style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#888"
                      tick={{ fill: "#888" }}
                    />
                    <YAxis stroke="#888" tick={{ fill: "#888" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10,10,14,0.9)",
                        borderColor: "rgba(255,255,255,0.1)",
                        color: "#fff",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="genuine"
                      stroke="var(--success)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fake"
                      stroke="var(--error)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="suspicious"
                      stroke="var(--warning)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Confidence Distribution" />
              <CardBody style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="range"
                      stroke="#888"
                      tick={{ fill: "#888", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{
                        backgroundColor: "rgba(10,10,14,0.9)",
                        borderColor: "rgba(255,255,255,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </TabContent>

        <TabContent value="flagged" activeTab={activeTab}>
          {flaggedLoading ? (
            <SkeletonCard />
          ) : (
            <FlaggedTable data={flaggedData?.reports} />
          )}
        </TabContent>

        <TabContent value="users" activeTab={activeTab}>
          {usersLoading ? (
            <SkeletonCard />
          ) : (
            <UsersTable data={usersData?.users} />
          )}
        </TabContent>

        <TabContent value="audit" activeTab={activeTab}>
          <Card>
            <CardHeader title="Immutable Audit Trail" />
            <CardBody>
              {auditLoading ? (
                <SkeletonCard />
              ) : (
                <AuditTrailTable data={auditData?.logs} />
              )}
            </CardBody>
          </Card>
        </TabContent>
      </Tabs>
    </div>
  );
}
