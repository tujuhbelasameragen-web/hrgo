# API Documentation - Haergo HR System

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:8001/api
```

## Authentication

Semua endpoint (kecuali `/auth/login` dan `/auth/register`) memerlukan JWT token di header:
```
Authorization: Bearer <token>
```

---

## 🔐 Auth Endpoints

### POST /auth/login
Login dan dapatkan access token.

**Request Body:**
```json
{
  "email": "admin@haergo.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin@haergo.com",
    "nama_lengkap": "Super Admin",
    "role": "super_admin",
    "employee_id": null,
    "created_at": "2025-01-22T..."
  }
}
```

### POST /auth/register
Registrasi user baru.

**Request Body:**
```json
{
  "email": "user@example.com",
  "nama_lengkap": "John Doe",
  "password": "password123",
  "role": "employee"
}
```

### GET /auth/me
Get current user info.

**Response:** `UserResponse`

---

## 👥 Employee Endpoints

### GET /employees
Daftar semua karyawan dengan filter.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| department_id | string | Filter by department |
| status | string | Filter by status (aktif, non-aktif, cuti, resign) |
| search | string | Search by name, NIK, or email |

**Response:** `List[EmployeeResponse]`

### POST /employees
Tambah karyawan baru (HR/Admin only).

**Request Body:**
```json
{
  "nik": "EMP011",
  "nama_lengkap": "John Doe",
  "email": "john@haergo.com",
  "telepon": "08123456789",
  "alamat": "Jl. Contoh No. 1",
  "tanggal_lahir": "1990-01-15",
  "jenis_kelamin": "L",
  "tanggal_bergabung": "2025-01-01",
  "department_id": "uuid",
  "position_id": "uuid",
  "status": "aktif",
  "foto_url": "https://..."
}
```

### GET /employees/{emp_id}
Detail karyawan.

### PUT /employees/{emp_id}
Update karyawan.

### DELETE /employees/{emp_id}
Hapus karyawan (HR/Admin only).

---

## 🏢 Department Endpoints

### GET /departments
Daftar departemen dengan jumlah karyawan.

### POST /departments
Tambah departemen (HR/Admin only).

**Request Body:**
```json
{
  "nama": "Engineering",
  "kode": "ENG",
  "deskripsi": "Tim Engineering"
}
```

### PUT /departments/{dept_id}
Update departemen.

### DELETE /departments/{dept_id}
Hapus departemen (jika tidak ada karyawan).

---

## 💼 Position Endpoints

### GET /positions
Daftar posisi. Filter dengan `department_id`.

### POST /positions
Tambah posisi baru.

**Request Body:**
```json
{
  "nama": "Senior Engineer",
  "deskripsi": "Senior level engineer",
  "level": 2,
  "department_id": "uuid"
}
```

**Level Values:**
| Level | Label |
|-------|-------|
| 1 | Staff |
| 2 | Supervisor |
| 3 | Manager |
| 4 | Director |
| 5 | C-Level |

---

## ⏰ Attendance Endpoints

### GET /attendance/settings
Konfigurasi absensi (lokasi kantor, jam kerja).

**Response:**
```json
{
  "office_locations": [
    {
      "id": "office-main",
      "nama": "Kantor Pusat",
      "latitude": -6.161777,
      "longitude": 106.875199,
      "radius": 100,
      "is_default": true
    }
  ],
  "work_hours": {
    "start": "09:00",
    "end": "18:00",
    "late_tolerance_minutes": 15
  }
}
```

### POST /attendance/clock
Clock in atau clock out.

**Request Body:**
```json
{
  "tipe": "clock_in",  // atau "clock_out"
  "mode": "wfo",       // "wfo", "wfh", "client_visit"
  "latitude": -6.161777,
  "longitude": 106.875199,
  "foto_url": "data:image/jpeg;base64,...",
  "catatan": null,
  "alamat_client": null  // wajib jika mode = "client_visit"
}
```

**Mode Validation:**
- `wfo`: Validasi geo-fence (harus dalam radius kantor)
- `wfh`: Tidak ada validasi lokasi
- `client_visit`: Wajib isi `alamat_client`

### GET /attendance/today
Absensi hari ini untuk current user.

### GET /attendance/history
Riwayat absensi dengan filter.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| employee_id | string | Filter by employee (HR only) |
| start_date | string | Format: YYYY-MM-DD |
| end_date | string | Format: YYYY-MM-DD |

### GET /attendance/stats
Statistik kehadiran bulanan.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| employee_id | string | Optional |
| month | string | Format: YYYY-MM |

**Response:**
```json
{
  "total_hari_kerja": 22,
  "total_hadir": 18,
  "total_terlambat": 2,
  "total_alpha": 2,
  "persentase_kehadiran": 90.9
}
```

### GET /attendance/team
Absensi tim hari ini (Manager/HR only).

---

## 🧑 Face Registration Endpoints

### GET /face/check
Cek apakah wajah sudah terdaftar.

**Response:**
```json
{
  "registered": true
}
```

### POST /face/register
Daftarkan face descriptor.

**Request Body:**
```json
{
  "face_descriptor": [0.123, -0.456, ...]  // 128-dimensional array
}
```

### GET /face/descriptor
Ambil face descriptor untuk verifikasi.

---

## 📅 Leave Management Endpoints

### GET /leave/types
Konfigurasi jenis cuti.

**Response:**
```json
{
  "tahunan": {
    "nama": "Cuti Tahunan",
    "jatah_default": 14,
    "potong_jatah": true,
    "butuh_approval": true,
    "approval_level": "manager",
    "min_hari_pengajuan": 3,
    "max_hari": 14
  },
  "sakit": {...},
  "izin": {...},
  "melahirkan": {...},
  "menikah": {...},
  "duka": {...}
}
```

### GET /leave/balance
Saldo cuti karyawan.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| employee_id | string | Optional (HR only) |
| year | int | Default: current year |

### POST /leave/request
Ajukan cuti.

**Request Body:**
```json
{
  "tipe_cuti": "tahunan",
  "tanggal_mulai": "2025-02-01",
  "tanggal_selesai": "2025-02-03",
  "alasan": "Liburan keluarga",
  "lampiran_url": null
}
```

### GET /leave/requests
Riwayat pengajuan cuti.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| employee_id | string | Optional |
| status | string | pending, approved, rejected |

### GET /leave/pending
Pengajuan pending untuk approval (Manager/HR only).

### POST /leave/{request_id}/approve
Approve atau reject pengajuan.

**Request Body:**
```json
{
  "action": "approve",  // atau "reject"
  "alasan": "Alasan penolakan"  // wajib jika reject
}
```

### DELETE /leave/{request_id}
Batalkan pengajuan pending.

---

## ⏱ Overtime Endpoints

### POST /overtime/request
Ajukan lembur.

**Request Body:**
```json
{
  "tanggal": "2025-01-25",
  "jam_mulai": "18:00",
  "jam_selesai": "21:00",
  "alasan": "Deadline project"
}
```

### GET /overtime/requests
Riwayat pengajuan lembur.

### POST /overtime/{request_id}/approve
Approve atau reject lembur.

---

## 📆 Shift Management Endpoints

### GET /shifts
Daftar shift.

### POST /shifts
Buat shift baru (HR only).

**Request Body:**
```json
{
  "nama": "Shift Pagi",
  "jam_masuk": "07:00",
  "jam_keluar": "15:00",
  "warna": "#10B981"
}
```

### PUT /shifts/{shift_id}
Update shift.

### DELETE /shifts/{shift_id}
Hapus shift.

### POST /shifts/assign
Assign shift ke karyawan.

**Request Body:**
```json
{
  "employee_id": "uuid",
  "shift_id": "uuid",
  "tanggal_mulai": "2025-01-01",
  "tanggal_selesai": null
}
```

### GET /shifts/assignments
Daftar penugasan shift.

---

## 📅 Calendar Endpoints

### GET /calendar/events
Events untuk kalender (cuti & lembur approved).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | string | Format: YYYY-MM-DD |
| end_date | string | Format: YYYY-MM-DD |

**Response:**
```json
[
  {
    "type": "leave",
    "id": "uuid",
    "title": "John Doe - Cuti Tahunan",
    "start": "2025-02-01",
    "end": "2025-02-03",
    "color": "#F59E0B"
  },
  {
    "type": "overtime",
    "id": "uuid",
    "title": "Jane Doe - Lembur 3jam",
    "start": "2025-01-25",
    "end": "2025-01-25",
    "color": "#8B5CF6"
  }
]
```

---

## 📊 Dashboard Endpoints

### GET /dashboard/stats
Statistik dashboard.

**Response:**
```json
{
  "total_karyawan": 10,
  "karyawan_aktif": 9,
  "karyawan_nonaktif": 1,
  "total_departemen": 5,
  "total_posisi": 11,
  "karyawan_per_departemen": [
    {"nama": "IT", "jumlah": 3},
    ...
  ],
  "karyawan_per_status": [
    {"status": "aktif", "jumlah": 9},
    ...
  ],
  "karyawan_baru_bulan_ini": 1
}
```

---

## 🔧 Utility Endpoints

### POST /seed
Seed demo data (development only).

### GET /
Health check.

---

## Error Responses

```json
{
  "detail": "Error message"
}
```

**HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

---

## Role Permissions

| Endpoint | super_admin | hr | manager | employee |
|----------|:-----------:|:--:|:-------:|:--------:|
| Employees CRUD | ✅ | ✅ | ❌ | ❌ |
| Departments CRUD | ✅ | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |
| Leave Approval | ✅ | ✅ | ✅ | ❌ |
| Overtime Approval | ✅ | ✅ | ✅ | ❌ |
| Shift Management | ✅ | ✅ | ❌ | ❌ |
| View Team Attendance | ✅ | ✅ | ✅ | ❌ |
| Own Attendance | ✅ | ✅ | ✅ | ✅ |
| Own Leave Request | ✅ | ✅ | ✅ | ✅ |
