# Development Guide - Haergo HR System

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6+
- Yarn (bukan npm)

### Setup Backend
```bash
cd /app/backend

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env sesuai konfigurasi

# Run server
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Setup Frontend
```bash
cd /app/frontend

# Install dependencies
yarn install

# Setup environment
cp .env.example .env
# Edit .env sesuai konfigurasi

# Run development server
yarn start
```

### Seed Data
```bash
curl -X POST http://localhost:8001/api/seed
```

---

## 🛠 Development Workflow

### 1. Menambah Endpoint Baru

**Backend (server.py):**
```python
# 1. Definisikan Pydantic Model
class NewFeatureCreate(BaseModel):
    field1: str
    field2: int

class NewFeatureResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    field1: str
    field2: int
    created_at: str

# 2. Buat Route
@api_router.post("/new-feature", response_model=NewFeatureResponse)
async def create_new_feature(
    data: NewFeatureCreate,
    user: dict = Depends(get_current_user)  # atau require_role(['admin'])
):
    # Validasi
    if not valid:
        raise HTTPException(status_code=400, detail="Error message")
    
    # Insert ke database
    doc_id = str(uuid.uuid4())
    doc = {
        'id': doc_id,
        'field1': data.field1,
        'field2': data.field2,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.new_collection.insert_one(doc)
    
    # Return response (SELALU exclude _id)
    return NewFeatureResponse(
        id=doc_id,
        field1=data.field1,
        field2=data.field2,
        created_at=doc['created_at']
    )
```

### 2. Menambah Halaman Baru

**Frontend:**

1. Buat file page di `/frontend/src/pages/NewPage.js`
```jsx
import React, { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const NewPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/new-feature');
      setData(response.data);
    } catch (error) {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="new-page">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-['Manrope']">
          New Feature
        </h1>
      </div>
      {/* Content */}
    </div>
  );
};

export default NewPage;
```

2. Tambahkan route di `App.js`
```jsx
import NewPage from "./pages/NewPage";

// Di dalam Routes
<Route
  path="/new-feature"
  element={
    <ProtectedRoute allowedRoles={['super_admin', 'hr']}>
      <NewPage />
    </ProtectedRoute>
  }
/>
```

3. Tambahkan menu di `DashboardLayout.js`
```jsx
const navItems = [
  // ... existing items
  { to: '/new-feature', icon: SomeIcon, label: 'New Feature', show: isHR },
];
```

---

## 📝 Coding Standards

### Backend (Python)

```python
# Naming: snake_case untuk variabel dan fungsi
def get_employee_by_id(emp_id: str):
    pass

# Class: PascalCase
class EmployeeResponse(BaseModel):
    pass

# Constants: UPPER_SNAKE_CASE
LEAVE_TYPES = {...}

# Always type hints
async def create_employee(
    data: EmployeeCreate,
    user: dict = Depends(get_current_user)
) -> EmployeeResponse:
    pass

# Always exclude _id from MongoDB queries
employee = await db.employees.find_one({'id': emp_id}, {'_id': 0})

# DateTime: Always use timezone-aware
from datetime import datetime, timezone
now = datetime.now(timezone.utc)
```

### Frontend (JavaScript/React)

```jsx
// Component: PascalCase
const EmployeePage = () => { ... };

// Function: camelCase
const fetchData = async () => { ... };

// Constants: UPPER_SNAKE_CASE
const API_URL = process.env.REACT_APP_BACKEND_URL;

// Always add data-testid for testing
<Button data-testid="submit-btn">Submit</Button>

// Use Shadcn components
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

// Use Sonner for toasts
import { toast } from 'sonner';
toast.success('Berhasil!');
toast.error('Gagal!');
```

---

## 🎨 UI Guidelines

### Font
- Heading: `font-['Manrope']`
- Body: Default (Inter)

### Colors (CSS Variables)
```css
--primary: 217 91% 53%;      /* Blue */
--success: 160 84% 39%;      /* Green */
--warning: 38 92% 50%;       /* Yellow/Amber */
--destructive: 0 84% 60%;    /* Red */
```

### Spacing
- Page padding: `p-6`
- Card gap: `space-y-6`
- Grid gap: `gap-4` atau `gap-6`

### Data Test IDs
Wajib untuk semua elemen interaktif:
```jsx
<Button data-testid="submit-btn">
<Input data-testid="email-input">
<div data-testid="employee-list">
```

---

## 🧪 Testing

### Backend API Testing
```bash
# Login dan simpan token
TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@haergo.com","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Test endpoint
curl -s "http://localhost:8001/api/employees" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Frontend Testing
- Testing dilakukan via Playwright
- Setiap elemen harus punya `data-testid`

---

## 🔧 Common Tasks

### Menambah Collection Baru

1. Tidak perlu migrate (MongoDB schema-less)
2. Cukup insert dokumen pertama
3. Buat indexes jika perlu:
```python
# Di startup atau manual
await db.new_collection.create_index('id', unique=True)
```

### Menambah Role Permission

1. Update `require_role` decorator usage:
```python
@api_router.get("/admin-only")
async def admin_only(user: dict = Depends(require_role(['super_admin']))):
    pass
```

2. Update frontend `allowedRoles`:
```jsx
<ProtectedRoute allowedRoles={['super_admin', 'hr']}>
```

3. Update `AuthContext.js` jika perlu helper baru:
```javascript
const value = {
  // ...existing
  isNewRole: user?.role === 'new_role',
};
```

### Menambah Jenis Cuti

1. Tambahkan di `LEAVE_TYPES`:
```python
LEAVE_TYPES = {
    # ... existing
    'new_leave': {
        'nama': 'Cuti Baru',
        'jatah_default': 5,
        'potong_jatah': True,
        'butuh_approval': True,
        'approval_level': 'manager',
        'min_hari_pengajuan': 3,
        'max_hari': 5
    }
}
```

### Menambah Lokasi Kantor

```python
OFFICE_LOCATIONS = [
    # ... existing
    {
        'id': 'office-branch',
        'nama': 'Kantor Cabang',
        'latitude': -6.xxx,
        'longitude': 106.xxx,
        'radius': 100,
        'is_default': False
    }
]
```

---

## 🐛 Debugging

### Backend Logs
```bash
# Jika pakai supervisor
tail -f /var/log/supervisor/backend.err.log

# Jika manual
# Output langsung ke terminal
```

### Frontend Console
- Buka DevTools > Console
- Check Network tab untuk API errors

### MongoDB Queries
```bash
# Connect ke MongoDB
mongosh

# Select database
use haergo_db

# Query examples
db.employees.find({}).pretty()
db.attendance.find({tanggal: "2025-01-22"}).pretty()
```

---

## 📦 Adding Dependencies

### Backend
```bash
cd /app/backend
pip install new-package
pip freeze > requirements.txt
```

### Frontend
```bash
cd /app/frontend
yarn add new-package
# package.json otomatis terupdate
```

**⚠️ PENTING: Jangan pakai npm, selalu pakai yarn!**

---

## 🚀 Deployment Notes

### Environment Variables
- Jangan hardcode values
- Selalu gunakan `.env`
- Jangan commit `.env` ke git

### Production Checklist
- [ ] Set `JWT_SECRET` yang kuat
- [ ] Configure CORS untuk domain production
- [ ] Enable HTTPS
- [ ] Setup MongoDB authentication
- [ ] Configure proper logging
- [ ] Setup monitoring

---

## 📚 Useful Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Motor (Async MongoDB)](https://motor.readthedocs.io/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [face-api.js](https://github.com/vladmandic/face-api)
- [Recharts](https://recharts.org/)
