import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
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
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
  LogOut,
  AlertCircle,
  RefreshCw,
  Navigation,
  Building2,
  Home,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

const modeOptions = [
  { value: 'wfo', label: 'Work From Office', icon: Building2, color: 'text-blue-600' },
  { value: 'wfh', label: 'Work From Home', icon: Home, color: 'text-green-600' },
  { value: 'client_visit', label: 'Client Visit', icon: Briefcase, color: 'text-purple-600' },
];

const AttendancePage = () => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mode, setMode] = useState('wfo');
  const [clientAddress, setClientAddress] = useState('');
  const [showClockDialog, setShowClockDialog] = useState(false);
  const [clockType, setClockType] = useState(null); // 'in' or 'out'
  const [settings, setSettings] = useState(null);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    fetchData();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      const [attendanceRes, settingsRes, faceRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/settings'),
        api.get('/face/check'),
      ]);
      setTodayAttendance(attendanceRes.data);
      setSettings(settingsRes.data);
      setFaceRegistered(faceRes.data.registered);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = useCallback(() => {
    setGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung browser Anda');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGettingLocation(false);
      },
      (error) => {
        let message = 'Gagal mendapatkan lokasi';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Izin lokasi ditolak. Mohon aktifkan GPS.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Informasi lokasi tidak tersedia';
            break;
          case error.TIMEOUT:
            message = 'Permintaan lokasi timeout';
            break;
          default:
            break;
        }
        setLocationError(message);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoData = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedPhoto(photoData);
    stopCamera();
  };

  const openClockDialog = (type) => {
    setClockType(type);
    setCapturedPhoto(null);
    setLocation(null);
    setLocationError(null);
    setClientAddress('');
    setShowClockDialog(true);
    
    // Start getting location immediately
    setTimeout(() => {
      getLocation();
    }, 100);
  };

  const closeClockDialog = () => {
    setShowClockDialog(false);
    stopCamera();
    setCapturedPhoto(null);
    setLocation(null);
    setClockType(null);
  };

  const handleClock = async () => {
    if (!capturedPhoto) {
      toast.error('Silakan ambil foto terlebih dahulu');
      return;
    }

    if (!location) {
      toast.error('Lokasi belum didapatkan');
      return;
    }

    if (mode === 'client_visit' && !clientAddress.trim()) {
      toast.error('Alamat client wajib diisi');
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post('/attendance/clock', {
        tipe: clockType === 'in' ? 'clock_in' : 'clock_out',
        mode: mode,
        latitude: location.latitude,
        longitude: location.longitude,
        foto_url: capturedPhoto,
        catatan: null,
        alamat_client: mode === 'client_visit' ? clientAddress : null,
      });

      toast.success(clockType === 'in' ? 'Clock In berhasil!' : 'Clock Out berhasil!');
      setTodayAttendance(response.data);
      closeClockDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal melakukan absensi');
    } finally {
      setSubmitting(false);
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

  if (!user?.employee_id) {
    return (
      <div className="space-y-6" data-testid="attendance-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Absensi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sistem absensi dengan verifikasi lokasi dan foto
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Akun Anda belum terhubung dengan data karyawan. Hubungi HR untuk menghubungkan akun.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const canClockIn = !todayAttendance?.clock_in;
  const canClockOut = todayAttendance?.clock_in && !todayAttendance?.clock_out;

  return (
    <div className="space-y-6" data-testid="attendance-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
          Absensi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {formatDate(new Date().toISOString().split('T')[0])}
        </p>
      </div>

      {/* Today's Status Card */}
      <Card className="border-2 border-primary/20" data-testid="today-status-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-['Manrope'] flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Status Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!todayAttendance ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-muted-foreground mb-2">Belum ada absensi hari ini</p>
              <p className="text-sm text-muted-foreground">Silakan lakukan Clock In</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <LogIn className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clock In</p>
                    <p className="font-semibold text-lg">{formatTime(todayAttendance.clock_in)}</p>
                  </div>
                </div>
                <Badge 
                  className={todayAttendance.status === 'hadir' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                  variant="secondary"
                >
                  {todayAttendance.status}
                </Badge>
              </div>

              {todayAttendance.clock_out && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clock Out</p>
                      <p className="font-semibold text-lg">{formatTime(todayAttendance.clock_out)}</p>
                    </div>
                  </div>
                  {todayAttendance.total_jam && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-semibold">{todayAttendance.total_jam.toFixed(1)} jam</p>
                    </div>
                  )}
                </div>
              )}

              {todayAttendance.clock_in_mode && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="capitalize">{todayAttendance.clock_in_mode.replace('_', ' ')}</span>
                  {todayAttendance.catatan && <span>- {todayAttendance.catatan}</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          className="h-20 text-lg gap-3"
          onClick={() => openClockDialog('in')}
          disabled={!canClockIn}
          data-testid="clock-in-btn"
        >
          <LogIn className="w-6 h-6" />
          Clock In
        </Button>
        <Button
          size="lg"
          variant={canClockOut ? "default" : "secondary"}
          className="h-20 text-lg gap-3"
          onClick={() => openClockDialog('out')}
          disabled={!canClockOut}
          data-testid="clock-out-btn"
        >
          <LogOut className="w-6 h-6" />
          Clock Out
        </Button>
      </div>

      {/* Work Hours Info */}
      {settings && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Jam Kerja</span>
              <span className="font-medium">{settings.work_hours.start} - {settings.work_hours.end}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Toleransi Terlambat</span>
              <span className="font-medium">{settings.work_hours.late_tolerance_minutes} menit</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clock Dialog */}
      <Dialog open={showClockDialog} onOpenChange={setShowClockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Manrope']">
              {clockType === 'in' ? 'Clock In' : 'Clock Out'}
            </DialogTitle>
            <DialogDescription>
              Ambil foto selfie dan pastikan lokasi terdeteksi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="space-y-2">
              <Label>Mode Kerja</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger data-testid="mode-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className={`w-4 h-4 ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Address (for client visit) */}
            {mode === 'client_visit' && (
              <div className="space-y-2">
                <Label>Alamat Client *</Label>
                <Input
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Masukkan alamat client"
                  data-testid="client-address-input"
                />
              </div>
            )}

            {/* Camera Section */}
            <div className="space-y-2">
              <Label>Foto Selfie</Label>
              <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
                {!cameraActive && !capturedPhoto && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <Camera className="w-12 h-12 mb-2 opacity-50" />
                    <Button variant="secondary" onClick={startCamera} data-testid="start-camera-btn">
                      Buka Kamera
                    </Button>
                  </div>
                )}

                {cameraActive && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button onClick={capturePhoto} className="gap-2" data-testid="capture-btn">
                        <Camera className="w-4 h-4" />
                        Ambil Foto
                      </Button>
                    </div>
                  </>
                )}

                {capturedPhoto && (
                  <>
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCapturedPhoto(null);
                          startCamera();
                        }}
                        data-testid="retake-btn"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Ulang
                      </Button>
                    </div>
                    <div className="absolute top-2 left-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  </>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Location Section */}
            <div className="space-y-2">
              <Label>Lokasi</Label>
              <div className="p-3 bg-slate-50 rounded-lg">
                {gettingLocation ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mendapatkan lokasi...
                  </div>
                ) : locationError ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="w-4 h-4" />
                      {locationError}
                    </div>
                    <Button size="sm" variant="outline" onClick={getLocation}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                ) : location ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      ±{Math.round(location.accuracy)}m
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Lokasi belum didapatkan</span>
                    <Button size="sm" variant="outline" onClick={getLocation}>
                      <Navigation className="w-4 h-4 mr-1" />
                      Dapatkan
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* WFO Warning */}
            {mode === 'wfo' && location && settings && (
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Pastikan Anda berada dalam radius {settings.office_locations[0]?.radius || 100}m dari kantor
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              className="w-full h-12"
              onClick={handleClock}
              disabled={submitting || !capturedPhoto || !location}
              data-testid="submit-clock-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  {clockType === 'in' ? <LogIn className="w-4 h-4 mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  {clockType === 'in' ? 'Clock In Sekarang' : 'Clock Out Sekarang'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePage;
