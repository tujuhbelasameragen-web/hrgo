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

# ===================== ATTENDANCE MODELS =====================

class OfficeLocation(BaseModel):
    id: str
    nama: str
    latitude: float
    longitude: float
    radius: int = 100  # in meters
    is_default: bool = False

class AttendanceCreate(BaseModel):
    tipe: str  # clock_in, clock_out
    mode: str  # wfo, wfh, client_visit
    latitude: float
    longitude: float
    foto_url: str  # base64 or URL of selfie
    catatan: Optional[str] = None
    alamat_client: Optional[str] = None  # for client visit

class AttendanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_nama: Optional[str] = None
    tanggal: str
    clock_in: Optional[str] = None
    clock_in_foto: Optional[str] = None
    clock_in_latitude: Optional[float] = None
    clock_in_longitude: Optional[float] = None
    clock_in_mode: Optional[str] = None
    clock_out: Optional[str] = None
    clock_out_foto: Optional[str] = None
    clock_out_latitude: Optional[float] = None
    clock_out_longitude: Optional[float] = None
    clock_out_mode: Optional[str] = None
    total_jam: Optional[float] = None
    status: str  # hadir, terlambat, alpha, izin
    catatan: Optional[str] = None

class FaceDataCreate(BaseModel):
    face_descriptor: List[float]  # 128-dimensional face descriptor

class AttendanceStats(BaseModel):
    total_hari_kerja: int
    total_hadir: int
    total_terlambat: int
    total_alpha: int
    persentase_kehadiran: float

# Office location settings
OFFICE_LOCATIONS = [
    {
        'id': 'office-main',
        'nama': 'Kantor Pusat',
        'latitude': -6.161777101062483,
        'longitude': 106.87519933469652,
        'radius': 100,
        'is_default': True
    }
]

WORK_HOURS = {
    'start': '09:00',
    'end': '18:00',
    'late_tolerance_minutes': 15
}

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in meters using Haversine formula"""
    from math import radians, cos, sin, asin, sqrt
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371000  # Earth radius in meters
    return c * r

def is_within_office(lat: float, lon: float) -> tuple:
    """Check if coordinates are within any office location"""
    for office in OFFICE_LOCATIONS:
        distance = calculate_distance(lat, lon, office['latitude'], office['longitude'])
        if distance <= office['radius']:
            return True, office['nama'], distance
    return False, None, None

def is_late(clock_in_time: datetime) -> bool:
    """Check if clock in time is late"""
    start_hour, start_minute = map(int, WORK_HOURS['start'].split(':'))
    tolerance = WORK_HOURS['late_tolerance_minutes']
    
    deadline = clock_in_time.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
    deadline += timedelta(minutes=tolerance)
    
    return clock_in_time > deadline

# ===================== ATTENDANCE ROUTES =====================

@api_router.get("/attendance/settings")
async def get_attendance_settings(user: dict = Depends(get_current_user)):
    """Get attendance settings including office locations and work hours"""
    return {
        "office_locations": OFFICE_LOCATIONS,
        "work_hours": WORK_HOURS
    }

@api_router.post("/attendance/clock", response_model=AttendanceResponse)
async def clock_attendance(
    data: AttendanceCreate,
    user: dict = Depends(get_current_user)
):
    """Clock in or clock out"""
    if not user.get('employee_id'):
        raise HTTPException(status_code=400, detail="Akun tidak terhubung dengan data karyawan")
    
    employee_id = user['employee_id']
    now = datetime.now(timezone.utc)
    today = now.strftime('%Y-%m-%d')
    
    # Get employee data
    employee = await db.employees.find_one({'id': employee_id}, {'_id': 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Data karyawan tidak ditemukan")
    
    # Validate mode
    if data.mode not in ['wfo', 'wfh', 'client_visit']:
        raise HTTPException(status_code=400, detail="Mode tidak valid")
    
    # For WFO, validate location
    if data.mode == 'wfo':
        within_office, office_name, distance = is_within_office(data.latitude, data.longitude)
        if not within_office:
            raise HTTPException(
                status_code=400, 
                detail=f"Lokasi Anda tidak dalam radius kantor. Jarak: {int(distance) if distance else 'unknown'}m"
            )
    
    # For client visit, require address
    if data.mode == 'client_visit' and not data.alamat_client:
        raise HTTPException(status_code=400, detail="Alamat client wajib diisi untuk mode Client Visit")
    
    # Get or create today's attendance record
    attendance = await db.attendance.find_one({
        'employee_id': employee_id,
        'tanggal': today
    }, {'_id': 0})
    
    if data.tipe == 'clock_in':
        if attendance and attendance.get('clock_in'):
            raise HTTPException(status_code=400, detail="Anda sudah clock in hari ini")
        
        # Determine status
        status = 'terlambat' if is_late(now) else 'hadir'
        
        if attendance:
            # Update existing record
            await db.attendance.update_one(
                {'id': attendance['id']},
                {'$set': {
                    'clock_in': now.isoformat(),
                    'clock_in_foto': data.foto_url,
                    'clock_in_latitude': data.latitude,
                    'clock_in_longitude': data.longitude,
                    'clock_in_mode': data.mode,
                    'status': status,
                    'catatan': data.catatan or data.alamat_client
                }}
            )
            attendance_id = attendance['id']
        else:
            # Create new record
            attendance_id = str(uuid.uuid4())
            await db.attendance.insert_one({
                'id': attendance_id,
                'employee_id': employee_id,
                'tanggal': today,
                'clock_in': now.isoformat(),
                'clock_in_foto': data.foto_url,
                'clock_in_latitude': data.latitude,
                'clock_in_longitude': data.longitude,
                'clock_in_mode': data.mode,
                'clock_out': None,
                'clock_out_foto': None,
                'clock_out_latitude': None,
                'clock_out_longitude': None,
                'clock_out_mode': None,
                'total_jam': None,
                'status': status,
                'catatan': data.catatan or data.alamat_client
            })
    
    elif data.tipe == 'clock_out':
        if not attendance or not attendance.get('clock_in'):
            raise HTTPException(status_code=400, detail="Anda belum clock in hari ini")
        
        if attendance.get('clock_out'):
            raise HTTPException(status_code=400, detail="Anda sudah clock out hari ini")
        
        # Calculate total hours
        clock_in_time = datetime.fromisoformat(attendance['clock_in'])
        total_hours = (now - clock_in_time).total_seconds() / 3600
        
        await db.attendance.update_one(
            {'id': attendance['id']},
            {'$set': {
                'clock_out': now.isoformat(),
                'clock_out_foto': data.foto_url,
                'clock_out_latitude': data.latitude,
                'clock_out_longitude': data.longitude,
                'clock_out_mode': data.mode,
                'total_jam': round(total_hours, 2)
            }}
        )
        attendance_id = attendance['id']
    
    else:
        raise HTTPException(status_code=400, detail="Tipe tidak valid (clock_in/clock_out)")
    
    # Return updated attendance
    updated = await db.attendance.find_one({'id': attendance_id}, {'_id': 0})
    return AttendanceResponse(
        id=updated['id'],
        employee_id=updated['employee_id'],
        employee_nama=employee['nama_lengkap'],
        tanggal=updated['tanggal'],
        clock_in=updated.get('clock_in'),
        clock_in_foto=updated.get('clock_in_foto'),
        clock_in_latitude=updated.get('clock_in_latitude'),
        clock_in_longitude=updated.get('clock_in_longitude'),
        clock_in_mode=updated.get('clock_in_mode'),
        clock_out=updated.get('clock_out'),
        clock_out_foto=updated.get('clock_out_foto'),
        clock_out_latitude=updated.get('clock_out_latitude'),
        clock_out_longitude=updated.get('clock_out_longitude'),
        clock_out_mode=updated.get('clock_out_mode'),
        total_jam=updated.get('total_jam'),
        status=updated['status'],
        catatan=updated.get('catatan')
    )

@api_router.get("/attendance/today", response_model=Optional[AttendanceResponse])
async def get_today_attendance(user: dict = Depends(get_current_user)):
    """Get today's attendance for current user"""
    if not user.get('employee_id'):
        return None
    
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    attendance = await db.attendance.find_one({
        'employee_id': user['employee_id'],
        'tanggal': today
    }, {'_id': 0})
    
    if not attendance:
        return None
    
    employee = await db.employees.find_one({'id': user['employee_id']}, {'_id': 0})
    
    return AttendanceResponse(
        id=attendance['id'],
        employee_id=attendance['employee_id'],
        employee_nama=employee['nama_lengkap'] if employee else None,
        tanggal=attendance['tanggal'],
        clock_in=attendance.get('clock_in'),
        clock_in_foto=attendance.get('clock_in_foto'),
        clock_in_latitude=attendance.get('clock_in_latitude'),
        clock_in_longitude=attendance.get('clock_in_longitude'),
        clock_in_mode=attendance.get('clock_in_mode'),
        clock_out=attendance.get('clock_out'),
        clock_out_foto=attendance.get('clock_out_foto'),
        clock_out_latitude=attendance.get('clock_out_latitude'),
        clock_out_longitude=attendance.get('clock_out_longitude'),
        clock_out_mode=attendance.get('clock_out_mode'),
        total_jam=attendance.get('total_jam'),
        status=attendance['status'],
        catatan=attendance.get('catatan')
    )

@api_router.get("/attendance/history", response_model=List[AttendanceResponse])
async def get_attendance_history(
    employee_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get attendance history"""
    # If not HR/Admin, can only see own history
    if user['role'] not in ['super_admin', 'hr']:
        employee_id = user.get('employee_id')
        if not employee_id:
            return []
    
    query = {}
    if employee_id:
        query['employee_id'] = employee_id
    
    if start_date:
        query['tanggal'] = {'$gte': start_date}
    if end_date:
        if 'tanggal' in query:
            query['tanggal']['$lte'] = end_date
        else:
            query['tanggal'] = {'$lte': end_date}
    
    attendance_list = await db.attendance.find(query, {'_id': 0}).sort('tanggal', -1).to_list(100)
    
    result = []
    for att in attendance_list:
        employee = await db.employees.find_one({'id': att['employee_id']}, {'_id': 0})
        result.append(AttendanceResponse(
            id=att['id'],
            employee_id=att['employee_id'],
            employee_nama=employee['nama_lengkap'] if employee else None,
            tanggal=att['tanggal'],
            clock_in=att.get('clock_in'),
            clock_in_foto=att.get('clock_in_foto'),
            clock_in_latitude=att.get('clock_in_latitude'),
            clock_in_longitude=att.get('clock_in_longitude'),
            clock_in_mode=att.get('clock_in_mode'),
            clock_out=att.get('clock_out'),
            clock_out_foto=att.get('clock_out_foto'),
            clock_out_latitude=att.get('clock_out_latitude'),
            clock_out_longitude=att.get('clock_out_longitude'),
            clock_out_mode=att.get('clock_out_mode'),
            total_jam=att.get('total_jam'),
            status=att['status'],
            catatan=att.get('catatan')
        ))
    
    return result

@api_router.get("/attendance/stats", response_model=AttendanceStats)
async def get_attendance_stats(
    employee_id: Optional[str] = None,
    month: Optional[str] = None,  # Format: YYYY-MM
    user: dict = Depends(get_current_user)
):
    """Get attendance statistics"""
    if user['role'] not in ['super_admin', 'hr']:
        employee_id = user.get('employee_id')
        if not employee_id:
            return AttendanceStats(
                total_hari_kerja=0,
                total_hadir=0,
                total_terlambat=0,
                total_alpha=0,
                persentase_kehadiran=0
            )
    
    # Default to current month
    if not month:
        month = datetime.now(timezone.utc).strftime('%Y-%m')
    
    query = {'tanggal': {'$regex': f'^{month}'}}
    if employee_id:
        query['employee_id'] = employee_id
    
    attendance_list = await db.attendance.find(query, {'_id': 0}).to_list(100)
    
    total_hadir = sum(1 for a in attendance_list if a['status'] == 'hadir')
    total_terlambat = sum(1 for a in attendance_list if a['status'] == 'terlambat')
    total_alpha = sum(1 for a in attendance_list if a['status'] == 'alpha')
    
    # Calculate working days in month (Mon-Fri)
    year, mon = map(int, month.split('-'))
    from calendar import monthrange
    _, days_in_month = monthrange(year, mon)
    total_hari_kerja = sum(1 for d in range(1, days_in_month + 1) 
                          if datetime(year, mon, d).weekday() < 5)
    
    total_kehadiran = total_hadir + total_terlambat
    persentase = (total_kehadiran / total_hari_kerja * 100) if total_hari_kerja > 0 else 0
    
    return AttendanceStats(
        total_hari_kerja=total_hari_kerja,
        total_hadir=total_hadir,
        total_terlambat=total_terlambat,
        total_alpha=total_alpha,
        persentase_kehadiran=round(persentase, 1)
    )

@api_router.get("/attendance/team", response_model=List[AttendanceResponse])
async def get_team_attendance(
    tanggal: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get team attendance for today (HR/Manager view)"""
    if user['role'] not in ['super_admin', 'hr', 'manager']:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    if not tanggal:
        tanggal = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    attendance_list = await db.attendance.find({'tanggal': tanggal}, {'_id': 0}).to_list(1000)
    
    result = []
    for att in attendance_list:
        employee = await db.employees.find_one({'id': att['employee_id']}, {'_id': 0})
        result.append(AttendanceResponse(
            id=att['id'],
            employee_id=att['employee_id'],
            employee_nama=employee['nama_lengkap'] if employee else None,
            tanggal=att['tanggal'],
            clock_in=att.get('clock_in'),
            clock_in_foto=att.get('clock_in_foto'),
            clock_in_latitude=att.get('clock_in_latitude'),
            clock_in_longitude=att.get('clock_in_longitude'),
            clock_in_mode=att.get('clock_in_mode'),
            clock_out=att.get('clock_out'),
            clock_out_foto=att.get('clock_out_foto'),
            clock_out_latitude=att.get('clock_out_latitude'),
            clock_out_longitude=att.get('clock_out_longitude'),
            clock_out_mode=att.get('clock_out_mode'),
            total_jam=att.get('total_jam'),
            status=att['status'],
            catatan=att.get('catatan')
        ))
    
    return result

# ===================== FACE REGISTRATION =====================

@api_router.post("/face/register")
async def register_face(
    data: FaceDataCreate,
    user: dict = Depends(get_current_user)
):
    """Register face descriptor for an employee"""
    if not user.get('employee_id'):
        raise HTTPException(status_code=400, detail="Akun tidak terhubung dengan data karyawan")
    
    employee_id = user['employee_id']
    
    # Validate face descriptor length (should be 128 for face-api.js)
    if len(data.face_descriptor) != 128:
        raise HTTPException(status_code=400, detail="Invalid face descriptor")
    
    # Save or update face data
    existing = await db.face_data.find_one({'employee_id': employee_id})
    
    if existing:
        await db.face_data.update_one(
            {'employee_id': employee_id},
            {'$set': {
                'face_descriptor': data.face_descriptor,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        await db.face_data.insert_one({
            'id': str(uuid.uuid4()),
            'employee_id': employee_id,
            'face_descriptor': data.face_descriptor,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Wajah berhasil didaftarkan"}

@api_router.get("/face/check")
async def check_face_registered(user: dict = Depends(get_current_user)):
    """Check if user has registered face"""
    if not user.get('employee_id'):
        return {"registered": False}
    
    face_data = await db.face_data.find_one({'employee_id': user['employee_id']})
    return {"registered": face_data is not None}

@api_router.get("/face/descriptor")
async def get_face_descriptor(user: dict = Depends(get_current_user)):
    """Get user's face descriptor for verification"""
    if not user.get('employee_id'):
        raise HTTPException(status_code=400, detail="Akun tidak terhubung dengan data karyawan")
    
    face_data = await db.face_data.find_one({'employee_id': user['employee_id']}, {'_id': 0})
    if not face_data:
        raise HTTPException(status_code=404, detail="Wajah belum didaftarkan")
    
    return {"face_descriptor": face_data['face_descriptor']}

# ===================== LEAVE MANAGEMENT MODELS =====================

# Leave Types Configuration
LEAVE_TYPES = {
    'tahunan': {
        'nama': 'Cuti Tahunan',
        'jatah_default': 14,
        'potong_jatah': True,
        'butuh_approval': True,
        'approval_level': 'manager',  # manager only
        'min_hari_pengajuan': 3,
        'max_hari': 14
    },
    'sakit': {
        'nama': 'Sakit',
        'jatah_default': None,  # Unlimited with doctor's note
        'potong_jatah': False,
        'butuh_approval': True,
        'approval_level': 'manager',
        'min_hari_pengajuan': 0,
        'max_hari': 14,
        'butuh_lampiran': True
    },
    'izin': {
        'nama': 'Izin',
        'jatah_default': 3,
        'potong_jatah': True,
        'butuh_approval': True,
        'approval_level': 'manager',
        'min_hari_pengajuan': 1,
        'max_hari': 3
    },
    'melahirkan': {
        'nama': 'Cuti Melahirkan',
        'jatah_default': 90,
        'potong_jatah': False,
        'butuh_approval': True,
        'approval_level': 'hr',  # HR approval required
        'min_hari_pengajuan': 14,
        'max_hari': 90
    },
    'menikah': {
        'nama': 'Cuti Menikah',
        'jatah_default': 3,
        'potong_jatah': False,
        'butuh_approval': True,
        'approval_level': 'hr',
        'min_hari_pengajuan': 7,
        'max_hari': 3
    },
    'duka': {
        'nama': 'Cuti Duka',
        'jatah_default': 3,
        'potong_jatah': False,
        'butuh_approval': True,
        'approval_level': 'manager',
        'min_hari_pengajuan': 0,
        'max_hari': 7
    }
}

class LeaveRequestCreate(BaseModel):
    tipe_cuti: str
    tanggal_mulai: str
    tanggal_selesai: str
    alasan: str
    lampiran_url: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_nama: Optional[str] = None
    tipe_cuti: str
    tipe_cuti_nama: Optional[str] = None
    tanggal_mulai: str
    tanggal_selesai: str
    jumlah_hari: int
    alasan: str
    lampiran_url: Optional[str] = None
    status: str  # pending, approved, rejected
    approved_by: Optional[str] = None
    approved_by_nama: Optional[str] = None
    approved_at: Optional[str] = None
    rejected_reason: Optional[str] = None
    created_at: str

class LeaveBalanceResponse(BaseModel):
    tipe_cuti: str
    nama: str
    jatah: int
    terpakai: int
    sisa: int

class LeaveApprovalAction(BaseModel):
    action: str  # approve, reject
    alasan: Optional[str] = None

# Overtime Models
class OvertimeRequestCreate(BaseModel):
    tanggal: str
    jam_mulai: str
    jam_selesai: str
    alasan: str

class OvertimeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_nama: Optional[str] = None
    tanggal: str
    jam_mulai: str
    jam_selesai: str
    total_jam: float
    alasan: str
    status: str  # pending, approved, rejected
    approved_by: Optional[str] = None
    approved_by_nama: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: str

# Shift Models
class ShiftCreate(BaseModel):
    nama: str
    jam_masuk: str
    jam_keluar: str
    warna: str = '#0F62FE'

class ShiftResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nama: str
    jam_masuk: str
    jam_keluar: str
    warna: str
    created_at: str

class ShiftAssignmentCreate(BaseModel):
    employee_id: str
    shift_id: str
    tanggal_mulai: str
    tanggal_selesai: Optional[str] = None

class ShiftAssignmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_nama: Optional[str] = None
    shift_id: str
    shift_nama: Optional[str] = None
    shift_jam: Optional[str] = None
    tanggal_mulai: str
    tanggal_selesai: Optional[str] = None

def calculate_working_days(start_date: str, end_date: str) -> int:
    """Calculate working days between two dates (excluding weekends)"""
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:  # Mon-Fri
            days += 1
        current += timedelta(days=1)
    return days

# ===================== LEAVE MANAGEMENT ROUTES =====================

@api_router.get("/leave/types")
async def get_leave_types(user: dict = Depends(get_current_user)):
    """Get all leave types configuration"""
    return LEAVE_TYPES

@api_router.get("/leave/balance", response_model=List[LeaveBalanceResponse])
async def get_leave_balance(
    employee_id: Optional[str] = None,
    year: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    """Get leave balance for an employee"""
    if user['role'] not in ['super_admin', 'hr']:
        employee_id = user.get('employee_id')
    
    if not employee_id:
        return []
    
    if not year:
        year = datetime.now().year
    
    balances = []
    for tipe, config in LEAVE_TYPES.items():
        if config['jatah_default'] is None:
            continue
        
        # Count approved leaves for this type in the year
        approved = await db.leave_requests.count_documents({
            'employee_id': employee_id,
            'tipe_cuti': tipe,
            'status': 'approved',
            'tanggal_mulai': {'$regex': f'^{year}'}
        })
        
        # Sum the days
        leaves = await db.leave_requests.find({
            'employee_id': employee_id,
            'tipe_cuti': tipe,
            'status': 'approved',
            'tanggal_mulai': {'$regex': f'^{year}'}
        }, {'_id': 0}).to_list(100)
        
        terpakai = sum(l.get('jumlah_hari', 0) for l in leaves)
        jatah = config['jatah_default']
        
        balances.append(LeaveBalanceResponse(
            tipe_cuti=tipe,
            nama=config['nama'],
            jatah=jatah,
            terpakai=terpakai,
            sisa=max(0, jatah - terpakai) if config['potong_jatah'] else jatah
        ))
    
    return balances

@api_router.post("/leave/request", response_model=LeaveRequestResponse)
async def create_leave_request(
    data: LeaveRequestCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new leave request"""
    if not user.get('employee_id'):
        raise HTTPException(status_code=400, detail="Akun tidak terhubung dengan data karyawan")
    
    employee_id = user['employee_id']
    employee = await db.employees.find_one({'id': employee_id}, {'_id': 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Data karyawan tidak ditemukan")
    
    # Validate leave type
    if data.tipe_cuti not in LEAVE_TYPES:
        raise HTTPException(status_code=400, detail="Tipe cuti tidak valid")
    
    config = LEAVE_TYPES[data.tipe_cuti]
    
    # Calculate days
    jumlah_hari = calculate_working_days(data.tanggal_mulai, data.tanggal_selesai)
    
    if jumlah_hari <= 0:
        raise HTTPException(status_code=400, detail="Tanggal tidak valid")
    
    if jumlah_hari > config['max_hari']:
        raise HTTPException(status_code=400, detail=f"Maksimal {config['max_hari']} hari untuk {config['nama']}")
    
    # Check minimum days before
    start_date = datetime.strptime(data.tanggal_mulai, '%Y-%m-%d')
    days_before = (start_date - datetime.now()).days
    if days_before < config['min_hari_pengajuan']:
        raise HTTPException(
            status_code=400, 
            detail=f"Pengajuan {config['nama']} minimal {config['min_hari_pengajuan']} hari sebelumnya"
        )
    
    # Check balance if applicable
    if config['potong_jatah'] and config['jatah_default']:
        year = int(data.tanggal_mulai[:4])
        leaves = await db.leave_requests.find({
            'employee_id': employee_id,
            'tipe_cuti': data.tipe_cuti,
            'status': 'approved',
            'tanggal_mulai': {'$regex': f'^{year}'}
        }, {'_id': 0}).to_list(100)
        
        terpakai = sum(l.get('jumlah_hari', 0) for l in leaves)
        sisa = config['jatah_default'] - terpakai
        
        if jumlah_hari > sisa:
            raise HTTPException(status_code=400, detail=f"Sisa cuti tidak mencukupi. Sisa: {sisa} hari")
    
    # Check attachment for sick leave
    if config.get('butuh_lampiran') and not data.lampiran_url:
        # Allow without attachment but note it
        pass
    
    # Create request
    request_id = str(uuid.uuid4())
    leave_doc = {
        'id': request_id,
        'employee_id': employee_id,
        'tipe_cuti': data.tipe_cuti,
        'tanggal_mulai': data.tanggal_mulai,
        'tanggal_selesai': data.tanggal_selesai,
        'jumlah_hari': jumlah_hari,
        'alasan': data.alasan,
        'lampiran_url': data.lampiran_url,
        'status': 'pending',
        'approved_by': None,
        'approved_at': None,
        'rejected_reason': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.leave_requests.insert_one(leave_doc)
    
    return LeaveRequestResponse(
        id=request_id,
        employee_id=employee_id,
        employee_nama=employee['nama_lengkap'],
        tipe_cuti=data.tipe_cuti,
        tipe_cuti_nama=config['nama'],
        tanggal_mulai=data.tanggal_mulai,
        tanggal_selesai=data.tanggal_selesai,
        jumlah_hari=jumlah_hari,
        alasan=data.alasan,
        lampiran_url=data.lampiran_url,
        status='pending',
        approved_by=None,
        approved_by_nama=None,
        approved_at=None,
        rejected_reason=None,
        created_at=leave_doc['created_at']
    )

@api_router.get("/leave/requests", response_model=List[LeaveRequestResponse])
async def get_leave_requests(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get leave requests"""
    query = {}
    
    if user['role'] not in ['super_admin', 'hr', 'manager']:
        employee_id = user.get('employee_id')
    
    if employee_id:
        query['employee_id'] = employee_id
    
    if status:
        query['status'] = status
    
    requests = await db.leave_requests.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    result = []
    for req in requests:
        employee = await db.employees.find_one({'id': req['employee_id']}, {'_id': 0})
        approver = None
        if req.get('approved_by'):
            approver = await db.users.find_one({'id': req['approved_by']}, {'_id': 0})
        
        config = LEAVE_TYPES.get(req['tipe_cuti'], {})
        
        result.append(LeaveRequestResponse(
            id=req['id'],
            employee_id=req['employee_id'],
            employee_nama=employee['nama_lengkap'] if employee else None,
            tipe_cuti=req['tipe_cuti'],
            tipe_cuti_nama=config.get('nama', req['tipe_cuti']),
            tanggal_mulai=req['tanggal_mulai'],
            tanggal_selesai=req['tanggal_selesai'],
            jumlah_hari=req['jumlah_hari'],
            alasan=req['alasan'],
            lampiran_url=req.get('lampiran_url'),
            status=req['status'],
            approved_by=req.get('approved_by'),
            approved_by_nama=approver['nama_lengkap'] if approver else None,
            approved_at=req.get('approved_at'),
            rejected_reason=req.get('rejected_reason'),
            created_at=req['created_at']
        ))
    
    return result

@api_router.get("/leave/pending", response_model=List[LeaveRequestResponse])
async def get_pending_approvals(user: dict = Depends(get_current_user)):
    """Get pending leave requests for approval"""
    if user['role'] not in ['super_admin', 'hr', 'manager']:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    requests = await db.leave_requests.find({'status': 'pending'}, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    result = []
    for req in requests:
        config = LEAVE_TYPES.get(req['tipe_cuti'], {})
        
        # Check if user can approve this type
        approval_level = config.get('approval_level', 'manager')
        if approval_level == 'hr' and user['role'] not in ['super_admin', 'hr']:
            continue
        
        employee = await db.employees.find_one({'id': req['employee_id']}, {'_id': 0})
        
        result.append(LeaveRequestResponse(
            id=req['id'],
            employee_id=req['employee_id'],
            employee_nama=employee['nama_lengkap'] if employee else None,
            tipe_cuti=req['tipe_cuti'],
            tipe_cuti_nama=config.get('nama', req['tipe_cuti']),
            tanggal_mulai=req['tanggal_mulai'],
            tanggal_selesai=req['tanggal_selesai'],
            jumlah_hari=req['jumlah_hari'],
            alasan=req['alasan'],
            lampiran_url=req.get('lampiran_url'),
            status=req['status'],
            approved_by=None,
            approved_by_nama=None,
            approved_at=None,
            rejected_reason=None,
            created_at=req['created_at']
        ))
    
    return result

@api_router.post("/leave/{request_id}/approve")
async def approve_leave_request(
    request_id: str,
    data: LeaveApprovalAction,
    user: dict = Depends(get_current_user)
):
    """Approve or reject a leave request"""
    if user['role'] not in ['super_admin', 'hr', 'manager']:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    leave_req = await db.leave_requests.find_one({'id': request_id}, {'_id': 0})
    if not leave_req:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    
    if leave_req['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Pengajuan sudah diproses")
    
    # Check approval level
    config = LEAVE_TYPES.get(leave_req['tipe_cuti'], {})
    approval_level = config.get('approval_level', 'manager')
    if approval_level == 'hr' and user['role'] not in ['super_admin', 'hr']:
        raise HTTPException(status_code=403, detail="Hanya HR yang dapat menyetujui cuti ini")
    
    if data.action == 'approve':
        await db.leave_requests.update_one(
            {'id': request_id},
            {'$set': {
                'status': 'approved',
                'approved_by': user['id'],
                'approved_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Pengajuan cuti disetujui"}
    
    elif data.action == 'reject':
        if not data.alasan:
            raise HTTPException(status_code=400, detail="Alasan penolakan wajib diisi")
        
        await db.leave_requests.update_one(
            {'id': request_id},
            {'$set': {
                'status': 'rejected',
                'approved_by': user['id'],
                'approved_at': datetime.now(timezone.utc).isoformat(),
                'rejected_reason': data.alasan
            }}
        )
        return {"message": "Pengajuan cuti ditolak"}
    
    raise HTTPException(status_code=400, detail="Action tidak valid")

@api_router.delete("/leave/{request_id}")
async def cancel_leave_request(
    request_id: str,
    user: dict = Depends(get_current_user)
):
    """Cancel a pending leave request"""
    leave_req = await db.leave_requests.find_one({'id': request_id}, {'_id': 0})
    if not leave_req:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    
    # Only owner or HR can cancel
    if leave_req['employee_id'] != user.get('employee_id') and user['role'] not in ['super_admin', 'hr']:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    if leave_req['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Hanya pengajuan pending yang dapat dibatalkan")
    
    await db.leave_requests.delete_one({'id': request_id})
    return {"message": "Pengajuan cuti dibatalkan"}

# ===================== OVERTIME ROUTES =====================

@api_router.post("/overtime/request", response_model=OvertimeResponse)
async def create_overtime_request(
    data: OvertimeRequestCreate,
    user: dict = Depends(get_current_user)
):
    """Create overtime request"""
    if not user.get('employee_id'):
        raise HTTPException(status_code=400, detail="Akun tidak terhubung dengan data karyawan")
    
    employee_id = user['employee_id']
    employee = await db.employees.find_one({'id': employee_id}, {'_id': 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Data karyawan tidak ditemukan")
    
    # Calculate total hours
    start = datetime.strptime(data.jam_mulai, '%H:%M')
    end = datetime.strptime(data.jam_selesai, '%H:%M')
    if end < start:
        end += timedelta(days=1)
    total_jam = (end - start).total_seconds() / 3600
    
    if total_jam <= 0:
        raise HTTPException(status_code=400, detail="Jam tidak valid")
    
    request_id = str(uuid.uuid4())
    overtime_doc = {
        'id': request_id,
        'employee_id': employee_id,
        'tanggal': data.tanggal,
        'jam_mulai': data.jam_mulai,
        'jam_selesai': data.jam_selesai,
        'total_jam': round(total_jam, 2),
        'alasan': data.alasan,
        'status': 'pending',
        'approved_by': None,
        'approved_at': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.overtime_requests.insert_one(overtime_doc)
    
    return OvertimeResponse(
        id=request_id,
        employee_id=employee_id,
        employee_nama=employee['nama_lengkap'],
        tanggal=data.tanggal,
        jam_mulai=data.jam_mulai,
        jam_selesai=data.jam_selesai,
        total_jam=round(total_jam, 2),
        alasan=data.alasan,
        status='pending',
        approved_by=None,
        approved_by_nama=None,
        approved_at=None,
        created_at=overtime_doc['created_at']
    )

@api_router.get("/overtime/requests", response_model=List[OvertimeResponse])
async def get_overtime_requests(
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get overtime requests"""
    query = {}
    
    if user['role'] not in ['super_admin', 'hr', 'manager']:
        employee_id = user.get('employee_id')
    
    if employee_id:
        query['employee_id'] = employee_id
    
    if status:
        query['status'] = status
    
    requests = await db.overtime_requests.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    
    result = []
    for req in requests:
        employee = await db.employees.find_one({'id': req['employee_id']}, {'_id': 0})
        approver = None
        if req.get('approved_by'):
            approver = await db.users.find_one({'id': req['approved_by']}, {'_id': 0})
        
        result.append(OvertimeResponse(
            id=req['id'],
            employee_id=req['employee_id'],
            employee_nama=employee['nama_lengkap'] if employee else None,
            tanggal=req['tanggal'],
            jam_mulai=req['jam_mulai'],
            jam_selesai=req['jam_selesai'],
            total_jam=req['total_jam'],
            alasan=req['alasan'],
            status=req['status'],
            approved_by=req.get('approved_by'),
            approved_by_nama=approver['nama_lengkap'] if approver else None,
            approved_at=req.get('approved_at'),
            created_at=req['created_at']
        ))
    
    return result

@api_router.post("/overtime/{request_id}/approve")
async def approve_overtime_request(
    request_id: str,
    data: LeaveApprovalAction,
    user: dict = Depends(get_current_user)
):
    """Approve or reject overtime request"""
    if user['role'] not in ['super_admin', 'hr', 'manager']:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    overtime_req = await db.overtime_requests.find_one({'id': request_id}, {'_id': 0})
    if not overtime_req:
        raise HTTPException(status_code=404, detail="Pengajuan tidak ditemukan")
    
    if overtime_req['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Pengajuan sudah diproses")
    
    if data.action == 'approve':
        await db.overtime_requests.update_one(
            {'id': request_id},
            {'$set': {
                'status': 'approved',
                'approved_by': user['id'],
                'approved_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Pengajuan lembur disetujui"}
    
    elif data.action == 'reject':
        await db.overtime_requests.update_one(
            {'id': request_id},
            {'$set': {
                'status': 'rejected',
                'approved_by': user['id'],
                'approved_at': datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Pengajuan lembur ditolak"}
    
    raise HTTPException(status_code=400, detail="Action tidak valid")

# ===================== SHIFT MANAGEMENT ROUTES =====================

@api_router.post("/shifts", response_model=ShiftResponse)
async def create_shift(
    data: ShiftCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    """Create a new shift"""
    shift_id = str(uuid.uuid4())
    shift_doc = {
        'id': shift_id,
        'nama': data.nama,
        'jam_masuk': data.jam_masuk,
        'jam_keluar': data.jam_keluar,
        'warna': data.warna,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.shifts.insert_one(shift_doc)
    
    return ShiftResponse(
        id=shift_id,
        nama=data.nama,
        jam_masuk=data.jam_masuk,
        jam_keluar=data.jam_keluar,
        warna=data.warna,
        created_at=shift_doc['created_at']
    )

@api_router.get("/shifts", response_model=List[ShiftResponse])
async def get_shifts(user: dict = Depends(get_current_user)):
    """Get all shifts"""
    shifts = await db.shifts.find({}, {'_id': 0}).to_list(100)
    return [ShiftResponse(**s) for s in shifts]

@api_router.put("/shifts/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: str,
    data: ShiftCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    """Update a shift"""
    shift = await db.shifts.find_one({'id': shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift tidak ditemukan")
    
    await db.shifts.update_one(
        {'id': shift_id},
        {'$set': {
            'nama': data.nama,
            'jam_masuk': data.jam_masuk,
            'jam_keluar': data.jam_keluar,
            'warna': data.warna
        }}
    )
    
    updated = await db.shifts.find_one({'id': shift_id}, {'_id': 0})
    return ShiftResponse(**updated)

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: str,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    """Delete a shift"""
    shift = await db.shifts.find_one({'id': shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift tidak ditemukan")
    
    # Check if shift is assigned
    assigned = await db.shift_assignments.count_documents({'shift_id': shift_id})
    if assigned > 0:
        raise HTTPException(status_code=400, detail="Shift masih digunakan")
    
    await db.shifts.delete_one({'id': shift_id})
    return {"message": "Shift berhasil dihapus"}

@api_router.post("/shifts/assign", response_model=ShiftAssignmentResponse)
async def assign_shift(
    data: ShiftAssignmentCreate,
    user: dict = Depends(require_role(['super_admin', 'hr']))
):
    """Assign shift to employee"""
    employee = await db.employees.find_one({'id': data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Karyawan tidak ditemukan")
    
    shift = await db.shifts.find_one({'id': data.shift_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift tidak ditemukan")
    
    # Remove existing assignment
    await db.shift_assignments.delete_many({'employee_id': data.employee_id})
    
    assignment_id = str(uuid.uuid4())
    assignment_doc = {
        'id': assignment_id,
        'employee_id': data.employee_id,
        'shift_id': data.shift_id,
        'tanggal_mulai': data.tanggal_mulai,
        'tanggal_selesai': data.tanggal_selesai
    }
    
    await db.shift_assignments.insert_one(assignment_doc)
    
    return ShiftAssignmentResponse(
        id=assignment_id,
        employee_id=data.employee_id,
        employee_nama=employee['nama_lengkap'],
        shift_id=data.shift_id,
        shift_nama=shift['nama'],
        shift_jam=f"{shift['jam_masuk']} - {shift['jam_keluar']}",
        tanggal_mulai=data.tanggal_mulai,
        tanggal_selesai=data.tanggal_selesai
    )

@api_router.get("/shifts/assignments", response_model=List[ShiftAssignmentResponse])
async def get_shift_assignments(
    department_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Get shift assignments"""
    assignments = await db.shift_assignments.find({}, {'_id': 0}).to_list(1000)
    
    result = []
    for a in assignments:
        employee = await db.employees.find_one({'id': a['employee_id']}, {'_id': 0})
        if department_id and employee and employee.get('department_id') != department_id:
            continue
        
        shift = await db.shifts.find_one({'id': a['shift_id']}, {'_id': 0})
        
        result.append(ShiftAssignmentResponse(
            id=a['id'],
            employee_id=a['employee_id'],
            employee_nama=employee['nama_lengkap'] if employee else None,
            shift_id=a['shift_id'],
            shift_nama=shift['nama'] if shift else None,
            shift_jam=f"{shift['jam_masuk']} - {shift['jam_keluar']}" if shift else None,
            tanggal_mulai=a['tanggal_mulai'],
            tanggal_selesai=a.get('tanggal_selesai')
        ))
    
    return result

@api_router.get("/calendar/events")
async def get_calendar_events(
    start_date: str,
    end_date: str,
    user: dict = Depends(get_current_user)
):
    """Get calendar events (leaves, shifts) for date range"""
    events = []
    
    # Get approved leaves
    leaves = await db.leave_requests.find({
        'status': 'approved',
        '$or': [
            {'tanggal_mulai': {'$gte': start_date, '$lte': end_date}},
            {'tanggal_selesai': {'$gte': start_date, '$lte': end_date}}
        ]
    }, {'_id': 0}).to_list(100)
    
    for leave in leaves:
        employee = await db.employees.find_one({'id': leave['employee_id']}, {'_id': 0})
        config = LEAVE_TYPES.get(leave['tipe_cuti'], {})
        events.append({
            'type': 'leave',
            'id': leave['id'],
            'title': f"{employee['nama_lengkap'] if employee else 'Unknown'} - {config.get('nama', leave['tipe_cuti'])}",
            'start': leave['tanggal_mulai'],
            'end': leave['tanggal_selesai'],
            'color': '#F59E0B'  # Amber for leave
        })
    
    # Get approved overtimes
    overtimes = await db.overtime_requests.find({
        'status': 'approved',
        'tanggal': {'$gte': start_date, '$lte': end_date}
    }, {'_id': 0}).to_list(100)
    
    for ot in overtimes:
        employee = await db.employees.find_one({'id': ot['employee_id']}, {'_id': 0})
        events.append({
            'type': 'overtime',
            'id': ot['id'],
            'title': f"{employee['nama_lengkap'] if employee else 'Unknown'} - Lembur {ot['total_jam']}jam",
            'start': ot['tanggal'],
            'end': ot['tanggal'],
            'color': '#8B5CF6'  # Purple for overtime
        })
    
    return events

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
