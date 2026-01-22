# Haergo HR System - Product Requirements Document

## 📋 Overview

**Nama Produk:** Haergo  
**Versi:** 1.0.0  
**Last Updated:** January 2025

---

## 🎯 Original Problem Statement

Membangun sistem HR bertahap dari sederhana hingga powerful, dengan arsitektur modular yang tidak mengganggu fitur yang sudah berjalan. Sistem dimulai dari MVP sederhana dan berkembang hingga enterprise-grade dengan fitur lengkap.

### User Requirements
- Nama aplikasi: **Haergo**
- Bahasa interface: **Indonesia**
- Warna tema: **Biru profesional**
- Dashboard: **Modern minimalis**
- Skala target: **Startup hingga Enterprise**

---

## 👥 User Personas

### 1. Super Admin
- **Role:** `super_admin`
- **Access:** Full system access
- **Responsibilities:** 
  - User management
  - System configuration
  - All HR operations

### 2. HR Manager
- **Role:** `hr`
- **Access:** HR operations, employee management
- **Responsibilities:**
  - Employee CRUD
  - Department/Position management
  - Leave approval (special types)
  - Shift management
  - View all attendance

### 3. Manager
- **Role:** `manager`
- **Access:** Team management
- **Responsibilities:**
  - View team members
  - Approve regular leave/overtime
  - View team attendance

### 4. Employee
- **Role:** `employee`
- **Access:** Self-service only
- **Responsibilities:**
  - Clock in/out
  - Request leave/overtime
  - View own profile
  - Register face

---

## ✅ Implementation Status

### Fase 1: Foundation MVP ✅ COMPLETED

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-role Authentication (JWT) | ✅ | super_admin, hr, manager, employee |
| Employee Database CRUD | ✅ | With search, filter |
| Department Management | ✅ | With employee count |
| Position Management | ✅ | With level (1-5) |
| User Management | ✅ | Admin only |
| Dashboard Statistics | ✅ | Charts with Recharts |
| Responsive UI | ✅ | Tailwind + Shadcn |

**Demo Data:**
- 10 karyawan
- 5 departemen (IT, HR, Finance, Marketing, Operations)
- 11 posisi

---

### Fase 2: Smart Attendance ✅ COMPLETED

| Feature | Status | Notes |
|---------|--------|-------|
| PWA Setup | ✅ | manifest.json |
| Clock In/Out | ✅ | With selfie + coordinates |
| Geo-fence Validation | ✅ | Radius 100m |
| 3 Work Modes | ✅ | WFO, WFH, Client Visit |
| Attendance History | ✅ | With statistics |
| Face Registration | ✅ | face-api.js (128-dim) |
| Late Detection | ✅ | 15 min tolerance |

**Configuration:**
- Office: -6.161777, 106.875199
- Work Hours: 09:00 - 18:00
- Late Tolerance: 15 minutes

---

### Fase 3: Leave & Time Management ✅ COMPLETED

| Feature | Status | Notes |
|---------|--------|-------|
| 6 Leave Types | ✅ | Tahunan, Sakit, Izin, Melahirkan, Menikah, Duka |
| Leave Balance | ✅ | Auto-calculated |
| Flexible Approval | ✅ | Manager/HR based on type |
| Overtime Request | ✅ | With approval |
| Shift Management | ✅ | Create, assign |
| Calendar View | ✅ | Leave + overtime events |

**Leave Configuration:**
| Type | Quota | Approval | Min Days Before |
|------|-------|----------|-----------------|
| Tahunan | 14/year | Manager | 3 days |
| Sakit | Unlimited | Manager | 0 days |
| Izin | 3/year | Manager | 1 day |
| Melahirkan | 90 days | HR | 14 days |
| Menikah | 3 days | HR | 7 days |
| Duka | 3 days | Manager | 0 days |

---

## 🗺 Roadmap (Remaining Phases)

### Fase 4: Payroll & Compensation 🔜
- [ ] Salary Structure (gaji pokok + tunjangan)
- [ ] Deductions (potongan)
- [ ] Auto-calculate from attendance
- [ ] Payslip Generation (PDF)
- [ ] THR & Bonus calculation
- [ ] Payroll History

### Fase 5: Performance & Development 📋
- [ ] KPI Management
- [ ] Performance Review cycles
- [ ] 360° Feedback
- [ ] Goal Tracking
- [ ] Training Management
- [ ] Career Path visualization

### Fase 6: Recruitment & Onboarding 📋
- [ ] Job Posting
- [ ] Applicant Tracking System
- [ ] Interview Scheduling
- [ ] Onboarding Checklist
- [ ] Document Collection
- [ ] Probation Tracking

### Fase 7: Document & Compliance 📋
- [ ] Document Storage
- [ ] E-Signature integration
- [ ] Contract Reminder
- [ ] Company Policy repository
- [ ] Audit Trail
- [ ] Compliance reporting

### Fase 8: Analytics & Enterprise 📋
- [ ] HR Analytics dashboard
- [ ] Custom Reports
- [ ] Multi-branch Support
- [ ] API Integration (Bank, BPJS)
- [ ] Advanced Role & Permission
- [ ] White-label option

---

## 🔧 Technical Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database:** MongoDB + Motor
- **Auth:** JWT + bcrypt
- **Validation:** Pydantic

### Frontend
- **Framework:** React 18
- **Styling:** Tailwind CSS + Shadcn/UI
- **State:** React Context
- **Charts:** Recharts
- **Face Detection:** @vladmandic/face-api
- **HTTP:** Axios
- **Date:** date-fns

---

## 🔐 Security Requirements

- [x] Password hashing (bcrypt)
- [x] JWT token authentication
- [x] Role-based access control
- [x] CORS configuration
- [x] Input validation
- [ ] Rate limiting (Fase 4+)
- [ ] Audit logging (Fase 7)
- [ ] Data encryption at rest (Fase 7)

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Page Load Time | < 3 seconds |
| API Response Time | < 500ms |
| Face Detection Accuracy | > 95% |
| System Uptime | 99.5% |
| User Satisfaction | > 4/5 |

---

## 📞 Demo Access

**Admin Account:**
- Email: `admin@haergo.com`
- Password: `admin123`

**HR Account:**
- Email: `hr@haergo.com`
- Password: `hr123`

---

## 📝 Change Log

### v1.0.0 (January 2025)
- Initial release
- Fase 1-3 completed
- Foundation, Attendance, Leave Management

---

*Document maintained by Haergo Development Team*
