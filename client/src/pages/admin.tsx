import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, MessageSquare, Activity, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PortfolioStats {
  totalViews: number;
  totalInteractions: number;
  totalMessages: number;
  unreadMessages: number;
  popularProjects: Record<string, number>;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Admin() {
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, messagesResponse] = await Promise.all([
          apiRequest("/api/portfolio/stats"),
          apiRequest("/api/contact/messages")
        ]);
        
        setStats(statsResponse);
        setMessages(messagesResponse);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const markAsRead = async (messageId: number) => {
    try {
      await apiRequest(`/api/contact/messages/${messageId}/read`, {
        method: "PATCH"
      });
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      );
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  const projectData = stats ? Object.entries(stats.popularProjects).map(([name, count]) => ({
    name: name.replace(/\s+/g, '\n'),
    count
  })) : [];

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Portfolio Analytics Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glossy-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Views</p>
                <p className="text-2xl font-bold text-blue-400">{stats?.totalViews || 0}</p>
              </div>
              <Eye className="text-blue-400" size={24} />
            </div>
          </div>

          <div className="glossy-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Project Interactions</p>
                <p className="text-2xl font-bold text-emerald-400">{stats?.totalInteractions || 0}</p>
              </div>
              <Activity className="text-emerald-400" size={24} />
            </div>
          </div>

          <div className="glossy-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Messages</p>
                <p className="text-2xl font-bold text-purple-400">{stats?.totalMessages || 0}</p>
              </div>
              <MessageSquare className="text-purple-400" size={24} />
            </div>
          </div>

          <div className="glossy-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Unread Messages</p>
                <p className="text-2xl font-bold text-orange-400">{stats?.unreadMessages || 0}</p>
              </div>
              <TrendingUp className="text-orange-400" size={24} />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="glossy-card rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Popular Projects</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glossy-card rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Project Interaction Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {projectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contact Messages */}
        <div className="glossy-card rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Contact Messages</h3>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-white/60">No messages yet.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border ${
                    message.isRead 
                      ? 'bg-gray-800/50 border-gray-700' 
                      : 'bg-blue-900/20 border-blue-400/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-white">{message.name}</h4>
                      <p className="text-sm text-white/60">{message.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/60">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </p>
                      {!message.isRead && (
                        <button
                          onClick={() => markAsRead(message.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                  {message.subject && (
                    <p className="text-sm text-white/80 font-medium mb-2">
                      Subject: {message.subject}
                    </p>
                  )}
                  <p className="text-white/70 text-sm">{message.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}