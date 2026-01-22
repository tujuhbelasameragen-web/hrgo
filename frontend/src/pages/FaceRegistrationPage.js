import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import {
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle,
  ScanFace,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

// Load face-api.js models from CDN
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

const FaceRegistrationPage = () => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [faceapi, setFaceapi] = useState(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    loadFaceApiModels();
    checkRegistration();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const loadFaceApiModels = async () => {
    try {
      // Dynamically import face-api.js
      const faceapiModule = await import('@vladmandic/face-api');
      setFaceapi(faceapiModule);
      
      setLoadingProgress(10);
      
      // Load models
      await faceapiModule.nets.tinyFaceDetector.loadFromUri(MODELS_URL);
      setLoadingProgress(40);
      
      await faceapiModule.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
      setLoadingProgress(70);
      
      await faceapiModule.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
      setLoadingProgress(100);
      
      setModelsLoaded(true);
      setModelsLoading(false);
    } catch (error) {
      console.error('Failed to load face-api models:', error);
      setModelsLoading(false);
      toast.error('Gagal memuat model pengenalan wajah');
    }
  };

  const checkRegistration = async () => {
    try {
      const response = await api.get('/face/check');
      setIsRegistered(response.data.registered);
    } catch (error) {
      console.error('Failed to check registration:', error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 } 
        },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);
        
        // Start face detection after video loads
        videoRef.current.onloadedmetadata = () => {
          startFaceDetection();
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Gagal mengakses kamera');
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
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setCameraActive(false);
    setFaceDetected(false);
  };

  const startFaceDetection = () => {
    if (!faceapi || !videoRef.current) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !cameraActive) return;

      try {
        const detections = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        setFaceDetected(!!detections);
        
        // Draw detection box on canvas
        if (canvasRef.current && videoRef.current) {
          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight,
          };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          if (detections) {
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
          }
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    }, 200);
  };

  const captureAndExtract = async () => {
    if (!faceapi || !videoRef.current) return;

    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        toast.error('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas.');
        return;
      }

      setCapturedDescriptor(Array.from(detections.descriptor));
      stopCamera();
      toast.success('Wajah berhasil diambil!');
    } catch (error) {
      console.error('Capture error:', error);
      toast.error('Gagal mengambil data wajah');
    }
  };

  const saveFaceDescriptor = async () => {
    if (!capturedDescriptor) return;

    setSaving(true);
    try {
      await api.post('/face/register', {
        face_descriptor: capturedDescriptor,
      });
      
      toast.success('Wajah berhasil didaftarkan!');
      setIsRegistered(true);
      setCapturedDescriptor(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan data wajah');
    } finally {
      setSaving(false);
    }
  };

  const resetCapture = () => {
    setCapturedDescriptor(null);
    setFaceDetected(false);
  };

  if (!user?.employee_id) {
    return (
      <div className="space-y-6" data-testid="face-registration-page">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
            Registrasi Wajah
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Daftarkan wajah untuk verifikasi absensi
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

  return (
    <div className="space-y-6" data-testid="face-registration-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-['Manrope'] tracking-tight">
          Registrasi Wajah
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Daftarkan wajah Anda untuk verifikasi absensi yang lebih aman
        </p>
      </div>

      {/* Status Card */}
      <Card className={isRegistered ? 'border-green-200 bg-green-50' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isRegistered ? 'bg-green-100' : 'bg-slate-100'}`}>
              {isRegistered ? (
                <Shield className="w-7 h-7 text-green-600" />
              ) : (
                <ScanFace className="w-7 h-7 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {isRegistered ? 'Wajah Terdaftar' : 'Wajah Belum Terdaftar'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isRegistered 
                  ? 'Anda dapat menggunakan verifikasi wajah saat absensi'
                  : 'Silakan daftarkan wajah Anda untuk keamanan absensi'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models Loading */}
      {modelsLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Memuat model pengenalan wajah...</span>
              </div>
              <Progress value={loadingProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">{loadingProgress}% selesai</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Section */}
      {modelsLoaded && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-['Manrope']">
              {capturedDescriptor ? 'Konfirmasi Wajah' : 'Ambil Foto Wajah'}
            </CardTitle>
            <CardDescription>
              {capturedDescriptor 
                ? 'Data wajah berhasil diambil. Klik simpan untuk mendaftarkan.'
                : 'Posisikan wajah Anda di tengah frame'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video/Canvas Container */}
            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
              {!cameraActive && !capturedDescriptor && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Camera className="w-16 h-16 mb-4 opacity-50" />
                  <Button onClick={startCamera} data-testid="start-camera-btn">
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
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                  />
                  
                  {/* Face Detection Status */}
                  <div className="absolute top-4 left-4">
                    {faceDetected ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Wajah Terdeteksi
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 text-white rounded-full text-sm">
                        <AlertCircle className="w-4 h-4" />
                        Mencari Wajah...
                      </div>
                    )}
                  </div>

                  {/* Capture Button */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <Button
                      onClick={captureAndExtract}
                      disabled={!faceDetected}
                      className="gap-2"
                      data-testid="capture-face-btn"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Wajah
                    </Button>
                    <Button variant="secondary" onClick={stopCamera}>
                      Batal
                    </Button>
                  </div>
                </>
              )}

              {capturedDescriptor && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white">
                  <CheckCircle className="w-20 h-20 text-green-500 mb-4" />
                  <p className="text-lg font-medium mb-2">Data Wajah Siap</p>
                  <p className="text-sm text-slate-400">128-dimensional face descriptor</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {capturedDescriptor && (
              <div className="flex gap-3">
                <Button
                  onClick={saveFaceDescriptor}
                  disabled={saving}
                  className="flex-1"
                  data-testid="save-face-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Simpan Wajah
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={resetCapture}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Ulangi
                </Button>
              </div>
            )}

            {/* Instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                  <li>Pastikan pencahayaan cukup terang</li>
                  <li>Posisikan wajah menghadap langsung ke kamera</li>
                  <li>Lepas aksesoris yang menutupi wajah (kacamata hitam, masker)</li>
                  <li>Jaga ekspresi netral</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Re-register Option */}
      {isRegistered && modelsLoaded && !cameraActive && !capturedDescriptor && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Perbarui Data Wajah</p>
                <p className="text-sm text-muted-foreground">
                  Jika verifikasi sering gagal, coba daftarkan ulang wajah Anda
                </p>
              </div>
              <Button variant="outline" onClick={startCamera} data-testid="reregister-btn">
                <RefreshCw className="w-4 h-4 mr-2" />
                Daftar Ulang
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FaceRegistrationPage;
