# Haergo - Sistem HR Modern
## Product Requirements Document

### Original Problem Statement
Membangun sistem HR bertahap dari sederhana hingga powerful, dengan arsitektur modular yang tidak mengganggu fitur yang sudah berjalan.

### User Personas
1. **Super Admin** - Full access ke semua fitur sistem
2. **HR Manager** - Kelola karyawan, departemen, posisi, lihat absensi semua
3. **Manager** - Lihat data tim dan karyawan
4. **Employee** - Absensi, lihat profil sendiri, self-service

### Core Requirements (Static)
- Multi-role authentication (JWT)
- Employee database dengan CRUD lengkap
- Department & Position management
- Dashboard dengan statistik real-time
- Employee self-service
- Smart Attendance dengan geo + face

---

## Implementation History

### ✅ Fase 1: Foundation MVP (Completed - Jan 2025)
**Backend:**
- Authentication system (JWT, bcrypt)
- Employee CRUD API
- Department CRUD API
- Position CRUD API
- User Management API
- Dashboard Statistics API
- Seed data (10 karyawan, 5 dept, 11 posisi)

**Frontend:**
- Login page (modern split layout)
- Dashboard dengan charts (Recharts)
- Employee list dengan search/filter
- Employee detail page
- Departments management
- Positions management
- User management (admin only)
- Profile page
- Responsive sidebar navigation

---

### ✅ Fase 2: Smart Attendance (Completed - Jan 2025)
**Backend:**
- Attendance clock in/out API
- Geo-fence validation (radius 100m)
- Office location: -6.161777, 106.875199
- Attendance history & stats API
- Face registration API (128-dim descriptor)
- Support WFO/WFH/Client Visit modes
- Late detection (toleransi 15 menit)

**Frontend:**
- Attendance page dengan Clock In/Out
- Mode selection (WFO, WFH, Client Visit)
- Camera integration untuk selfie
- Geolocation capture
- Attendance History dengan statistik
- Face Registration page (face-api.js)
- Updated sidebar dengan menu absensi

**Tech Stack Additions:**
- face-api.js (@vladmandic/face-api)
- TensorFlow.js models untuk face recognition
- Geolocation API
- Camera/MediaDevices API

---

## Prioritized Backlog

### P0 (Next Phase - Fase 3)
- [ ] Leave Management - Request cuti/izin
- [ ] Approval Workflow - Multi-level approval
- [ ] Calendar View - Visualisasi jadwal & cuti
- [ ] Overtime Management

### P1 (Fase 4)
- [ ] Payroll System
- [ ] Salary Structure
- [ ] Payslip Generation
- [ ] Attendance-based calculation

### P2 (Fase 5+)
- [ ] Performance Review & KPI
- [ ] Recruitment Pipeline
- [ ] Document Management
- [ ] Reports & Analytics
- [ ] Multi-branch support

---

## Demo Credentials
- **Admin:** admin@haergo.com / admin123
- **HR:** hr@haergo.com / hr123

## Office Location (Geo-fence)
- Koordinat: -6.161777, 106.875199
- Radius: 100 meter
- Jam Kerja: 09:00 - 18:00
- Toleransi Terlambat: 15 menit
