# Haergo - Sistem HR Modern
## Product Requirements Document

### Original Problem Statement
Membangun sistem HR bertahap dari sederhana hingga powerful, dimulai dari Fase 1 (Foundation MVP) dengan arsitektur modular yang tidak mengganggu fitur yang sudah berjalan.

### User Personas
1. **Super Admin** - Full access ke semua fitur sistem
2. **HR Manager** - Kelola karyawan, departemen, posisi
3. **Manager** - Lihat data tim dan karyawan
4. **Employee** - Lihat profil sendiri dan self-service

### Core Requirements (Static)
- Multi-role authentication (JWT)
- Employee database dengan CRUD lengkap
- Department & Position management
- Dashboard dengan statistik real-time
- Employee self-service

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

**Tech Stack:**
- FastAPI + Motor (async MongoDB)
- React + Tailwind CSS + Shadcn UI
- JWT Authentication

---

## Prioritized Backlog

### P0 (Next Phase - Fase 2)
- [ ] PWA Mobile untuk absensi
- [ ] Face Recognition integration
- [ ] Geo-fence location validation
- [ ] Clock in/out dengan foto + koordinat
- [ ] Attendance history

### P1 (Fase 3)
- [ ] Leave Management
- [ ] Approval Workflow
- [ ] Calendar View
- [ ] Overtime Management

### P2 (Fase 4+)
- [ ] Payroll System
- [ ] Performance Review
- [ ] Recruitment Pipeline
- [ ] Document Management
- [ ] Reports & Analytics

---

## Demo Credentials
- **Admin:** admin@haergo.com / admin123
- **HR:** hr@haergo.com / hr123
