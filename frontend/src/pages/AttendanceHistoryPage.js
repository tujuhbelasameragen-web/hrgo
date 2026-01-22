import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Clock,
  CalendarIcon,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  MapPin,
  Building2,
  Home,
  Briefcase,
  Eye,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const statusConfig = {
  hadir: { label: 'Hadir', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  terlambat: { label: 'Terlambat', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  alpha: { label: 'Alpha', color: 'bg-red-100 text-red-700', icon: XCircle },
  izin: { label: 'Izin', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
};

const modeConfig = {
  wfo: { label: 'WFO', icon: Building2, color: 'text-blue-600' },
  wfh: { label: 'WFH', icon: Home, color: 'text-green-600' },
  client_visit: { label: 'Client', icon: Briefcase, color: 'text-purple-600' },
};

const AttendanceHistoryPage = () => {
  const { user, isHR } = useAuth();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedEmployee, selectedMonth]);

  useEffect(() => {
    if (isHR) {
      fetchEmployees();
    }
  }, [isHR]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`;

      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      if (selectedEmployee !== 'all') {
        params.append('employee_id', selectedEmployee);
      }

      const [historyRes, statsRes] = await Promise.all([
        api.get(`/attendance/history?${params.toString()}`),
        api.get(`/attendance/stats?month=${selectedMonth}${selectedEmployee !== 'all' ? `&employee_id=${selectedEmployee}` : ''}`),
      ]);

      setHistory(historyRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const openDetail = (attendance) => {
    setSelectedAttendance(attendance);
    setShowDetailDialog(true);
  };

  // Generate month options for the last 12 months
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy', { locale: id });
    monthOptions.push({ value, label });
  }

  return (
    <div className="space-y-6" data-testid="attendance-history-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
          Riwayat Absensi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Lihat riwayat kehadiran dan statistik
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card data-testid="stat-hari-kerja">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_hari_kerja}</p>
                  <p className="text-xs text-muted-foreground">Hari Kerja</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-hadir">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_hadir}</p>
                  <p className="text-xs text-muted-foreground">Hadir</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-terlambat">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_terlambat}</p>
                  <p className="text-xs text-muted-foreground">Terlambat</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-alpha">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_alpha}</p>
                  <p className="text-xs text-muted-foreground">Alpha</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="stat-persentase">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.persentase_kehadiran}%</p>
                  <p className="text-xs text-muted-foreground">Kehadiran</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="month-filter">
                <CalendarIcon className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isHR && (
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-full sm:w-[250px]" data-testid="employee-filter">
                  <SelectValue placeholder="Semua Karyawan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Karyawan</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nama_lengkap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Tidak ada data absensi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    {isHR && <TableHead>Karyawan</TableHead>}
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Total Jam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((att) => {
                    const StatusIcon = statusConfig[att.status]?.icon || CheckCircle;
                    const ModeIcon = modeConfig[att.clock_in_mode]?.icon || Building2;

                    return (
                      <TableRow key={att.id} data-testid={`attendance-row-${att.tanggal}`}>
                        <TableCell className="font-medium">
                          {formatDate(att.tanggal)}
                        </TableCell>
                        {isHR && (
                          <TableCell>{att.employee_nama}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            {formatTime(att.clock_in)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            {formatTime(att.clock_out)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {att.clock_in_mode && (
                            <div className="flex items-center gap-1">
                              <ModeIcon className={`w-4 h-4 ${modeConfig[att.clock_in_mode]?.color}`} />
                              <span className="text-sm">{modeConfig[att.clock_in_mode]?.label}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {att.total_jam ? `${att.total_jam.toFixed(1)} jam` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[att.status]?.color} variant="secondary">
                            {statusConfig[att.status]?.label || att.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetail(att)}
                            data-testid={`view-detail-${att.tanggal}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">
              Detail Absensi - {selectedAttendance?.tanggal && formatDate(selectedAttendance.tanggal)}
            </DialogTitle>
          </DialogHeader>

          {selectedAttendance && (
            <div className="space-y-4">
              {isHR && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Karyawan</p>
                  <p className="font-medium">{selectedAttendance.employee_nama}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Clock In */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Clock In</p>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-700">
                      {formatTime(selectedAttendance.clock_in)}
                    </p>
                    {selectedAttendance.clock_in_mode && (
                      <p className="text-xs text-green-600 capitalize mt-1">
                        {selectedAttendance.clock_in_mode.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  {selectedAttendance.clock_in_foto && (
                    <img
                      src={selectedAttendance.clock_in_foto}
                      alt="Clock In"
                      className="w-full rounded-lg"
                    />
                  )}
                </div>

                {/* Clock Out */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Clock Out</p>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-700">
                      {formatTime(selectedAttendance.clock_out)}
                    </p>
                    {selectedAttendance.clock_out_mode && (
                      <p className="text-xs text-blue-600 capitalize mt-1">
                        {selectedAttendance.clock_out_mode.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  {selectedAttendance.clock_out_foto && (
                    <img
                      src={selectedAttendance.clock_out_foto}
                      alt="Clock Out"
                      className="w-full rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Jam Kerja</p>
                  <p className="font-bold text-lg">
                    {selectedAttendance.total_jam ? `${selectedAttendance.total_jam.toFixed(1)} jam` : '-'}
                  </p>
                </div>
                <Badge className={statusConfig[selectedAttendance.status]?.color} variant="secondary">
                  {statusConfig[selectedAttendance.status]?.label || selectedAttendance.status}
                </Badge>
              </div>

              {/* Location */}
              {(selectedAttendance.clock_in_latitude || selectedAttendance.clock_out_latitude) && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Lokasi
                  </p>
                  {selectedAttendance.clock_in_latitude && (
                    <p className="text-xs text-muted-foreground">
                      In: {selectedAttendance.clock_in_latitude.toFixed(6)}, {selectedAttendance.clock_in_longitude.toFixed(6)}
                    </p>
                  )}
                  {selectedAttendance.clock_out_latitude && (
                    <p className="text-xs text-muted-foreground">
                      Out: {selectedAttendance.clock_out_latitude.toFixed(6)}, {selectedAttendance.clock_out_longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedAttendance.catatan && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="font-medium">{selectedAttendance.catatan}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceHistoryPage;
