import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  User,
  Pencil,
} from 'lucide-react';

const statusColors = {
  aktif: 'bg-green-100 text-green-700',
  'non-aktif': 'bg-gray-100 text-gray-700',
  cuti: 'bg-yellow-100 text-yellow-700',
  resign: 'bg-red-100 text-red-700',
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value || '-'}</p>
    </div>
  </div>
);

const EmployeeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isHR } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await api.get(`/employees/${id}`);
        setEmployee(response.data);
      } catch (error) {
        console.error('Failed to fetch employee:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Karyawan tidak ditemukan</p>
        <Button variant="outline" onClick={() => navigate('/employees')} className="mt-4">
          Kembali
        </Button>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6" data-testid="employee-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/employees')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Detail Karyawan
          </h1>
          <p className="text-muted-foreground text-sm">
            Informasi lengkap karyawan
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={employee.foto_url} alt={employee.nama_lengkap} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                  {employee.nama_lengkap.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold font-['Manrope']">{employee.nama_lengkap}</h2>
              <p className="text-muted-foreground text-sm">{employee.position_nama}</p>
              <Badge className={`mt-3 ${statusColors[employee.status]}`} variant="secondary">
                {employee.status}
              </Badge>
              
              <Separator className="my-6" />
              
              <div className="w-full space-y-4">
                <InfoItem icon={Mail} label="Email" value={employee.email} />
                <InfoItem icon={Phone} label="Telepon" value={employee.telepon} />
                <InfoItem icon={MapPin} label="Alamat" value={employee.alamat} />
              </div>

              {isHR && (
                <>
                  <Separator className="my-6" />
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => navigate(`/employees`)}
                    data-testid="edit-btn"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Karyawan
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-['Manrope']">Informasi Karyawan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Data Pribadi
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem icon={User} label="NIK" value={employee.nik} />
                <InfoItem
                  icon={User}
                  label="Jenis Kelamin"
                  value={employee.jenis_kelamin === 'L' ? 'Laki-laki' : employee.jenis_kelamin === 'P' ? 'Perempuan' : '-'}
                />
                <InfoItem icon={Calendar} label="Tanggal Lahir" value={formatDate(employee.tanggal_lahir)} />
              </div>
            </div>

            <Separator />

            {/* Work Info */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Informasi Pekerjaan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoItem icon={Building2} label="Departemen" value={employee.department_nama} />
                <InfoItem icon={Briefcase} label="Posisi" value={employee.position_nama} />
                <InfoItem icon={Calendar} label="Tanggal Bergabung" value={formatDate(employee.tanggal_bergabung)} />
                <InfoItem icon={User} label="Status" value={employee.status} />
              </div>
            </div>

            <Separator />

            {/* Timeline placeholder */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Riwayat
              </h3>
              <div className="bg-slate-50 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Fitur riwayat akan tersedia di Fase berikutnya
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDetailPage;
