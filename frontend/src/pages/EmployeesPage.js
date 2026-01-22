import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
import { Label } from '../components/ui/label';
import { Search, Plus, Eye, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  aktif: 'bg-green-100 text-green-700',
  'non-aktif': 'bg-gray-100 text-gray-700',
  cuti: 'bg-yellow-100 text-yellow-700',
  resign: 'bg-red-100 text-red-700',
};

const EmployeesPage = () => {
  const navigate = useNavigate();
  const { isHR } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nik: '',
    nama_lengkap: '',
    email: '',
    telepon: '',
    alamat: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    tanggal_bergabung: '',
    department_id: '',
    position_id: '',
    status: 'aktif',
    foto_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, deptRes, posRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/positions'),
      ]);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
      setPositions(posRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
      emp.nik.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || emp.department_id === filterDept;
    const matchStatus = filterStatus === 'all' || emp.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedEmployee) {
        await api.put(`/employees/${selectedEmployee.id}`, formData);
        toast.success('Karyawan berhasil diperbarui');
      } else {
        await api.post('/employees', formData);
        toast.success('Karyawan berhasil ditambahkan');
      }
      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);

    try {
      await api.delete(`/employees/${selectedEmployee.id}`);
      toast.success('Karyawan berhasil dihapus');
      setShowDeleteDialog(false);
      setSelectedEmployee(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus data');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (emp) => {
    setSelectedEmployee(emp);
    setFormData({
      nik: emp.nik,
      nama_lengkap: emp.nama_lengkap,
      email: emp.email,
      telepon: emp.telepon || '',
      alamat: emp.alamat || '',
      tanggal_lahir: emp.tanggal_lahir || '',
      jenis_kelamin: emp.jenis_kelamin || '',
      tanggal_bergabung: emp.tanggal_bergabung,
      department_id: emp.department_id,
      position_id: emp.position_id,
      status: emp.status,
      foto_url: emp.foto_url || '',
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setFormData({
      nik: '',
      nama_lengkap: '',
      email: '',
      telepon: '',
      alamat: '',
      tanggal_lahir: '',
      jenis_kelamin: '',
      tanggal_bergabung: '',
      department_id: '',
      position_id: '',
      status: 'aktif',
      foto_url: '',
    });
  };

  const filteredPositions = formData.department_id
    ? positions.filter((p) => p.department_id === formData.department_id)
    : positions;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="employees-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Data Karyawan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola data karyawan perusahaan Anda
          </p>
        </div>
        {isHR && (
          <Button
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
            className="gap-2"
            data-testid="add-employee-btn"
          >
            <Plus className="w-4 h-4" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIK, atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="search-input"
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-department">
                <SelectValue placeholder="Semua Departemen" />
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px]" data-testid="filter-status">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="non-aktif">Non-aktif</SelectItem>
                <SelectItem value="cuti">Cuti</SelectItem>
                <SelectItem value="resign">Resign</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Karyawan</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Posisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Tidak ada data karyawan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} data-testid={`employee-row-${emp.nik}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={emp.foto_url} alt={emp.nama_lengkap} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {emp.nama_lengkap.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{emp.nama_lengkap}</p>
                            <p className="text-sm text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{emp.nik}</TableCell>
                      <TableCell>{emp.department_nama}</TableCell>
                      <TableCell>{emp.position_nama}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[emp.status]} variant="secondary">
                          {emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            data-testid={`view-employee-${emp.nik}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isHR && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(emp)}
                                data-testid={`edit-employee-${emp.nik}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setShowDeleteDialog(true);
                                }}
                                data-testid={`delete-employee-${emp.nik}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">
              {selectedEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? 'Perbarui informasi karyawan'
                : 'Isi form berikut untuk menambahkan karyawan baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nik">NIK *</Label>
                <Input
                  id="nik"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  required
                  disabled={!!selectedEmployee}
                  data-testid="form-nik"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama_lengkap">Nama Lengkap *</Label>
                <Input
                  id="nama_lengkap"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  required
                  data-testid="form-nama"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="form-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telepon">Telepon</Label>
                <Input
                  id="telepon"
                  value={formData.telepon}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  data-testid="form-telepon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                <Input
                  id="tanggal_lahir"
                  type="date"
                  value={formData.tanggal_lahir}
                  onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                  data-testid="form-tgl-lahir"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                <Select
                  value={formData.jenis_kelamin}
                  onValueChange={(v) => setFormData({ ...formData, jenis_kelamin: v })}
                >
                  <SelectTrigger data-testid="form-jk">
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal_bergabung">Tanggal Bergabung *</Label>
                <Input
                  id="tanggal_bergabung"
                  type="date"
                  value={formData.tanggal_bergabung}
                  onChange={(e) => setFormData({ ...formData, tanggal_bergabung: e.target.value })}
                  required
                  data-testid="form-tgl-gabung"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_id">Departemen *</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(v) => setFormData({ ...formData, department_id: v, position_id: '' })}
                >
                  <SelectTrigger data-testid="form-dept">
                    <SelectValue placeholder="Pilih departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position_id">Posisi *</Label>
                <Select
                  value={formData.position_id}
                  onValueChange={(v) => setFormData({ ...formData, position_id: v })}
                  disabled={!formData.department_id}
                >
                  <SelectTrigger data-testid="form-pos">
                    <SelectValue placeholder="Pilih posisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPositions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger data-testid="form-status">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="non-aktif">Non-aktif</SelectItem>
                    <SelectItem value="cuti">Cuti</SelectItem>
                    <SelectItem value="resign">Resign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  data-testid="form-alamat"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="foto_url">URL Foto</Label>
                <Input
                  id="foto_url"
                  value={formData.foto_url}
                  onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  placeholder="https://..."
                  data-testid="form-foto"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting} data-testid="form-submit">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : selectedEmployee ? (
                  'Perbarui'
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">Hapus Karyawan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus karyawan{' '}
              <strong>{selectedEmployee?.nama_lengkap}</strong>? Tindakan ini tidak dapat
              dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              data-testid="confirm-delete"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;
