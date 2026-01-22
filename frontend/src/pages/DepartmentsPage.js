import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
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
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nama: '',
    kode: '',
    deskripsi: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      toast.error('Gagal memuat data departemen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedDept) {
        await api.put(`/departments/${selectedDept.id}`, formData);
        toast.success('Departemen berhasil diperbarui');
      } else {
        await api.post('/departments', formData);
        toast.success('Departemen berhasil ditambahkan');
      }
      setShowDialog(false);
      resetForm();
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDept) return;
    setSubmitting(true);

    try {
      await api.delete(`/departments/${selectedDept.id}`);
      toast.success('Departemen berhasil dihapus');
      setShowDeleteDialog(false);
      setSelectedDept(null);
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus data');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (dept) => {
    setSelectedDept(dept);
    setFormData({
      nama: dept.nama,
      kode: dept.kode,
      deskripsi: dept.deskripsi || '',
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setSelectedDept(null);
    setFormData({ nama: '', kode: '', deskripsi: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="departments-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Departemen
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola struktur departemen perusahaan
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="gap-2"
          data-testid="add-department-btn"
        >
          <Plus className="w-4 h-4" />
          Tambah Departemen
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {departments.map((dept, index) => (
          <Card 
            key={dept.id} 
            className="animate-fade-in hover:shadow-md transition-shadow cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => openEditDialog(dept)}
            data-testid={`dept-card-${dept.kode}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{dept.jumlah_karyawan}</span>
                </div>
              </div>
              <h3 className="font-semibold mt-3">{dept.nama}</h3>
              <p className="text-xs text-muted-foreground font-mono">{dept.kode}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Departemen</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-center">Jumlah Karyawan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">Belum ada departemen</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept) => (
                    <TableRow key={dept.id} data-testid={`dept-row-${dept.kode}`}>
                      <TableCell className="font-mono font-medium">{dept.kode}</TableCell>
                      <TableCell className="font-medium">{dept.nama}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {dept.deskripsi || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-sm font-medium">
                          <Users className="w-3.5 h-3.5" />
                          {dept.jumlah_karyawan}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(dept)}
                            data-testid={`edit-dept-${dept.kode}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedDept(dept);
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`delete-dept-${dept.kode}`}
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
              {selectedDept ? 'Edit Departemen' : 'Tambah Departemen Baru'}
            </DialogTitle>
            <DialogDescription>
              {selectedDept
                ? 'Perbarui informasi departemen'
                : 'Isi form berikut untuk menambahkan departemen baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kode">Kode Departemen *</Label>
              <Input
                id="kode"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                placeholder="IT, HR, FIN, etc."
                required
                maxLength={10}
                data-testid="form-kode"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Departemen *</Label>
              <Input
                id="nama"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Information Technology"
                required
                data-testid="form-nama"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Textarea
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                placeholder="Deskripsi departemen..."
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
                ) : selectedDept ? (
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
            <DialogTitle className="font-['Manrope']">Hapus Departemen</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus departemen{' '}
              <strong>{selectedDept?.nama}</strong>? Departemen yang masih memiliki karyawan
              tidak dapat dihapus.
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

export default DepartmentsPage;
