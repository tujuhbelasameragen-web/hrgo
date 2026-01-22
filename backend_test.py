import requests
import sys
from datetime import datetime
import json

class HaergoAPITester:
    def __init__(self, base_url="https://simple-hr-start.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.hr_user = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Initialize seed data"""
        print("\n🌱 Initializing seed data...")
        success, response = self.run_test(
            "Seed Data",
            "POST",
            "seed",
            200
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@haergo.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.admin_user = response['user']
            print(f"   Logged in as: {self.admin_user['nama_lengkap']} ({self.admin_user['role']})")
            return True
        return False

    def test_hr_login(self):
        """Test HR login"""
        success, response = self.run_test(
            "HR Login",
            "POST",
            "auth/login",
            200,
            data={"email": "hr@haergo.com", "password": "hr123"}
        )
        if success and 'access_token' in response:
            self.hr_user = response['user']
            print(f"   HR User: {self.hr_user['nama_lengkap']} ({self.hr_user['role']})")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            stats = response
            print(f"   Total Karyawan: {stats.get('total_karyawan', 0)}")
            print(f"   Total Departemen: {stats.get('total_departemen', 0)}")
            print(f"   Total Posisi: {stats.get('total_posisi', 0)}")
            
            # Verify expected counts
            expected_employees = 10
            expected_departments = 5
            expected_positions = 11
            
            if (stats.get('total_karyawan') == expected_employees and 
                stats.get('total_departemen') == expected_departments and 
                stats.get('total_posisi') == expected_positions):
                print("   ✅ Statistics match expected values")
                return True
            else:
                print(f"   ⚠️  Statistics don't match expected values")
                print(f"      Expected: {expected_employees} employees, {expected_departments} departments, {expected_positions} positions")
                return False
        return False

    def test_departments(self):
        """Test departments endpoints"""
        success, response = self.run_test(
            "Get Departments",
            "GET",
            "departments",
            200
        )
        if success:
            departments = response
            print(f"   Found {len(departments)} departments")
            expected_depts = ['IT', 'HR', 'FIN', 'MKT', 'OPS']
            found_codes = [d['kode'] for d in departments]
            
            if all(code in found_codes for code in expected_depts):
                print("   ✅ All expected departments found")
                return True
            else:
                print(f"   ⚠️  Missing departments. Found: {found_codes}")
                return False
        return False

    def test_positions(self):
        """Test positions endpoints"""
        success, response = self.run_test(
            "Get Positions",
            "GET",
            "positions",
            200
        )
        if success:
            positions = response
            print(f"   Found {len(positions)} positions")
            if len(positions) >= 10:  # Should have at least 10 positions
                print("   ✅ Sufficient positions found")
                return True
            else:
                print(f"   ⚠️  Expected at least 10 positions, found {len(positions)}")
                return False
        return False

    def test_employees(self):
        """Test employees endpoints"""
        success, response = self.run_test(
            "Get Employees",
            "GET",
            "employees",
            200
        )
        if success:
            employees = response
            print(f"   Found {len(employees)} employees")
            if len(employees) >= 10:  # Should have 10 employees
                print("   ✅ Expected number of employees found")
                
                # Test search functionality
                search_success, search_response = self.run_test(
                    "Search Employees",
                    "GET",
                    "employees?search=Budi",
                    200
                )
                if search_success and len(search_response) > 0:
                    print("   ✅ Employee search working")
                    return True
                else:
                    print("   ⚠️  Employee search not working")
                    return False
            else:
                print(f"   ⚠️  Expected 10 employees, found {len(employees)}")
                return False
        return False

    def test_employee_detail(self):
        """Test employee detail endpoint"""
        # First get employees list
        success, employees = self.run_test(
            "Get Employees for Detail Test",
            "GET",
            "employees",
            200
        )
        
        if success and len(employees) > 0:
            employee_id = employees[0]['id']
            success, response = self.run_test(
                "Get Employee Detail",
                "GET",
                f"employees/{employee_id}",
                200
            )
            if success:
                employee = response
                print(f"   Employee: {employee.get('nama_lengkap')} - {employee.get('nik')}")
                print(f"   Department: {employee.get('department_nama')}")
                print(f"   Position: {employee.get('position_nama')}")
                return True
        return False

    def test_users_management(self):
        """Test user management endpoints (super_admin only)"""
        success, response = self.run_test(
            "Get Users",
            "GET",
            "users",
            200
        )
        if success:
            users = response
            print(f"   Found {len(users)} users")
            if len(users) >= 2:  # Should have admin and hr users
                print("   ✅ Users found")
                return True
            else:
                print(f"   ⚠️  Expected at least 2 users, found {len(users)}")
                return False
        return False

    def test_auth_me(self):
        """Test current user info"""
        success, response = self.run_test(
            "Get Current User Info",
            "GET",
            "auth/me",
            200
        )
        if success:
            user = response
            print(f"   Current user: {user.get('nama_lengkap')} ({user.get('role')})")
            return True
        return False

    def test_attendance_settings(self):
        """Test attendance settings endpoint"""
        success, response = self.run_test(
            "Attendance Settings",
            "GET",
            "attendance/settings",
            200
        )
        if success:
            settings = response
            print(f"   Office locations: {len(settings.get('office_locations', []))}")
            print(f"   Work hours: {settings.get('work_hours', {}).get('start')} - {settings.get('work_hours', {}).get('end')}")
            
            # Verify expected office location
            office_locations = settings.get('office_locations', [])
            if len(office_locations) > 0:
                main_office = office_locations[0]
                expected_lat = -6.161777101062483
                expected_lon = 106.87519933469652
                
                if (abs(main_office.get('latitude', 0) - expected_lat) < 0.001 and 
                    abs(main_office.get('longitude', 0) - expected_lon) < 0.001):
                    print("   ✅ Office location coordinates correct")
                    return True
                else:
                    print(f"   ⚠️  Office coordinates mismatch")
                    return False
            else:
                print("   ⚠️  No office locations found")
                return False
        return False

    def test_attendance_today(self):
        """Test today's attendance endpoint"""
        success, response = self.run_test(
            "Today's Attendance",
            "GET",
            "attendance/today",
            200
        )
        if success:
            # Response can be null if no attendance today
            print(f"   Today's attendance: {response if response else 'No attendance today'}")
            return True
        return False

    def test_attendance_history(self):
        """Test attendance history endpoint"""
        success, response = self.run_test(
            "Attendance History",
            "GET",
            "attendance/history",
            200
        )
        if success:
            history = response
            print(f"   Found {len(history)} attendance records")
            return True
        return False

    def test_attendance_stats(self):
        """Test attendance statistics endpoint"""
        success, response = self.run_test(
            "Attendance Stats",
            "GET",
            "attendance/stats",
            200
        )
        if success:
            stats = response
            print(f"   Total hari kerja: {stats.get('total_hari_kerja', 0)}")
            print(f"   Total hadir: {stats.get('total_hadir', 0)}")
            print(f"   Total terlambat: {stats.get('total_terlambat', 0)}")
            print(f"   Persentase kehadiran: {stats.get('persentase_kehadiran', 0)}%")
            return True
        return False

    def test_face_check(self):
        """Test face registration check endpoint"""
        success, response = self.run_test(
            "Face Registration Check",
            "GET",
            "face/check",
            200
        )
        if success:
            registered = response.get('registered', False)
            print(f"   Face registered: {registered}")
            return True
        return False

    def test_face_register(self):
        """Test face registration endpoint"""
        # Create a dummy 128-dimensional face descriptor
        dummy_descriptor = [0.1] * 128
        
        success, response = self.run_test(
            "Face Registration",
            "POST",
            "face/register",
            200,
            data={"face_descriptor": dummy_descriptor}
        )
        if success:
            message = response.get('message', '')
            print(f"   Registration result: {message}")
            return True
        return False

    def test_attendance_clock_in(self):
        """Test attendance clock in endpoint"""
        # Test data for clock in
        clock_data = {
            "tipe": "clock_in",
            "mode": "wfh",  # Use WFH to avoid location validation
            "latitude": -6.161777,
            "longitude": 106.875199,
            "foto_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            "catatan": "Test clock in",
            "alamat_client": None
        }
        
        success, response = self.run_test(
            "Attendance Clock In",
            "POST",
            "attendance/clock",
            200,
            data=clock_data
        )
        if success:
            attendance = response
            print(f"   Clock in time: {attendance.get('clock_in', 'N/A')}")
            print(f"   Status: {attendance.get('status', 'N/A')}")
            return True
        return False

def main():
    print("🚀 Starting Haergo HR System API Tests")
    print("=" * 50)
    
    tester = HaergoAPITester()
    
    # Test sequence
    tests = [
        ("Seed Data", tester.test_seed_data),
        ("Admin Login", tester.test_admin_login),
        ("HR Login", tester.test_hr_login),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Departments", tester.test_departments),
        ("Positions", tester.test_positions),
        ("Employees", tester.test_employees),
        ("Employee Detail", tester.test_employee_detail),
        ("Users Management", tester.test_users_management),
        ("Auth Me", tester.test_auth_me),
    ]
    
    passed_tests = []
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed_tests.append(test_name)
            else:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if passed_tests:
        print(f"\n✅ PASSED TESTS ({len(passed_tests)}):")
        for test in passed_tests:
            print(f"   • {test}")
    
    if failed_tests:
        print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   • {test}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())