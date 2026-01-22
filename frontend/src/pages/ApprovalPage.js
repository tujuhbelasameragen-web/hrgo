import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Calendar,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

const ApprovalPage = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestType, setRequestType] = useState('leave'); // leave or overtime

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaveRes, overtimeRes] = await Promise.all([
        api.get('/leave/pending'),
        api.get('/overtime/requests?status=pending'),
      ]);
      setLeaveRequests(leaveRes.data);
      setOvertimeRequests(overtimeRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, type) => {
    setSubmitting(true);
    try {
      const endpoint = type === 'leave' ? `/leave/${id}/approve` : `/overtime/${id}/approve`;
      await api.post(endpoint, { action: 'approve' });
      toast.success('Pengajuan disetujui');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyetujui');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() && requestType === 'leave') {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = requestType === 'leave' 
        ? `/leave/${selectedRequest.id}/approve`
        : `/overtime/${selectedRequest.id}/approve`;
      await api.post(endpoint, { action: 'reject', alasan: rejectReason });
      toast.success('Pengajuan ditolak');
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menolak');
    } finally {
      setSubmitting(false);
    }
  };

  const openRejectDialog = (request, type) => {
    setSelectedRequest(request);
    setRequestType(type);
    setRejectReason('');
    setShowRejectDialog(true);
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

  const totalPending = leaveRequests.length + overtimeRequests.length;

  return (
    <div className="space-y-6" data-testid="approval-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
          Persetujuan
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Setujui atau tolak pengajuan cuti dan lembur
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPending}</p>
                <p className="text-xs text-muted-foreground">Total Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{leaveRequests.length}</p>
                <p className="text-xs text-muted-foreground">Pengajuan Cuti</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overtimeRequests.length}</p>
                <p className="text-xs text-muted-foreground">Pengajuan Lembur</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leave" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leave" className="gap-2">
            <Calendar className="w-4 h-4" />
            Cuti ({leaveRequests.length})
          </TabsTrigger>
          <TabsTrigger value="overtime" className="gap-2">
            <Clock className="w-4 h-4" />
            Lembur ({overtimeRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Jenis Cuti</TableHead>
                      <TableHead>Periode</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500/50 mb-3" />
                          <p className="text-muted-foreground">Tidak ada pengajuan cuti pending</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveRequests.map((req) => (
                        <TableRow key={req.id} data-testid={`leave-row-${req.id}`}>
                          <TableCell className="font-medium">{req.employee_nama}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{req.tipe_cuti_nama}</Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(req.tanggal_mulai)} - {formatDate(req.tanggal_selesai)}
                          </TableCell>
                          <TableCell>{req.jumlah_hari} hari</TableCell>
                          <TableCell className="max-w-xs truncate" title={req.alasan}>
                            {req.alasan}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleApprove(req.id, 'leave')}
                                disabled={submitting}
                                data-testid={`approve-leave-${req.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Setuju
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => openRejectDialog(req, 'leave')}
                                disabled={submitting}
                                data-testid={`reject-leave-${req.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Tolak
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jam</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Alasan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overtimeRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <CheckCircle className="w-12 h-12 mx-auto text-green-500/50 mb-3" />
                          <p className="text-muted-foreground">Tidak ada pengajuan lembur pending</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      overtimeRequests.map((req) => (
                        <TableRow key={req.id} data-testid={`overtime-row-${req.id}`}>
                          <TableCell className="font-medium">{req.employee_nama}</TableCell>
                          <TableCell>{formatDate(req.tanggal)}</TableCell>
                          <TableCell>{req.jam_mulai} - {req.jam_selesai}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{req.total_jam} jam</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={req.alasan}>
                            {req.alasan}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleApprove(req.id, 'overtime')}
                                disabled={submitting}
                                data-testid={`approve-overtime-${req.id}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Setuju
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => openRejectDialog(req, 'overtime')}
                                disabled={submitting}
                                data-testid={`reject-overtime-${req.id}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Tolak
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">Tolak Pengajuan</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan untuk {selectedRequest?.employee_nama}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Alasan penolakan..."
                rows={3}
                data-testid="reject-reason-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
              data-testid="confirm-reject"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Tolak'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalPage;
