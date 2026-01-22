# Changelog - Haergo HR System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-22

### Added

#### Fase 1: Foundation MVP
- Multi-role authentication system (Super Admin, HR, Manager, Employee)
- JWT-based authentication with 24-hour expiration
- Employee management (CRUD, search, filter by department/status)
- Department management with employee count
- Position management with 5 levels (Staff to C-Level)
- User management (Admin only)
- Dashboard with statistics and charts
- Responsive sidebar navigation
- Profile page for self-service

#### Fase 2: Smart Attendance
- PWA manifest for mobile installation
- Clock in/out with selfie photo capture
- Geo-location capture with coordinates
- Geo-fence validation for WFO mode (100m radius)
- 3 work modes: WFO, WFH, Client Visit
- Attendance history with monthly statistics
- Face registration using face-api.js
- 128-dimensional face descriptor storage
- Late detection with 15-minute tolerance

#### Fase 3: Leave & Time Management
- 6 leave types with configurable quotas
  - Tahunan (14 days/year)
  - Sakit (Unlimited with note)
  - Izin (3 days/year)
  - Melahirkan (90 days)
  - Menikah (3 days)
  - Duka (3 days)
- Automatic leave balance calculation
- Flexible approval workflow (Manager/HR based on type)
- Overtime request and approval system
- Shift management (create, edit, delete)
- Shift assignment to employees
- Calendar view with leave and overtime events

### Technical
- FastAPI backend with async MongoDB (Motor)
- React 18 frontend with Tailwind CSS
- Shadcn/UI component library
- Recharts for data visualization
- Axios with interceptors for API calls
- React Context for state management

### Documentation
- README.md with installation guide
- API.md with complete endpoint documentation
- DATABASE.md with schema documentation
- ARCHITECTURE.md with system design
- DEVELOPMENT.md with coding guidelines
- PRD.md with product requirements

### Demo Data
- 2 demo users (admin, hr)
- 10 sample employees
- 5 departments
- 11 positions

---

## [Unreleased]

### Planned for Fase 4: Payroll
- Salary structure management
- Automatic calculation from attendance
- Payslip generation
- THR and bonus calculation

### Planned for Fase 5: Performance
- KPI management
- Performance review cycles
- 360° feedback system
- Goal tracking

### Planned for Fase 6: Recruitment
- Job posting
- Applicant tracking
- Interview scheduling
- Onboarding checklist

### Planned for Fase 7: Document & Compliance
- Document storage
- E-signature integration
- Audit trail

### Planned for Fase 8: Analytics & Enterprise
- HR analytics
- Multi-branch support
- Advanced reporting
