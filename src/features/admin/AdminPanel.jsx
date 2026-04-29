import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../services/api";
import useUIStore from "../../store/uiStore";
import { PageHeader, Tabs, TabList, TabTrigger, TabContent, StatBox, Table, Card, CardHeader, CardBody, Badge, Button, SkeletonCard, EmptyState } from "../../ui";
import { Users, Flag, BarChart3, ShieldAlert, Trash2, Activity } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "../../styles/dashboard.css";

function FlaggedTable({ data }) {
  const { addToast } = useUIStore();
  const queryClient = useQueryClient();

  const unflag = useMutation({
    mutationFn: (id) => api.patch(`/api/admin/reports/${id}/flag`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminFlagged"] }); addToast("Report unflagged", "success"); },
    onError: () => addToast("Failed to unflag", "error"),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/api/admin/reports/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminFlagged"] }); addToast("Report deleted", "success"); },
    onError: () => addToast("Failed to delete", "error"),
  });

  const columns = [
    {
      accessorKey: 'product.title',
      header: 'Product',
      cell: info => <div className="admin-cell-title" style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.getValue() || "Untitled"}</div>
    },
    {
      accessorKey: 'verdict',
      header: 'Verdict',
      cell: info => <Badge verdict={info.getValue()} />
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: info => `${info.getValue()}%`
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => unflag.mutate(row.original._id)} title="Unflag">
            <Flag size={14} /> Unflag
          </Button>
          <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete this report?")) remove.mutate(row.original._id); }} title="Delete">
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  if (!data?.length) return <EmptyState title="No flagged reports" message="Clean queue." />;

  return <Table data={data} columns={columns} pagination />;
}

function UsersTable({ data }) {
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();

  const setRole = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/api/admin/users/${id}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminUsers"] }); addToast("Role updated", "success"); },
    onError: () => addToast("Failed to update role", "error"),
  });

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: info => (
        <span className={`role-badge ${info.getValue() === "admin" ? "role-admin" : "role-user"}`}>
          {info.getValue()}
        </span>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const u = row.original;
        return u.role !== "admin" ? (
          <Button variant="outline" size="sm" onClick={() => setRole.mutate({ id: u._id, role: "admin" })}>
            Promote
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setRole.mutate({ id: u._id, role: "user" })}>
            Demote
          </Button>
        );
      }
    }
  ];

  if (!data?.length) return <EmptyState title="No users found" />;

  return <Table data={data} columns={columns} pagination />;
}

const activityData = [
  { name: 'Mon', genuine: 400, fake: 240, suspicious: 100 },
  { name: 'Tue', genuine: 300, fake: 139, suspicious: 200 },
  { name: 'Wed', genuine: 200, fake: 400, suspicious: 150 },
  { name: 'Thu', genuine: 278, fake: 390, suspicious: 100 },
  { name: 'Fri', genuine: 189, fake: 480, suspicious: 200 },
  { name: 'Sat', genuine: 239, fake: 380, suspicious: 50 },
  { name: 'Sun', genuine: 349, fake: 430, suspicious: 80 },
];

const distributionData = [
  { range: '0-20%', count: 120 },
  { range: '21-40%', count: 80 },
  { range: '41-60%', count: 50 },
  { range: '61-80%', count: 190 },
  { range: '81-100%', count: 300 },
];
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: () => api.get("/api/admin/stats"),
  });

  const { data: flaggedData, isLoading: flaggedLoading } = useQuery({
    queryKey: ["adminFlagged"],
    queryFn: () => api.get("/api/admin/flagged"),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => api.get("/api/admin/users"),
  });

  return (
    <div className="admin-page" style={{ padding: '40px 60px' }}>
      <PageHeader 
        title={<><ShieldAlert size={28} style={{ display: "inline", marginRight: 12, color: "var(--error)", verticalAlign: 'bottom' }} />Admin Panel</>} 
        subtitle="Platform moderation and forensic intelligence analytics"
      />

      <Tabs>
        <TabList activeTab={activeTab} onChange={setActiveTab}>
          <TabTrigger value="overview">Overview</TabTrigger>
          <TabTrigger value="flagged">Flagged Reports</TabTrigger>
          <TabTrigger value="users">Users</TabTrigger>
          <TabTrigger value="audit">Audit Trail</TabTrigger>
        </TabList>
        <TabContent value="overview" activeTab={activeTab}>
          {statsLoading ? (
            <div style={{ display: 'flex', gap: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
              <StatBox label="Total Scans" value={stats?.total || 0} icon={BarChart3} trend={12} />
              <StatBox label="Total Users" value={stats?.userCount || 0} icon={Users} trend={5} />
              <StatBox label="Flagged Reports" value={stats?.flaggedCount || 0} icon={Flag} trend={-2} />
              <StatBox label="Genuine" value={stats?.genuine || 0} icon={ShieldAlert} />
              <StatBox label="Fake Detected" value={stats?.fake || 0} icon={ShieldAlert} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            <Card>
              <CardHeader title="30-Day Threat Heatmap" />
              <CardBody style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} />
                    <YAxis stroke="#888" tick={{fill: '#888'}} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(10,10,14,0.9)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Line type="monotone" dataKey="genuine" stroke="var(--success)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fake" stroke="var(--error)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="suspicious" stroke="var(--warning)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Score Distribution" />
              <CardBody style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="range" stroke="#888" tick={{fill: '#888', fontSize: 12}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(10,10,14,0.9)', borderColor: 'rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </TabContent>

        <TabContent value="flagged" activeTab={activeTab}>
          {flaggedLoading ? <SkeletonCard /> : <FlaggedTable data={flaggedData?.reports} />}
        </TabContent>

        <TabContent value="users" activeTab={activeTab}>
          {usersLoading ? <SkeletonCard /> : <UsersTable data={usersData?.users} />}
        </TabContent>
        
        <TabContent value="audit" activeTab={activeTab}>
          <Card>
            <CardHeader title="Recent Moderation Activity" />
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: 16, borderBottom: '1px solid var(--panel-border)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,61,113,0.1)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Activity size={16} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>System Admin deleted flagged report #892{i}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--accent-muted)' }}>{i * 2} hours ago • Automated action based on threshold</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </TabContent>
      </Tabs>
    </div>
  );
}
