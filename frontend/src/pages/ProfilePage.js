import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Loader2, User, Mail, Shield, Calendar, Building2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const roleLabels = {
  super_admin: 'Super Admin',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Karyawan',
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    telepon: '',
    alamat: '',
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      if (user?.employee_id) {
        try {
          const response = await api.get(`/employees/${user.employee_id}`);
          setEmployee(response.data);
          setFormData({
            telepon: response.data.telepon || '',
            alamat: response.data.alamat || '',
          });
        } catch (error) {
          console.error('Failed to fetch employee:', error);
        }
      }
      setLoading(false);
    };
    fetchEmployee();
  }, [user]);

  const handleSave = async () => {
    if (!employee) return;
    setSaving(true);

    try {
      await api.put(`/employees/${employee.id}`, formData);
      toast.success('Profil berhasil diperbarui');
      setEmployee({ ...employee, ...formData });
    } catch (error) {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="profile-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
          Profil Saya
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola informasi akun dan data pribadi Anda
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={employee?.foto_url} alt={user?.nama_lengkap} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                  {user?.nama_lengkap?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold font-['Manrope']">{user?.nama_lengkap}</h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <Badge className="mt-3 bg-primary/10 text-primary" variant="secondary">
                {roleLabels[user?.role] || user?.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-['Manrope'] text-lg">Informasi Akun</CardTitle>
            <CardDescription>Data akun sistem Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                  <p className="text-sm font-medium">{user?.nama_lengkap}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium">{roleLabels[user?.role] || user?.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Terdaftar Sejak</p>
                  <p className="text-sm font-medium">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Info (if linked) */}
        {employee && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="font-['Manrope'] text-lg">Data Karyawan</CardTitle>
              <CardDescription>
                Informasi karyawan yang terhubung dengan akun ini
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">NIK</p>
                    <p className="text-sm font-medium font-mono">{employee.nik}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Departemen</p>
                    <p className="text-sm font-medium">{employee.department_nama}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Posisi</p>
                    <p className="text-sm font-medium">{employee.position_nama}</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <h4 className="text-sm font-semibold mb-4">Edit Informasi Kontak</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telepon">Telepon</Label>
                  <Input
                    id="telepon"
                    value={formData.telepon}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    data-testid="input-telepon"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alamat">Alamat</Label>
                  <Input
                    id="alamat"
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Alamat lengkap"
                    data-testid="input-alamat"
                  />
                </div>
              </div>
              <div className="mt-6">
                <Button onClick={handleSave} disabled={saving} data-testid="save-profile-btn">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No employee linked */}
        {!employee && (
          <Card className="lg:col-span-3">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  Akun Anda belum terhubung dengan data karyawan.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hubungi HR untuk menghubungkan akun dengan data karyawan.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
