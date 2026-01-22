import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Trash2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Disetujui', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
};

const LeaveRequestPage = () => {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState({});
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tipe_cuti: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    alasan: '',
    lampiran_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesRes, balancesRes, requestsRes] = await Promise.all([
        api.get('/leave/types'),
        api.get('/leave/balance'),
        api.get('/leave/requests'),
      ]);
      setLeaveTypes(typesRes.data);
      setBalances(balancesRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/leave/request', formData);
      toast.success('Pengajuan cuti berhasil dikirim');
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal mengajukan cuti');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.delete(`/leave/${id}`);
      toast.success('Pengajuan dibatalkan');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal membatalkan');
    }
  };

  const resetForm = () => {
    setFormData({
      tipe_cuti: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
      alasan: '',
      lampiran_url: '',
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="leave-request-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Pengajuan Cuti
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ajukan cuti atau izin tidak masuk kerja
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2" data-testid="new-request-btn">
          <Plus className="w-4 h-4" />
          Ajukan Cuti
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {balances.map((balance) => (
          <Card key={balance.tipe_cuti} className="animate-fade-in" data-testid={`balance-${balance.tipe_cuti}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{balance.nama}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">{balance.sisa}</span>
                <span className="text-sm text-muted-foreground">/ {balance.jatah}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Terpakai: {balance.terpakai}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-['Manrope']">Riwayat Pengajuan</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal Pengajuan</TableHead>
                  <TableHead>Jenis Cuti</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Jumlah Hari</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Belum ada pengajuan cuti</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id} data-testid={`request-row-${req.id}`}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">{req.tipe_cuti_nama}</TableCell>
                      <TableCell>
                        {formatDate(req.tanggal_mulai)} - {formatDate(req.tanggal_selesai)}
                      </TableCell>
                      <TableCell>{req.jumlah_hari} hari</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[req.status]?.color} variant="secondary">
                          {statusConfig[req.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleCancel(req.id)}
                            data-testid={`cancel-${req.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {req.status === 'rejected' && req.rejected_reason && (
                          <span className="text-xs text-red-600" title={req.rejected_reason}>
                            {req.rejected_reason.substring(0, 20)}...
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">Ajukan Cuti</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk mengajukan cuti
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Cuti *</Label>
              <Select
                value={formData.tipe_cuti}
                onValueChange={(v) => setFormData({ ...formData, tipe_cuti: v })}
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Pilih jenis cuti" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leaveTypes).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={formData.tanggal_mulai}
                  onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                  required
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai *</Label>
                <Input
                  type="date"
                  value={formData.tanggal_selesai}
                  onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                  required
                  data-testid="input-end-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alasan *</Label>
              <Textarea
                value={formData.alasan}
                onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                placeholder="Jelaskan alasan cuti..."
                rows={3}
                required
                data-testid="input-reason"
              />
            </div>

            {formData.tipe_cuti === 'sakit' && (
              <div className="space-y-2">
                <Label>Lampiran (Surat Dokter)</Label>
                <Input
                  value={formData.lampiran_url}
                  onChange={(e) => setFormData({ ...formData, lampiran_url: e.target.value })}
                  placeholder="URL lampiran..."
                  data-testid="input-attachment"
                />
              </div>
            )}

            {formData.tipe_cuti && leaveTypes[formData.tipe_cuti] && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-blue-800">
                    <p>Minimal pengajuan: <strong>{leaveTypes[formData.tipe_cuti].min_hari_pengajuan}</strong> hari sebelumnya</p>
                    <p>Maksimal: <strong>{leaveTypes[formData.tipe_cuti].max_hari}</strong> hari</p>
                    <p>Approval: <strong>{leaveTypes[formData.tipe_cuti].approval_level === 'hr' ? 'HR' : 'Manager'}</strong></p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} data-testid="submit-request">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  'Ajukan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveRequestPage;
