import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Plus,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

const ShiftManagementPage = () => {
  const { user, isHR } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterDept, setFilterDept] = useState('all');

  const [shiftForm, setShiftForm] = useState({
    nama: '',
    jam_masuk: '08:00',
    jam_keluar: '17:00',
    warna: '#0F62FE',
  });

  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    shift_id: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shiftsRes, assignmentsRes, employeesRes, deptsRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/shifts/assignments'),
        api.get('/employees'),
        api.get('/departments'),
      ]);
      setShifts(shiftsRes.data);
      setAssignments(assignmentsRes.data);
      setEmployees(employeesRes.data);
      setDepartments(deptsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedShift) {
        await api.put(`/shifts/${selectedShift.id}`, shiftForm);
        toast.success('Shift berhasil diperbarui');
      } else {
        await api.post('/shifts', shiftForm);
        toast.success('Shift berhasil dibuat');
      }
      setShowShiftDialog(false);
      resetShiftForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (id) => {
    try {
      await api.delete(`/shifts/${id}`);
      toast.success('Shift berhasil dihapus');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus shift');
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/shifts/assign', assignForm);
      toast.success('Shift berhasil diassign');
      setShowAssignDialog(false);
      resetAssignForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal assign shift');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditShift = (shift) => {
    setSelectedShift(shift);
    setShiftForm({
      nama: shift.nama,
      jam_masuk: shift.jam_masuk,
      jam_keluar: shift.jam_keluar,
      warna: shift.warna,
    });
    setShowShiftDialog(true);
  };

  const resetShiftForm = () => {
    setSelectedShift(null);
    setShiftForm({
      nama: '',
      jam_masuk: '08:00',
      jam_keluar: '17:00',
      warna: '#0F62FE',
    });
  };

  const resetAssignForm = () => {
    setAssignForm({
      employee_id: '',
      shift_id: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
    });
  };

  const filteredAssignments = filterDept === 'all'
    ? assignments
    : assignments.filter(a => {
        const emp = employees.find(e => e.id === a.employee_id);
        return emp?.department_id === filterDept;
      });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="shift-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Manajemen Shift
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola jadwal shift dan assign ke karyawan
          </p>
        </div>
        {isHR && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetShiftForm();
                setShowShiftDialog(true);
              }}
              className="gap-2"
              data-testid="new-shift-btn"
            >
              <Plus className="w-4 h-4" />
              Buat Shift
            </Button>
            <Button
              onClick={() => {
                resetAssignForm();
                setShowAssignDialog(true);
              }}
              className="gap-2"
              data-testid="assign-shift-btn"
            >
              <Users className="w-4 h-4" />
              Assign Shift
            </Button>
          </div>
        )}
      </div>

      {/* Shift Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shifts.map((shift) => (
          <Card 
            key={shift.id} 
            className="animate-fade-in hover:shadow-md transition-shadow"
            data-testid={`shift-card-${shift.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${shift.warna}20` }}
                  >
                    <Clock className="w-5 h-5" style={{ color: shift.warna }} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{shift.nama}</h3>
                    <p className="text-sm text-muted-foreground">
                      {shift.jam_masuk} - {shift.jam_keluar}
                    </p>
                  </div>
                </div>
                {isHR && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditShift(shift)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteShift(shift.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {assignments.filter(a => a.shift_id === shift.id).length} karyawan
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {shifts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Belum ada shift dibuat</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-['Manrope']">Jadwal Shift Karyawan</CardTitle>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[200px]" data-testid="filter-dept">
                <SelectValue placeholder="Filter Departemen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Jam Kerja</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Selesai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Belum ada karyawan dengan shift</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => {
                    const shift = shifts.find(s => s.id === assignment.shift_id);
                    return (
                      <TableRow key={assignment.id} data-testid={`assignment-row-${assignment.id}`}>
                        <TableCell className="font-medium">
                          {assignment.employee_nama}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: `${shift?.warna}20`,
                              color: shift?.warna 
                            }}
                          >
                            {assignment.shift_nama}
                          </Badge>
                        </TableCell>
                        <TableCell>{assignment.shift_jam}</TableCell>
                        <TableCell>{assignment.tanggal_mulai}</TableCell>
                        <TableCell>{assignment.tanggal_selesai || 'Tidak ditentukan'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Shift Dialog */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">
              {selectedShift ? 'Edit Shift' : 'Buat Shift Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedShift ? 'Perbarui informasi shift' : 'Isi form untuk membuat shift baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateShift} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Shift *</Label>
              <Input
                value={shiftForm.nama}
                onChange={(e) => setShiftForm({ ...shiftForm, nama: e.target.value })}
                placeholder="Shift Pagi"
                required
                data-testid="input-shift-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jam Masuk *</Label>
                <Input
                  type="time"
                  value={shiftForm.jam_masuk}
                  onChange={(e) => setShiftForm({ ...shiftForm, jam_masuk: e.target.value })}
                  required
                  data-testid="input-shift-start"
                />
              </div>
              <div className="space-y-2">
                <Label>Jam Keluar *</Label>
                <Input
                  type="time"
                  value={shiftForm.jam_keluar}
                  onChange={(e) => setShiftForm({ ...shiftForm, jam_keluar: e.target.value })}
                  required
                  data-testid="input-shift-end"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={shiftForm.warna}
                  onChange={(e) => setShiftForm({ ...shiftForm, warna: e.target.value })}
                  className="w-12 h-10 p-1"
                  data-testid="input-shift-color"
                />
                <Input
                  value={shiftForm.warna}
                  onChange={(e) => setShiftForm({ ...shiftForm, warna: e.target.value })}
                  placeholder="#0F62FE"
                  className="flex-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowShiftDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} data-testid="submit-shift">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : selectedShift ? 'Perbarui' : 'Buat'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">Assign Shift</DialogTitle>
            <DialogDescription>
              Pilih karyawan dan shift yang akan di-assign
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div className="space-y-2">
              <Label>Karyawan *</Label>
              <Select
                value={assignForm.employee_id}
                onValueChange={(v) => setAssignForm({ ...assignForm, employee_id: v })}
              >
                <SelectTrigger data-testid="select-employee">
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nama_lengkap} - {emp.department_nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Shift *</Label>
              <Select
                value={assignForm.shift_id}
                onValueChange={(v) => setAssignForm({ ...assignForm, shift_id: v })}
              >
                <SelectTrigger data-testid="select-shift">
                  <SelectValue placeholder="Pilih shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.nama} ({shift.jam_masuk} - {shift.jam_keluar})
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
                  value={assignForm.tanggal_mulai}
                  onChange={(e) => setAssignForm({ ...assignForm, tanggal_mulai: e.target.value })}
                  required
                  data-testid="input-assign-start"
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={assignForm.tanggal_selesai}
                  onChange={(e) => setAssignForm({ ...assignForm, tanggal_selesai: e.target.value })}
                  data-testid="input-assign-end"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} data-testid="submit-assign">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftManagementPage;
