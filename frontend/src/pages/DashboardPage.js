import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Building2, Briefcase, UserPlus, TrendingUp, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const StatCard = ({ title, value, icon: Icon, description, color = 'primary', delay = 0 }) => (
  <Card 
    className="animate-fade-in hover:shadow-lg transition-shadow duration-300" 
    style={{ animationDelay: `${delay}ms` }}
    data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}
  >
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground font-['Manrope']">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}/10`}>
          <Icon className={`w-6 h-6 text-${color}`} style={{ color: color === 'primary' ? '#0F62FE' : color === 'success' ? '#10B981' : color === 'warning' ? '#F59E0B' : '#0F62FE' }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const COLORS = ['#0F62FE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Welcome Section */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-['Manrope'] tracking-tight">
          Selamat Datang, {user?.nama_lengkap?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Berikut adalah ringkasan data HR perusahaan Anda
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Karyawan"
          value={stats?.total_karyawan || 0}
          icon={Users}
          description="Seluruh karyawan terdaftar"
          color="primary"
          delay={0}
        />
        <StatCard
          title="Karyawan Aktif"
          value={stats?.karyawan_aktif || 0}
          icon={UserCheck}
          description={`${stats?.karyawan_nonaktif || 0} non-aktif`}
          color="success"
          delay={50}
        />
        <StatCard
          title="Total Departemen"
          value={stats?.total_departemen || 0}
          icon={Building2}
          color="warning"
          delay={100}
        />
        <StatCard
          title="Total Posisi"
          value={stats?.total_posisi || 0}
          icon={Briefcase}
          color="primary"
          delay={150}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Karyawan per Departemen */}
        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }} data-testid="chart-department">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-['Manrope']">
              Karyawan per Departemen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {stats?.karyawan_per_departemen?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.karyawan_per_departemen} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="nama" 
                      type="category" 
                      width={120} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }} 
                    />
                    <Bar 
                      dataKey="jumlah" 
                      fill="#0F62FE" 
                      radius={[0, 4, 4, 0]}
                      name="Jumlah Karyawan"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Belum ada data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Status Karyawan */}
        <Card className="animate-fade-in" style={{ animationDelay: '250ms' }} data-testid="chart-status">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-['Manrope']">
              Status Karyawan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {stats?.karyawan_per_status?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.karyawan_per_status}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="jumlah"
                      nameKey="status"
                      label={({ status, jumlah }) => `${status}: ${jumlah}`}
                    >
                      {stats.karyawan_per_status.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Belum ada data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="animate-fade-in" style={{ animationDelay: '300ms' }} data-testid="quick-stats">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-['Manrope']">
                  {stats?.karyawan_baru_bulan_ini || 0}
                </p>
                <p className="text-sm text-muted-foreground">Karyawan baru bulan ini</p>
              </div>
            </div>
            <div className="h-12 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-['Manrope']">
                  {stats?.total_karyawan > 0 
                    ? Math.round((stats.karyawan_aktif / stats.total_karyawan) * 100) 
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Tingkat karyawan aktif</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
