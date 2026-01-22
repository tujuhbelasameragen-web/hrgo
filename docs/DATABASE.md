# Database Schema - Haergo HR System

## MongoDB Collections

Database: `haergo_db` (configurable via `DB_NAME` env)

---

## 📦 Collection: `users`

Akun pengguna untuk login ke sistem.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",           // Primary identifier
  "email": "user@example.com",   // Unique
  "nama_lengkap": "John Doe",
  "password": "bcrypt-hash",     // Hashed with bcrypt
  "role": "employee",            // super_admin, hr, manager, employee
  "employee_id": "uuid" | null,  // Link ke collection employees
  "created_at": "ISO-datetime"
}
```

**Indexes:**
- `email` (unique)
- `id` (unique)

**Roles:**
| Role | Access Level |
|------|-------------|
| super_admin | Full access |
| hr | HR management, no user management |
| manager | Approval, view team |
| employee | Self-service only |

---

## 📦 Collection: `employees`

Data lengkap karyawan.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "nik": "EMP001",               // Nomor Induk Karyawan (unique)
  "nama_lengkap": "John Doe",
  "email": "john@example.com",   // Unique
  "telepon": "08123456789",
  "alamat": "Jl. Contoh No. 1",
  "tanggal_lahir": "1990-01-15", // YYYY-MM-DD
  "jenis_kelamin": "L",          // L atau P
  "tanggal_bergabung": "2025-01-01",
  "department_id": "uuid",       // Foreign key
  "position_id": "uuid",         // Foreign key
  "status": "aktif",             // aktif, non-aktif, cuti, resign
  "foto_url": "https://...",
  "user_id": "uuid" | null,      // Link ke users
  "created_at": "ISO-datetime"
}
```

**Indexes:**
- `id` (unique)
- `nik` (unique)
- `email` (unique)
- `department_id`
- `status`

---

## 📦 Collection: `departments`

Departemen perusahaan.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "nama": "Information Technology",
  "kode": "IT",                  // Short code (unique)
  "deskripsi": "Departemen TI",
  "created_at": "ISO-datetime"
}
```

**Indexes:**
- `id` (unique)
- `kode` (unique)

---

## 📦 Collection: `positions`

Posisi/jabatan dalam departemen.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "nama": "Software Engineer",
  "deskripsi": "Posisi SE",
  "level": 1,                    // 1-5 (Staff to C-Level)
  "department_id": "uuid",       // Foreign key
  "created_at": "ISO-datetime"
}
```

**Level Reference:**
| Level | Label |
|-------|-------|
| 1 | Staff |
| 2 | Supervisor |
| 3 | Manager |
| 4 | Director |
| 5 | C-Level |

**Indexes:**
- `id` (unique)
- `department_id`

---

## 📦 Collection: `attendance`

Record absensi harian.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "employee_id": "uuid",         // Foreign key
  "tanggal": "2025-01-22",       // YYYY-MM-DD (one record per day)
  
  // Clock In Data
  "clock_in": "ISO-datetime",
  "clock_in_foto": "base64 or URL",
  "clock_in_latitude": -6.161777,
  "clock_in_longitude": 106.875199,
  "clock_in_mode": "wfo",        // wfo, wfh, client_visit
  
  // Clock Out Data
  "clock_out": "ISO-datetime" | null,
  "clock_out_foto": "base64 or URL" | null,
  "clock_out_latitude": -6.161777 | null,
  "clock_out_longitude": 106.875199 | null,
  "clock_out_mode": "wfo" | null,
  
  "total_jam": 8.5 | null,       // Calculated on clock out
  "status": "hadir",             // hadir, terlambat, alpha, izin
  "catatan": "Client address or notes"
}
```

**Status Logic:**
- `hadir`: Clock in before 09:15
- `terlambat`: Clock in after 09:15
- `alpha`: No clock in
- `izin`: On approved leave

**Indexes:**
- `id` (unique)
- `employee_id`
- `tanggal`
- Compound: `{ employee_id: 1, tanggal: 1 }` (unique)

---

## 📦 Collection: `face_data`

Face descriptor untuk face recognition.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "employee_id": "uuid",         // Foreign key (unique)
  "face_descriptor": [           // 128-dimensional array
    0.123, -0.456, 0.789, ...
  ],
  "created_at": "ISO-datetime",
  "updated_at": "ISO-datetime"
}
```

**Notes:**
- Satu employee hanya punya satu face_data
- face_descriptor dari face-api.js (128 float values)

**Indexes:**
- `id` (unique)
- `employee_id` (unique)

---

## 📦 Collection: `leave_requests`

Pengajuan cuti.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "employee_id": "uuid",
  "tipe_cuti": "tahunan",        // tahunan, sakit, izin, melahirkan, menikah, duka
  "tanggal_mulai": "2025-02-01",
  "tanggal_selesai": "2025-02-03",
  "jumlah_hari": 2,              // Working days only
  "alasan": "Liburan keluarga",
  "lampiran_url": "https://..." | null,  // For sick leave
  "status": "pending",           // pending, approved, rejected
  "approved_by": "uuid" | null,  // User ID of approver
  "approved_at": "ISO-datetime" | null,
  "rejected_reason": "string" | null,
  "created_at": "ISO-datetime"
}
```

**Leave Types Configuration:**
| Type | Quota | Approval | Min Days Before |
|------|-------|----------|-----------------|
| tahunan | 14/year | Manager | 3 days |
| sakit | Unlimited | Manager | 0 days |
| izin | 3/year | Manager | 1 day |
| melahirkan | 90 days | HR | 14 days |
| menikah | 3 days | HR | 7 days |
| duka | 3 days | Manager | 0 days |

**Indexes:**
- `id` (unique)
- `employee_id`
- `status`
- `tanggal_mulai`

---

## 📦 Collection: `overtime_requests`

Pengajuan lembur.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "employee_id": "uuid",
  "tanggal": "2025-01-25",
  "jam_mulai": "18:00",
  "jam_selesai": "21:00",
  "total_jam": 3.0,              // Calculated
  "alasan": "Deadline project",
  "status": "pending",           // pending, approved, rejected
  "approved_by": "uuid" | null,
  "approved_at": "ISO-datetime" | null,
  "created_at": "ISO-datetime"
}
```

**Indexes:**
- `id` (unique)
- `employee_id`
- `status`
- `tanggal`

---

## 📦 Collection: `shifts`

Definisi shift kerja.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "nama": "Shift Pagi",
  "jam_masuk": "07:00",
  "jam_keluar": "15:00",
  "warna": "#10B981",            // For UI display
  "created_at": "ISO-datetime"
}
```

**Indexes:**
- `id` (unique)

---

## 📦 Collection: `shift_assignments`

Penugasan shift ke karyawan.

```javascript
{
  "_id": ObjectId,
  "id": "uuid-string",
  "employee_id": "uuid",
  "shift_id": "uuid",
  "tanggal_mulai": "2025-01-01",
  "tanggal_selesai": "2025-12-31" | null  // null = ongoing
}
```

**Notes:**
- Satu employee hanya bisa punya satu active shift assignment
- Saat assign baru, assignment lama dihapus

**Indexes:**
- `id` (unique)
- `employee_id`
- `shift_id`

---

## 🔗 Entity Relationship

```
users 1 ──── 0..1 employees
                    │
                    ├──── * attendance
                    │
                    ├──── 0..1 face_data
                    │
                    ├──── * leave_requests
                    │
                    ├──── * overtime_requests
                    │
                    └──── 0..1 shift_assignments ──── 1 shifts

departments 1 ──── * employees
            │
            └──── * positions 1 ──── * employees
```

---

## 📊 Query Examples

### Get employee with department and position
```javascript
// In Python with Motor
employee = await db.employees.find_one({'id': emp_id}, {'_id': 0})
dept = await db.departments.find_one({'id': employee['department_id']}, {'_id': 0})
pos = await db.positions.find_one({'id': employee['position_id']}, {'_id': 0})
```

### Get today's attendance for employee
```javascript
today = datetime.now().strftime('%Y-%m-%d')
attendance = await db.attendance.find_one({
    'employee_id': emp_id,
    'tanggal': today
}, {'_id': 0})
```

### Get leave balance
```javascript
year = 2025
leaves = await db.leave_requests.find({
    'employee_id': emp_id,
    'tipe_cuti': 'tahunan',
    'status': 'approved',
    'tanggal_mulai': {'$regex': f'^{year}'}
}, {'_id': 0}).to_list(100)

terpakai = sum(l['jumlah_hari'] for l in leaves)
sisa = 14 - terpakai
```

---

## 🔒 Data Security Notes

1. **Password**: Selalu di-hash dengan bcrypt, tidak pernah plain text
2. **_id Exclusion**: Selalu exclude `_id` dari response (`{'_id': 0}`)
3. **Sensitive Data**: face_descriptor tidak di-expose ke frontend secara langsung
4. **Authorization**: Selalu cek role sebelum akses data
