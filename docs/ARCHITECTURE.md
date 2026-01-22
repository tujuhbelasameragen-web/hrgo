# Architecture Documentation - Haergo HR System

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Web Browser   │  │   PWA (Mobile)  │                   │
│  │   React SPA     │  │   Same codebase │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           └────────┬───────────┘                             │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │ HTTPS
┌────────────────────┼─────────────────────────────────────────┐
│                    ▼                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              NGINX / INGRESS CONTROLLER              │    │
│  │        (SSL Termination, Load Balancing)             │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                     │
│           ┌────────────┴────────────┐                       │
│           │                         │                        │
│           ▼                         ▼                        │
│  ┌─────────────────┐     ┌─────────────────┐                │
│  │    Frontend     │     │     Backend     │                │
│  │   React:3000    │     │  FastAPI:8001   │                │
│  │                 │     │                 │                │
│  │  - Tailwind CSS │     │  - JWT Auth     │                │
│  │  - Shadcn/UI    │     │  - Motor        │                │
│  │  - Recharts     │     │  - Pydantic     │                │
│  │  - face-api.js  │     │  - bcrypt       │                │
│  └─────────────────┘     └────────┬────────┘                │
│                                   │                          │
│                    SERVER         │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
┌───────────────────────────────────┼──────────────────────────┐
│                                   ▼                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    MongoDB                           │    │
│  │                  (Database)                          │    │
│  │                                                      │    │
│  │  Collections:                                        │    │
│  │  - users, employees, departments, positions          │    │
│  │  - attendance, face_data                             │    │
│  │  - leave_requests, overtime_requests                 │    │
│  │  - shifts, shift_assignments                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                    DATABASE                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py              # Main application (monolith)
│   │   ├── Models (Pydantic)
│   │   ├── Auth helpers
│   │   ├── API Routes
│   │   │   ├── /auth/*
│   │   │   ├── /employees/*
│   │   │   ├── /departments/*
│   │   │   ├── /positions/*
│   │   │   ├── /attendance/*
│   │   │   ├── /face/*
│   │   │   ├── /leave/*
│   │   │   ├── /overtime/*
│   │   │   ├── /shifts/*
│   │   │   └── /dashboard/*
│   │   └── Seed data
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # Shadcn components
│   │   │   └── DashboardLayout.js
│   │   ├── context/
│   │   │   └── AuthContext.js # Auth state + API client
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── EmployeesPage.js
│   │   │   ├── AttendancePage.js
│   │   │   ├── LeaveRequestPage.js
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── utils.js
│   │   ├── App.js             # Router config
│   │   └── index.js           # Entry point
│   ├── package.json
│   └── .env
│
└── docs/
    ├── API.md
    ├── DATABASE.md
    ├── ARCHITECTURE.md
    └── DEVELOPMENT.md
```

---

## 🔐 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ POST /auth/login               │
     │ {email, password}              │
     │───────────────►│                │
     │                │ Find user      │
     │                │───────────────►│
     │                │◄───────────────│
     │                │                │
     │                │ Verify bcrypt  │
     │                │                │
     │                │ Generate JWT   │
     │◄───────────────│                │
     │ {access_token, │                │
     │  user}         │                │
     │                │                │
     │ GET /api/*     │                │
     │ Header: Bearer │                │
     │───────────────►│                │
     │                │ Verify JWT     │
     │                │ Extract user   │
     │                │───────────────►│
     │                │◄───────────────│
     │◄───────────────│                │
     │ Response       │                │
```

### JWT Payload
```javascript
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "employee",
  "exp": 1706000000  // 24 hours from issue
}
```

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
App
├── BrowserRouter
│   └── AuthProvider (Context)
│       └── Routes
│           ├── PublicRoute
│           │   └── LoginPage
│           │
│           └── ProtectedRoute (with role check)
│               └── DashboardLayout
│                   ├── Sidebar
│                   ├── TopBar
│                   └── Page Components
│                       ├── DashboardPage
│                       ├── EmployeesPage
│                       ├── AttendancePage
│                       └── ...
```

### State Management

```javascript
// AuthContext provides:
{
  user: Object,        // Current user data
  token: String,       // JWT token
  loading: Boolean,    // Auth check in progress
  login: Function,     // Login handler
  logout: Function,    // Logout handler
  isAuthenticated: Boolean,
  isAdmin: Boolean,
  isHR: Boolean,
  isManager: Boolean
}
```

### API Client (Axios)

```javascript
// Configured in AuthContext.js
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL + '/api'
});

// Interceptors:
// 1. Request: Add Authorization header
// 2. Response: Handle 401 (redirect to login)
```

---

## 📱 PWA Features

### Manifest Configuration
```json
{
  "name": "Haergo HR System",
  "short_name": "Haergo",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#0F62FE",
  "background_color": "#F8FAFC"
}
```

### Capabilities Used
- Geolocation API (for attendance)
- MediaDevices API (for camera/selfie)
- LocalStorage (for token persistence)

---

## 🧑 Face Recognition Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                         │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐     │
│  │  Camera  │───►│  face-api.js │───►│ 128-dim array │     │
│  │  Stream  │    │  Detection   │    │  descriptor   │     │
│  └──────────┘    └──────────────┘    └───────┬───────┘     │
│                                              │              │
│                                              ▼              │
│                                      POST /face/register    │
│                                              │              │
│                                              ▼              │
│                                      ┌───────────────┐     │
│                                      │   MongoDB     │     │
│                                      │  face_data    │     │
│                                      └───────────────┘     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   VERIFICATION FLOW (Future)                 │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐     │
│  │  Camera  │───►│  face-api.js │───►│ New descriptor│     │
│  │  Capture │    │  Detection   │    └───────┬───────┘     │
│  └──────────┘    └──────────────┘            │              │
│                                              │              │
│                              GET /face/descriptor           │
│                                              │              │
│                                              ▼              │
│                  ┌───────────────────────────────────┐     │
│                  │    Compare descriptors            │     │
│                  │    (Euclidean distance < 0.6)     │     │
│                  └───────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### face-api.js Models Used
- `tinyFaceDetector` - Face detection
- `faceLandmark68Net` - Facial landmarks
- `faceRecognitionNet` - 128-dim descriptor extraction

---

## 🌍 Geo-fence Architecture

```javascript
// Office location configuration
OFFICE_LOCATIONS = [
  {
    id: 'office-main',
    nama: 'Kantor Pusat',
    latitude: -6.161777,
    longitude: 106.875199,
    radius: 100  // meters
  }
]

// Haversine formula for distance calculation
function calculate_distance(lat1, lon1, lat2, lon2) {
  // Returns distance in meters
}

// Validation
function is_within_office(lat, lon) {
  for (office of OFFICE_LOCATIONS) {
    distance = calculate_distance(lat, lon, office.lat, office.lon)
    if (distance <= office.radius) {
      return [true, office.nama, distance]
    }
  }
  return [false, null, null]
}
```

---

## 📅 Leave Approval Workflow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Employee │    │  System  │    │ Manager/ │    │  Status  │
│          │    │          │    │    HR    │    │          │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ Submit leave  │               │               │
     │──────────────►│               │               │
     │               │               │               │
     │               │ Validate:     │               │
     │               │ - Type exists │               │
     │               │ - Balance OK  │               │
     │               │ - Date valid  │               │
     │               │               │               │
     │               │ Determine     │               │
     │               │ approval_level│               │
     │               │               │               │
     │               │ Create record │               │
     │               │ status=pending│               │
     │               │               │               │
     │               │ Notify        │               │
     │               │──────────────►│               │
     │               │               │               │
     │               │               │ Review        │
     │               │               │               │
     │               │               │ Approve/Reject│
     │               │◄──────────────│               │
     │               │               │               │
     │               │ Update status │               │
     │               │──────────────────────────────►│
     │               │               │               │
     │◄──────────────│               │               │
     │ Notification  │               │               │
```

### Approval Level Logic
```python
if leave_type in ['melahirkan', 'menikah']:
    approval_level = 'hr'  # Only HR can approve
else:
    approval_level = 'manager'  # Manager or above
```

---

## 🔄 Future Scalability

### Modular Monolith to Microservices

Current: Monolith in `server.py`
```
server.py
├── Auth Module
├── Employee Module
├── Attendance Module
├── Leave Module
├── Overtime Module
└── Shift Module
```

Future: Separate services
```
├── auth-service/
├── employee-service/
├── attendance-service/
├── leave-service/
└── payroll-service/  (new)
```

### Database Sharding Strategy
```
- Shard by company_id (for multi-tenant)
- Shard attendance by date range
- Separate read replicas for reporting
```

### Caching Layer (Future)
```
Redis for:
- Session management
- Rate limiting
- Frequently accessed data (employee list)
- Face descriptor caching
```

---

## 🔒 Security Considerations

1. **Authentication**
   - JWT with expiration (24 hours)
   - Password hashing (bcrypt)
   - Role-based access control

2. **API Security**
   - CORS configuration
   - Input validation (Pydantic)
   - SQL injection prevention (MongoDB)

3. **Data Protection**
   - Exclude `_id` from responses
   - Face data stored securely
   - Sensitive fields not logged

4. **Future Improvements**
   - Rate limiting
   - API key for external access
   - Audit logging
   - Data encryption at rest
