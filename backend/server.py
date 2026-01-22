from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'haergo-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Haergo HR System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===================== MODELS =====================

class UserBase(BaseModel):
    email: EmailStr
    nama_lengkap: str
    role: str = Field(default="employee")  # super_admin, hr, manager, employee

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    nama_lengkap: str
    role: str
    employee_id: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DepartmentBase(BaseModel):
    nama: str
    deskripsi: Optional[str] = None
    kode: str

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    jumlah_karyawan: int = 0

class PositionBase(BaseModel):
    nama: str
    deskripsi: Optional[str] = None
    level: int = 1  # 1=Staff, 2=Supervisor, 3=Manager, 4=Director, 5=C-Level
    department_id: str

class PositionCreate(PositionBase):
    pass

class PositionResponse(PositionBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    department_nama: Optional[str] = None

class EmployeeBase(BaseModel):
    nik: str  # Nomor Induk Karyawan
    nama_lengkap: str
    email: EmailStr
    telepon: Optional[str] = None
    alamat: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    jenis_kelamin: Optional[str] = None  # L/P
    tanggal_bergabung: str
    department_id: str
    position_id: str
    status: str = "aktif"  # aktif, non-aktif, cuti, resign
    foto_url: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    nama_lengkap: Optional[str] = None
    email: Optional[EmailStr] = None
    telepon: Optional[str] = None
    alamat: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    jenis_kelamin: Optional[str] = None
    department_id: Optional[str] = None
    position_id: Optional[str] = None
    status: Optional[str] = None
    foto_url: Optional[str] = None

class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    department_nama: Optional[str] = None
    position_nama: Optional[str] = None
    user_id: Optional[str] = None

class DashboardStats(BaseModel):
    total_karyawan: int
    karyawan_aktif: int
    karyawan_nonaktif: int
    total_departemen: int
    total_posisi: int
    karyawan_per_departemen: List[dict]
    karyawan_per_status: List[dict]
    karyawan_baru_bulan_ini: int

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User tidak ditemukan")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token sudah kadaluarsa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

def require_role(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user['role'] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Akses ditolak")
        return user
    return role_checker

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'email': user_data.email,
        'nama_lengkap': user_data.nama_lengkap,
        'password': hash_password(user_data.password),
        'role': user_data.role,
        'employee_id': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        nama_lengkap=user_data.nama_lengkap,
        role=user_data.role,
        employee_id=None,
        created_at=user_doc['created_at']
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    
    token = create_token(user['id'], user['email'], user['role'])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            nama_lengkap=user['nama_lengkap'],
            role=user['role'],
            employee_id=user.get('employee_id'),
            created_at=user['created_at']
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user['id'],
        email=user['email'],
        nama_lengkap=user['nama_lengkap'],
        role=user['role'],
        employee_id=user.get('employee_id'),
        created_at=user['created_at']
    )

# ===================== DEPARTMENT ROUTES =====================

@api_router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    data: DepartmentCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    existing = await db.departments.find_one({'kode': data.kode})
    if existing:
        raise HTTPException(status_code=400, detail="Kode departemen sudah ada")
    
    dept_id = str(uuid.uuid4())
    dept_doc = {
        'id': dept_id,
        'nama': data.nama,
        'deskripsi': data.deskripsi,
        'kode': data.kode,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.departments.insert_one(dept_doc)
    
    return DepartmentResponse(
        id=dept_id,
        nama=data.nama,
        deskripsi=data.deskripsi,
        kode=data.kode,
        created_at=dept_doc['created_at'],
        jumlah_karyawan=0
    )

@api_router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(user: dict = Depends(get_current_user)):
    departments = await db.departments.find({}, {'_id': 0}).to_list(100)
    
    result = []
    for dept in departments:
        count = await db.employees.count_documents({'department_id': dept['id'], 'status': 'aktif'})
        result.append(DepartmentResponse(
            id=dept['id'],
            nama=dept['nama'],
            deskripsi=dept.get('deskripsi'),
            kode=dept['kode'],
            created_at=dept['created_at'],
            jumlah_karyawan=count
        ))
    return result

@api_router.get("/departments/{dept_id}", response_model=DepartmentResponse)
async def get_department(dept_id: str, user: dict = Depends(get_current_user)):
    dept = await db.departments.find_one({'id': dept_id}, {'_id': 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Departemen tidak ditemukan")
    
    count = await db.employees.count_documents({'department_id': dept_id, 'status': 'aktif'})
    return DepartmentResponse(
        id=dept['id'],
        nama=dept['nama'],
        deskripsi=dept.get('deskripsi'),
        kode=dept['kode'],
        created_at=dept['created_at'],
        jumlah_karyawan=count
    )

@api_router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: str,
    data: DepartmentCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    dept = await db.departments.find_one({'id': dept_id})
    if not dept:
        raise HTTPException(status_code=404, detail="Departemen tidak ditemukan")
    
    await db.departments.update_one(
        {'id': dept_id},
        {'$set': {'nama': data.nama, 'deskripsi': data.deskripsi, 'kode': data.kode}}
    )
    
    updated = await db.departments.find_one({'id': dept_id}, {'_id': 0})
    count = await db.employees.count_documents({'department_id': dept_id, 'status': 'aktif'})
    
    return DepartmentResponse(
        id=updated['id'],
        nama=updated['nama'],
        deskripsi=updated.get('deskripsi'),
        kode=updated['kode'],
        created_at=updated['created_at'],
        jumlah_karyawan=count
    )

@api_router.delete("/departments/{dept_id}")
async def delete_department(
    dept_id: str,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    dept = await db.departments.find_one({'id': dept_id})
    if not dept:
        raise HTTPException(status_code=404, detail="Departemen tidak ditemukan")
    
    emp_count = await db.employees.count_documents({'department_id': dept_id})
    if emp_count > 0:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus departemen yang masih memiliki karyawan")
    
    await db.departments.delete_one({'id': dept_id})
    return {"message": "Departemen berhasil dihapus"}

# ===================== POSITION ROUTES =====================

@api_router.post("/positions", response_model=PositionResponse)
async def create_position(
    data: PositionCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    dept = await db.departments.find_one({'id': data.department_id})
    if not dept:
        raise HTTPException(status_code=400, detail="Departemen tidak ditemukan")
    
    pos_id = str(uuid.uuid4())
    pos_doc = {
        'id': pos_id,
        'nama': data.nama,
        'deskripsi': data.deskripsi,
        'level': data.level,
        'department_id': data.department_id,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.positions.insert_one(pos_doc)
    
    return PositionResponse(
        id=pos_id,
        nama=data.nama,
        deskripsi=data.deskripsi,
        level=data.level,
        department_id=data.department_id,
        created_at=pos_doc['created_at'],
        department_nama=dept['nama']
    )

@api_router.get("/positions", response_model=List[PositionResponse])
async def get_positions(
    department_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if department_id:
        query['department_id'] = department_id
    
    positions = await db.positions.find(query, {'_id': 0}).to_list(100)
    
    result = []
    for pos in positions:
        dept = await db.departments.find_one({'id': pos['department_id']}, {'_id': 0})
        result.append(PositionResponse(
            id=pos['id'],
            nama=pos['nama'],
            deskripsi=pos.get('deskripsi'),
            level=pos['level'],
            department_id=pos['department_id'],
            created_at=pos['created_at'],
            department_nama=dept['nama'] if dept else None
        ))
    return result

@api_router.get("/positions/{pos_id}", response_model=PositionResponse)
async def get_position(pos_id: str, user: dict = Depends(get_current_user)):
    pos = await db.positions.find_one({'id': pos_id}, {'_id': 0})
    if not pos:
        raise HTTPException(status_code=404, detail="Posisi tidak ditemukan")
    
    dept = await db.departments.find_one({'id': pos['department_id']}, {'_id': 0})
    return PositionResponse(
        id=pos['id'],
        nama=pos['nama'],
        deskripsi=pos.get('deskripsi'),
        level=pos['level'],
        department_id=pos['department_id'],
        created_at=pos['created_at'],
        department_nama=dept['nama'] if dept else None
    )

@api_router.put("/positions/{pos_id}", response_model=PositionResponse)
async def update_position(
    pos_id: str,
    data: PositionCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    pos = await db.positions.find_one({'id': pos_id})
    if not pos:
        raise HTTPException(status_code=404, detail="Posisi tidak ditemukan")
    
    dept = await db.departments.find_one({'id': data.department_id})
    if not dept:
        raise HTTPException(status_code=400, detail="Departemen tidak ditemukan")
    
    await db.positions.update_one(
        {'id': pos_id},
        {'$set': {
            'nama': data.nama,
            'deskripsi': data.deskripsi,
            'level': data.level,
            'department_id': data.department_id
        }}
    )
    
    updated = await db.positions.find_one({'id': pos_id}, {'_id': 0})
    return PositionResponse(
        id=updated['id'],
        nama=updated['nama'],
        deskripsi=updated.get('deskripsi'),
        level=updated['level'],
        department_id=updated['department_id'],
        created_at=updated['created_at'],
        department_nama=dept['nama']
    )

@api_router.delete("/positions/{pos_id}")
async def delete_position(
    pos_id: str,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    pos = await db.positions.find_one({'id': pos_id})
    if not pos:
        raise HTTPException(status_code=404, detail="Posisi tidak ditemukan")
    
    emp_count = await db.employees.count_documents({'position_id': pos_id})
    if emp_count > 0:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus posisi yang masih memiliki karyawan")
    
    await db.positions.delete_one({'id': pos_id})
    return {"message": "Posisi berhasil dihapus"}

# ===================== EMPLOYEE ROUTES =====================

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(
    data: EmployeeCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    existing = await db.employees.find_one({'$or': [{'nik': data.nik}, {'email': data.email}]})
    if existing:
        raise HTTPException(status_code=400, detail="NIK atau Email sudah terdaftar")
    
    dept = await db.departments.find_one({'id': data.department_id})
    if not dept:
        raise HTTPException(status_code=400, detail="Departemen tidak ditemukan")
    
    pos = await db.positions.find_one({'id': data.position_id})
    if not pos:
        raise HTTPException(status_code=400, detail="Posisi tidak ditemukan")
    
    emp_id = str(uuid.uuid4())
    emp_doc = {
        'id': emp_id,
        'nik': data.nik,
        'nama_lengkap': data.nama_lengkap,
        'email': data.email,
        'telepon': data.telepon,
        'alamat': data.alamat,
        'tanggal_lahir': data.tanggal_lahir,
        'jenis_kelamin': data.jenis_kelamin,
        'tanggal_bergabung': data.tanggal_bergabung,
        'department_id': data.department_id,
        'position_id': data.position_id,
        'status': data.status,
        'foto_url': data.foto_url,
        'user_id': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.employees.insert_one(emp_doc)
    
    return EmployeeResponse(
        id=emp_id,
        nik=data.nik,
        nama_lengkap=data.nama_lengkap,
        email=data.email,
        telepon=data.telepon,
        alamat=data.alamat,
        tanggal_lahir=data.tanggal_lahir,
        jenis_kelamin=data.jenis_kelamin,
        tanggal_bergabung=data.tanggal_bergabung,
        department_id=data.department_id,
        position_id=data.position_id,
        status=data.status,
        foto_url=data.foto_url,
        created_at=emp_doc['created_at'],
        department_nama=dept['nama'],
        position_nama=pos['nama'],
        user_id=None
    )

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if department_id:
        query['department_id'] = department_id
    if status:
        query['status'] = status
    if search:
        query['$or'] = [
            {'nama_lengkap': {'$regex': search, '$options': 'i'}},
            {'nik': {'$regex': search, '$options': 'i'}},
            {'email': {'$regex': search, '$options': 'i'}}
        ]
    
    employees = await db.employees.find(query, {'_id': 0}).to_list(1000)
    
    result = []
    for emp in employees:
        dept = await db.departments.find_one({'id': emp['department_id']}, {'_id': 0})
        pos = await db.positions.find_one({'id': emp['position_id']}, {'_id': 0})
        result.append(EmployeeResponse(
            id=emp['id'],
            nik=emp['nik'],
            nama_lengkap=emp['nama_lengkap'],
            email=emp['email'],
            telepon=emp.get('telepon'),
            alamat=emp.get('alamat'),
            tanggal_lahir=emp.get('tanggal_lahir'),
            jenis_kelamin=emp.get('jenis_kelamin'),
            tanggal_bergabung=emp['tanggal_bergabung'],
            department_id=emp['department_id'],
            position_id=emp['position_id'],
            status=emp['status'],
            foto_url=emp.get('foto_url'),
            created_at=emp['created_at'],
            department_nama=dept['nama'] if dept else None,
            position_nama=pos['nama'] if pos else None,
            user_id=emp.get('user_id')
        ))
    return result

@api_router.get("/employees/{emp_id}", response_model=EmployeeResponse)
async def get_employee(emp_id: str, user: dict = Depends(get_current_user)):
    emp = await db.employees.find_one({'id': emp_id}, {'_id': 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    
    dept = await db.departments.find_one({'id': emp['department_id']}, {'_id': 0})
    pos = await db.positions.find_one({'id': emp['position_id']}, {'_id': 0})
    
    return EmployeeResponse(
        id=emp['id'],
        nik=emp['nik'],
        nama_lengkap=emp['nama_lengkap'],
        email=emp['email'],
        telepon=emp.get('telepon'),
        alamat=emp.get('alamat'),
        tanggal_lahir=emp.get('tanggal_lahir'),
        jenis_kelamin=emp.get('jenis_kelamin'),
        tanggal_bergabung=emp['tanggal_bergabung'],
        department_id=emp['department_id'],
        position_id=emp['position_id'],
        status=emp['status'],
        foto_url=emp.get('foto_url'),
        created_at=emp['created_at'],
        department_nama=dept['nama'] if dept else None,
        position_nama=pos['nama'] if pos else None,
        user_id=emp.get('user_id')
    )

@api_router.put("/employees/{emp_id}", response_model=EmployeeResponse)
async def update_employee(
    emp_id: str,
    data: EmployeeUpdate,
    user: dict = Depends(get_current_user)
):
    emp = await db.employees.find_one({'id': emp_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    
    # Check if user is HR/Admin or the employee themselves
    if user['role'] not in ['super_admin', 'hr'] and user.get('employee_id') != emp_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if 'department_id' in update_data:
        dept = await db.departments.find_one({'id': update_data['department_id']})
        if not dept:
            raise HTTPException(status_code=400, detail="Departemen tidak ditemukan")
    
    if 'position_id' in update_data:
        pos = await db.positions.find_one({'id': update_data['position_id']})
        if not pos:
            raise HTTPException(status_code=400, detail="Posisi tidak ditemukan")
    
    if update_data:
        await db.employees.update_one({'id': emp_id}, {'$set': update_data})
    
    updated = await db.employees.find_one({'id': emp_id}, {'_id': 0})
    dept = await db.departments.find_one({'id': updated['department_id']}, {'_id': 0})
    pos = await db.positions.find_one({'id': updated['position_id']}, {'_id': 0})
    
    return EmployeeResponse(
        id=updated['id'],
        nik=updated['nik'],
        nama_lengkap=updated['nama_lengkap'],
        email=updated['email'],
        telepon=updated.get('telepon'),
        alamat=updated.get('alamat'),
        tanggal_lahir=updated.get('tanggal_lahir'),
        jenis_kelamin=updated.get('jenis_kelamin'),
        tanggal_bergabung=updated['tanggal_bergabung'],
        department_id=updated['department_id'],
        position_id=updated['position_id'],
        status=updated['status'],
        foto_url=updated.get('foto_url'),
        created_at=updated['created_at'],
        department_nama=dept['nama'] if dept else None,
        position_nama=pos['nama'] if pos else None,
        user_id=updated.get('user_id')
    )

@api_router.delete("/employees/{emp_id}")
async def delete_employee(
    emp_id: str,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    emp = await db.employees.find_one({'id': emp_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    
    # Also delete associated user if exists
    if emp.get('user_id'):
        await db.users.delete_one({'id': emp['user_id']})
    
    await db.employees.delete_one({'id': emp_id})
    return {"message": "Karyawan berhasil dihapus"}

# ===================== USER MANAGEMENT ROUTES =====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_role(['super_admin', 'hr']))):
    users = await db.users.find({}, {'_id': 0, 'password': 0}).to_list(1000)
    return [UserResponse(
        id=u['id'],
        email=u['email'],
        nama_lengkap=u['nama_lengkap'],
        role=u['role'],
        employee_id=u.get('employee_id'),
        created_at=u['created_at']
    ) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    current_user: dict = Depends(require_role(['super_admin']))
):
    if role not in ['super_admin', 'hr', 'manager', 'employee']:
        raise HTTPException(status_code=400, detail="Role tidak valid")
    
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    await db.users.update_one({'id': user_id}, {'$set': {'role': role}})
    return {"message": "Role berhasil diubah"}

@api_router.post("/users/{user_id}/link-employee/{emp_id}")
async def link_user_to_employee(
    user_id: str,
    emp_id: str,
    current_user: dict = Depends(require_role(['super_admin', 'hr']))
):
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    emp = await db.employees.find_one({'id': emp_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    
    await db.users.update_one({'id': user_id}, {'$set': {'employee_id': emp_id}})
    await db.employees.update_one({'id': emp_id}, {'$set': {'user_id': user_id}})
    
    return {"message": "User berhasil dihubungkan dengan karyawan"}

# ===================== DASHBOARD ROUTES =====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    total_karyawan = await db.employees.count_documents({})
    karyawan_aktif = await db.employees.count_documents({'status': 'aktif'})
    karyawan_nonaktif = await db.employees.count_documents({'status': {'$ne': 'aktif'}})
    total_departemen = await db.departments.count_documents({})
    total_posisi = await db.positions.count_documents({})
    
    # Karyawan per departemen
    departments = await db.departments.find({}, {'_id': 0}).to_list(100)
    karyawan_per_dept = []
    for dept in departments:
        count = await db.employees.count_documents({'department_id': dept['id'], 'status': 'aktif'})
        karyawan_per_dept.append({'nama': dept['nama'], 'jumlah': count})
    
    # Karyawan per status
    statuses = ['aktif', 'non-aktif', 'cuti', 'resign']
    karyawan_per_status = []
    for s in statuses:
        count = await db.employees.count_documents({'status': s})
        if count > 0:
            karyawan_per_status.append({'status': s, 'jumlah': count})
    
    # Karyawan baru bulan ini
    now = datetime.now(timezone.utc)
    first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    karyawan_baru = await db.employees.count_documents({
        'tanggal_bergabung': {'$gte': first_day.strftime('%Y-%m-%d')}
    })
    
    return DashboardStats(
        total_karyawan=total_karyawan,
        karyawan_aktif=karyawan_aktif,
        karyawan_nonaktif=karyawan_nonaktif,
        total_departemen=total_departemen,
        total_posisi=total_posisi,
        karyawan_per_departemen=karyawan_per_dept,
        karyawan_per_status=karyawan_per_status,
        karyawan_baru_bulan_ini=karyawan_baru
    )

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_data():
    # Check if data already exists
    existing = await db.users.find_one({'email': 'admin@haergo.com'})
    if existing:
        return {"message": "Data sudah ada"}
    
    # Create Super Admin
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        'id': admin_id,
        'email': 'admin@haergo.com',
        'nama_lengkap': 'Super Admin',
        'password': hash_password('admin123'),
        'role': 'super_admin',
        'employee_id': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    # Create HR User
    hr_id = str(uuid.uuid4())
    await db.users.insert_one({
        'id': hr_id,
        'email': 'hr@haergo.com',
        'nama_lengkap': 'HR Manager',
        'password': hash_password('hr123'),
        'role': 'hr',
        'employee_id': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    # Create Departments
    departments_data = [
        {'nama': 'Information Technology', 'kode': 'IT', 'deskripsi': 'Departemen Teknologi Informasi'},
        {'nama': 'Human Resources', 'kode': 'HR', 'deskripsi': 'Departemen Sumber Daya Manusia'},
        {'nama': 'Finance', 'kode': 'FIN', 'deskripsi': 'Departemen Keuangan'},
        {'nama': 'Marketing', 'kode': 'MKT', 'deskripsi': 'Departemen Pemasaran'},
        {'nama': 'Operations', 'kode': 'OPS', 'deskripsi': 'Departemen Operasional'},
    ]
    
    dept_ids = {}
    for d in departments_data:
        dept_id = str(uuid.uuid4())
        dept_ids[d['kode']] = dept_id
        await db.departments.insert_one({
            'id': dept_id,
            'nama': d['nama'],
            'kode': d['kode'],
            'deskripsi': d['deskripsi'],
            'created_at': datetime.now(timezone.utc).isoformat()
        })
    
    # Create Positions
    positions_data = [
        {'nama': 'Software Engineer', 'level': 1, 'dept': 'IT'},
        {'nama': 'Senior Software Engineer', 'level': 2, 'dept': 'IT'},
        {'nama': 'Tech Lead', 'level': 3, 'dept': 'IT'},
        {'nama': 'HR Staff', 'level': 1, 'dept': 'HR'},
        {'nama': 'HR Manager', 'level': 3, 'dept': 'HR'},
        {'nama': 'Accountant', 'level': 1, 'dept': 'FIN'},
        {'nama': 'Finance Manager', 'level': 3, 'dept': 'FIN'},
        {'nama': 'Marketing Staff', 'level': 1, 'dept': 'MKT'},
        {'nama': 'Marketing Manager', 'level': 3, 'dept': 'MKT'},
        {'nama': 'Operations Staff', 'level': 1, 'dept': 'OPS'},
        {'nama': 'Operations Manager', 'level': 3, 'dept': 'OPS'},
    ]
    
    pos_ids = {}
    for p in positions_data:
        pos_id = str(uuid.uuid4())
        pos_ids[p['nama']] = pos_id
        await db.positions.insert_one({
            'id': pos_id,
            'nama': p['nama'],
            'level': p['level'],
            'department_id': dept_ids[p['dept']],
            'deskripsi': f"Posisi {p['nama']}",
            'created_at': datetime.now(timezone.utc).isoformat()
        })
    
    # Create Employees
    employees_data = [
        {'nik': 'EMP001', 'nama': 'Budi Santoso', 'email': 'budi@haergo.com', 'jk': 'L', 'dept': 'IT', 'pos': 'Tech Lead', 'tgl': '2020-01-15'},
        {'nik': 'EMP002', 'nama': 'Siti Rahayu', 'email': 'siti@haergo.com', 'jk': 'P', 'dept': 'HR', 'pos': 'HR Manager', 'tgl': '2019-06-01'},
        {'nik': 'EMP003', 'nama': 'Ahmad Wijaya', 'email': 'ahmad@haergo.com', 'jk': 'L', 'dept': 'FIN', 'pos': 'Finance Manager', 'tgl': '2018-03-20'},
        {'nik': 'EMP004', 'nama': 'Dewi Lestari', 'email': 'dewi@haergo.com', 'jk': 'P', 'dept': 'MKT', 'pos': 'Marketing Manager', 'tgl': '2021-02-10'},
        {'nik': 'EMP005', 'nama': 'Rudi Hermawan', 'email': 'rudi@haergo.com', 'jk': 'L', 'dept': 'IT', 'pos': 'Senior Software Engineer', 'tgl': '2021-08-01'},
        {'nik': 'EMP006', 'nama': 'Maya Putri', 'email': 'maya@haergo.com', 'jk': 'P', 'dept': 'IT', 'pos': 'Software Engineer', 'tgl': '2022-01-15'},
        {'nik': 'EMP007', 'nama': 'Andi Prasetyo', 'email': 'andi@haergo.com', 'jk': 'L', 'dept': 'OPS', 'pos': 'Operations Manager', 'tgl': '2020-05-01'},
        {'nik': 'EMP008', 'nama': 'Nina Sari', 'email': 'nina@haergo.com', 'jk': 'P', 'dept': 'FIN', 'pos': 'Accountant', 'tgl': '2023-03-01'},
        {'nik': 'EMP009', 'nama': 'Hendra Kurniawan', 'email': 'hendra@haergo.com', 'jk': 'L', 'dept': 'MKT', 'pos': 'Marketing Staff', 'tgl': '2023-06-15'},
        {'nik': 'EMP010', 'nama': 'Lisa Permata', 'email': 'lisa@haergo.com', 'jk': 'P', 'dept': 'HR', 'pos': 'HR Staff', 'tgl': '2024-01-02'},
    ]
    
    avatars = [
        'https://images.pexels.com/photos/29852895/pexels-photo-29852895.jpeg',
        'https://images.pexels.com/photos/12903122/pexels-photo-12903122.jpeg',
        'https://images.unsplash.com/photo-1589220286904-3dcef62c68ee?w=200'
    ]
    
    for i, e in enumerate(employees_data):
        emp_id = str(uuid.uuid4())
        await db.employees.insert_one({
            'id': emp_id,
            'nik': e['nik'],
            'nama_lengkap': e['nama'],
            'email': e['email'],
            'telepon': f'0812345678{i}',
            'alamat': f'Jl. Contoh No. {i+1}, Jakarta',
            'tanggal_lahir': f'199{i % 10}-0{(i % 9) + 1}-{10 + i}',
            'jenis_kelamin': e['jk'],
            'tanggal_bergabung': e['tgl'],
            'department_id': dept_ids[e['dept']],
            'position_id': pos_ids[e['pos']],
            'status': 'aktif',
            'foto_url': avatars[i % len(avatars)],
            'user_id': None,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Data berhasil dibuat", "admin_email": "admin@haergo.com", "admin_password": "admin123"}

# ===================== ROOT =====================

@api_router.get("/")
async def root():
    return {"message": "Haergo HR System API", "version": "1.0.0"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
