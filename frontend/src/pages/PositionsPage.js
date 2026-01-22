import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const levelLabels = {
  1: 'Staff',
  2: 'Supervisor',
  3: 'Manager',
  4: 'Director',
  5: 'C-Level',
};

const levelColors = {
  1: 'bg-slate-100 text-slate-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-amber-100 text-amber-700',
  5: 'bg-emerald-100 text-emerald-700',
};

const PositionsPage = () => {
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPos, setSelectedPos] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterDept, setFilterDept] = useState('all');
  const [formData, setFormData] = useState({
    nama: '',
    deskripsi: '',
    level: 1,
    department_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [posRes, deptRes] = await Promise.all([
        api.get('/positions'),
        api.get('/departments'),
      ]);
      setPositions(posRes.data);
      setDepartments(deptRes.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPositions = positions.filter(
    (pos) => filterDept === 'all' || pos.department_id === filterDept
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedPos) {
        await api.put(`/positions/${selectedPos.id}`, formData);
        toast.success('Posisi berhasil diperbarui');
      } else {
        await api.post('/positions', formData);
        toast.success('Posisi berhasil ditambahkan');
      }
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPos) return;
    setSubmitting(true);

    try {
      await api.delete(`/positions/${selectedPos.id}`);
      toast.success('Posisi berhasil dihapus');
      setShowDeleteDialog(false);
      setSelectedPos(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus data');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (pos) => {
    setSelectedPos(pos);
    setFormData({
      nama: pos.nama,
      deskripsi: pos.deskripsi || '',
      level: pos.level,
      department_id: pos.department_id,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setSelectedPos(null);
    setFormData({ nama: '', deskripsi: '', level: 1, department_id: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="positions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Posisi / Jabatan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola posisi dan jabatan karyawan
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="gap-2"
          data-testid="add-position-btn"
        >
          <Plus className="w-4 h-4" />
          Tambah Posisi
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-department">
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
            <p className="text-sm text-muted-foreground">
              {filteredPositions.length} posisi
            </p>
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
                  <TableHead>Nama Posisi</TableHead>
                  <TableHead>Departemen</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPositions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Belum ada posisi</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPositions.map((pos) => (
                    <TableRow key={pos.id} data-testid={`pos-row-${pos.nama.replace(/\s/g, '-')}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{pos.nama}</span>
                        </div>
                      </TableCell>
                      <TableCell>{pos.department_nama}</TableCell>
                      <TableCell>
                        <Badge className={levelColors[pos.level]} variant="secondary">
                          {levelLabels[pos.level]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {pos.deskripsi || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(pos)}
                            data-testid={`edit-pos-${pos.nama.replace(/\s/g, '-')}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedPos(pos);
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`delete-pos-${pos.nama.replace(/\s/g, '-')}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">
              {selectedPos ? 'Edit Posisi' : 'Tambah Posisi Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedPos
                ? 'Perbarui informasi posisi'
                : 'Isi form berikut untuk menambahkan posisi baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Posisi *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Software Engineer"
                required
                data-testid="form-nama"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_id">Departemen *</Label>
              <Select
                value={formData.department_id}
                onValueChange={(v) => setFormData({ ...formData, department_id: v })}
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
              <Label htmlFor="level">Level Jabatan *</Label>
              <Select
                value={String(formData.level)}
                onValueChange={(v) => setFormData({ ...formData, level: parseInt(v) })}
              >
                <SelectTrigger data-testid="form-level">
                  <SelectValue placeholder="Pilih level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Staff</SelectItem>
                  <SelectItem value="2">2 - Supervisor</SelectItem>
                  <SelectItem value="3">3 - Manager</SelectItem>
                  <SelectItem value="4">4 - Director</SelectItem>
                  <SelectItem value="5">5 - C-Level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                placeholder="Deskripsi posisi..."
                rows={3}
                data-testid="form-deskripsi"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} data-testid="form-submit">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : selectedPos ? (
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
            <DialogTitle className="font-['Manrope']">Hapus Posisi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus posisi <strong>{selectedPos?.nama}</strong>?
              Posisi yang masih memiliki karyawan tidak dapat dihapus.
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

export default PositionsPage;
