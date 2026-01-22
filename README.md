# Haergo - Sistem HR Modern

<div align="center">
  <h3>Sistem Manajemen SDM dengan Fitur Absensi PWA + Face Recognition</h3>
  <p>Built with FastAPI + React + MongoDB</p>
</div>

---

## 📋 Daftar Isi

- [Tentang Haergo](#-tentang-haergo)
- [Fitur](#-fitur)
- [Tech Stack](#-tech-stack)
- [Instalasi](#-instalasi)
- [Struktur Project](#-struktur-project)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Roadmap Pengembangan](#-roadmap-pengembangan)
- [Kontribusi](#-kontribusi)

---

## 🎯 Tentang Haergo

Haergo adalah sistem HR modern yang dibangun secara bertahap dengan arsitektur modular. Sistem ini dirancang untuk skala startup hingga enterprise dengan fitur-fitur:

- **Multi-role Authentication** (Super Admin, HR, Manager, Employee)
- **Employee Management** dengan CRUD lengkap
- **Smart Attendance** dengan PWA, Geo-fence, dan Face Recognition
- **Leave Management** dengan approval workflow fleksibel
- **Overtime Management** dengan approval
- **Shift Management** untuk tim operasional

---

## ✨ Fitur

### Fase 1: Foundation MVP ✅
- [x] Login multi-role (Super Admin, HR, Manager, Employee)
- [x] Dashboard dengan statistik & chart
- [x] Employee Management (CRUD, search, filter)
- [x] Department & Position Management
- [x] User Management

### Fase 2: Smart Attendance ✅
- [x] Clock In/Out dengan selfie & geo-location
- [x] 3 Mode kerja: WFO (geo-fence), WFH, Client Visit
- [x] Geo-fence validation (radius 100m)
- [x] Riwayat Absensi dengan statistik
- [x] Face Registration (TensorFlow.js)

### Fase 3: Leave & Time Management ✅
- [x] 6 Jenis Cuti (Tahunan, Sakit, Izin, Melahirkan, Menikah, Duka)
- [x] Saldo cuti otomatis terhitung
- [x] Approval Workflow (Manager/HR berdasarkan jenis cuti)
- [x] Overtime Request & Approval
- [x] Shift Management
- [x] Calendar View

---

## 🛠 Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** MongoDB dengan Motor (async driver)
- **Authentication:** JWT (PyJWT) + bcrypt
- **CORS:** Starlette Middleware

### Frontend
- **Framework:** React 18
- **Styling:** Tailwind CSS + Shadcn/UI
- **State Management:** React Context
- **Charts:** Recharts
- **Face Detection:** @vladmandic/face-api
- **HTTP Client:** Axios
- **Date Handling:** date-fns

---

## 🚀 Instalasi

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6+
- Yarn

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Edit sesuai konfigurasi
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend Setup
```bash
cd frontend
yarn install
cp .env.example .env  # Edit sesuai konfigurasi
yarn start
```

### Environment Variables

**Backend (.env)**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=haergo_db
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

**Frontend (.env)**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Seed Data
```bash
curl -X POST http://localhost:8001/api/seed
```

**Demo Credentials:**
- Admin: `admin@haergo.com` / `admin123`
- HR: `hr@haergo.com` / `hr123`

---

## 📁 Struktur Project

```
/app
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
│
├── frontend/
│   ├── public/
│   │   └── manifest.json  # PWA manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/        # Shadcn components
│   │   │   └── DashboardLayout.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── EmployeesPage.js
│   │   │   ├── AttendancePage.js
│   │   │   ├── LeaveRequestPage.js
│   │   │   ├── OvertimePage.js
│   │   │   ├── ApprovalPage.js
│   │   │   ├── ShiftManagementPage.js
│   │   │   ├── CalendarPage.js
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── utils.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   └── .env
│
├── docs/                   # Dokumentasi lengkap
│   ├── API.md
│   ├── DATABASE.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
│
├── memory/
│   └── PRD.md             # Product Requirements Document
│
└── README.md              # File ini
```

---

## 📚 API Documentation

Lihat dokumentasi lengkap di [docs/API.md](docs/API.md)

### Quick Reference

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/auth/login` | POST | Login user |
| `/api/auth/me` | GET | Get current user |
| `/api/employees` | GET/POST | CRUD karyawan |
| `/api/departments` | GET/POST | CRUD departemen |
| `/api/positions` | GET/POST | CRUD posisi |
| `/api/attendance/clock` | POST | Clock in/out |
| `/api/leave/request` | POST | Ajukan cuti |
| `/api/overtime/request` | POST | Ajukan lembur |
| `/api/shifts` | GET/POST | CRUD shift |

---

## 🗄 Database Schema

Lihat dokumentasi lengkap di [docs/DATABASE.md](docs/DATABASE.md)

### Collections
- `users` - Akun pengguna sistem
- `employees` - Data karyawan
- `departments` - Departemen
- `positions` - Posisi/jabatan
- `attendance` - Record absensi
- `face_data` - Face descriptor untuk verifikasi
- `leave_requests` - Pengajuan cuti
- `overtime_requests` - Pengajuan lembur
- `shifts` - Definisi shift
- `shift_assignments` - Penugasan shift ke karyawan

---

## 🗺 Roadmap Pengembangan

### Fase 4: Payroll (Coming Soon)
- [ ] Salary Structure
- [ ] Auto-calculate dari attendance
- [ ] Payslip Generation
- [ ] THR & Bonus

### Fase 5: Performance
- [ ] KPI Management
- [ ] Performance Review
- [ ] 360° Feedback

### Fase 6: Recruitment
- [ ] Job Posting
- [ ] Applicant Tracking
- [ ] Onboarding Checklist

### Fase 7: Document & Compliance
- [ ] Document Storage
- [ ] E-Signature
- [ ] Audit Trail

### Fase 8: Analytics & Enterprise
- [ ] HR Analytics
- [ ] Multi-branch Support
- [ ] API Integration

---

## 🤝 Kontribusi

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## 📄 License

MIT License - Lihat [LICENSE](LICENSE) untuk detail.

---

<div align="center">
  <p>Made with ❤️ by Haergo Team</p>
</div>
