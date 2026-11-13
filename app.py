"""
Developer: Shubham
File: app.py
Purpose: Flask backend for Employee Management System
Last updated: May 2026
TODO: Add user authentication, API docs, and more tests
"""
# ── DB helpers ─────────────────────────────────────────────────────────────────

# NOTE: All SQL queries are written and tested by Shubham (DBMS Lab, 2026)
# ── Bootstrap schema + seed ────────────────────────────────────────────────────

# If you want to reset the DB, delete instance/company.db and restart the app.
# ── Page ───────────────────────────────────────────────────────────────────────

# Main page route. Renders the custom index.html template.
# ── Departments API ────────────────────────────────────────────────────────────

# All department-related endpoints below are written by Shubham.
# ── Employees API ──────────────────────────────────────────────────────────────

# All employee-related endpoints below are written by Shubham.
# ── Projects API ───────────────────────────────────────────────────────────────

# All project-related endpoints below are written by Shubham.
# ── Dependents API ─────────────────────────────────────────────────────────────

# All dependents-related endpoints below are written by Shubham.

import sqlite3
import uuid
from datetime import date
from flask import Flask, render_template, request, jsonify, g, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'change-this-secret-key'   # needed for login sessions
DATABASE = 'instance/company.db'


# ── DB helpers ─────────────────────────────────────────────────────────────────

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
    return db


@app.teardown_appcontext
def close_db(exc):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def query(sql, args=(), one=False):
    cur = get_db().execute(sql, args)
    rv = cur.fetchall()
    return (rv[0] if rv else None) if one else rv


def mutate(sql, args=()):
    db = get_db()
    db.execute(sql, args)
    db.commit()


def row2dict(row):
    return dict(row) if row else None


# ── Bootstrap schema + seed ────────────────────────────────────────────────────

def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS departments (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            budget      REAL NOT NULL DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS employees (
            id              TEXT PRIMARY KEY,
            first_name      TEXT NOT NULL,
            last_name       TEXT NOT NULL,
            email           TEXT UNIQUE NOT NULL,
            phone           TEXT NOT NULL DEFAULT '',
            salary          REAL NOT NULL DEFAULT 0,
            department_id   TEXT REFERENCES departments(id) ON DELETE SET NULL,
            created_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS projects (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            budget          REAL NOT NULL DEFAULT 0,
            status          TEXT NOT NULL DEFAULT 'active',
            department_id   TEXT REFERENCES departments(id) ON DELETE SET NULL,
            start_date      TEXT NOT NULL,
            end_date        TEXT,
            created_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS dependents (
            id              TEXT PRIMARY KEY,
            employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            name            TEXT NOT NULL,
            relationship    TEXT NOT NULL,
            date_of_birth   TEXT NOT NULL,
            created_at      TEXT DEFAULT (datetime('now'))
        );

        -- login accounts: role is 'admin' or 'employee'
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            username        TEXT UNIQUE NOT NULL,
            password_hash   TEXT NOT NULL,
            role            TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
            employee_id     TEXT REFERENCES employees(id) ON DELETE SET NULL
        );
    """)

    # seed only when tables are empty
    count = db.execute("SELECT COUNT(*) FROM departments").fetchone()[0]
    if count == 0:
        d = {
            'finance': str(uuid.uuid4()),
            'it':      str(uuid.uuid4()),
            'eng':     str(uuid.uuid4()),
            'hr':      str(uuid.uuid4()),
            'mkt':     str(uuid.uuid4()),
            'ops':     str(uuid.uuid4()),
        }
        db.executemany(
            "INSERT INTO departments (id,name,budget) VALUES (?,?,?)",
            [
                (d['finance'], 'Finance',                1200000),
                (d['it'],      'Information Technology', 1500000),
                (d['eng'],     'Engineering',            1800000),
                (d['hr'],      'Human Resources',         900000),
                (d['mkt'],     'Marketing',               750000),
                (d['ops'],     'Operations',             1100000),
            ]
        )

        e = {k: str(uuid.uuid4()) for k in
             ['e1','e2','e3','e4','e5']}
        db.executemany(
            "INSERT INTO employees (id,first_name,last_name,email,phone,salary,department_id) VALUES (?,?,?,?,?,?,?)",
            [
                (e['e1'],'Yahia',  'Hesham',  'Yahia@email.com',  '9875525252', 92000, d['finance']),
                (e['e2'],'Mostafa',  'Mohamed',  'Mostafa@email.com',  '7654321098', 68000, d['mkt']),
                (e['e3'],'Youssef',  'Mamdouh',  'Youssef@email.com',  '6543210987', 55000, d['mkt']),
                (e['e4'],'Alyaa',  'Adel', 'Alyaa@email.com',  '8087468976', 80250, d['eng']),
                (e['e5'],'Habiba',  'ElMallah', 'Habiba@email.com',  '8087455224', 75000, d['it']),
            ]
        )

        today = date.today().isoformat()
        db.executemany(
            "INSERT INTO projects (id,name,budget,status,department_id,start_date,end_date) VALUES (?,?,?,?,?,?,?)",
            [
                (str(uuid.uuid4()), 'Employee Portal Dev',       320000, 'active',    d['it'],      '2024-01-15', None),
                (str(uuid.uuid4()), 'Employee Portal Ops',       180000, 'active',    d['ops'],     '2024-02-01', None),
                (str(uuid.uuid4()), 'Financial Analytics',       450000, 'active',    d['finance'], '2024-01-10', None),
                (str(uuid.uuid4()), 'Financial Systems Upgrade', 620000, 'completed', d['finance'], '2023-06-01', '2024-03-31'),
                (str(uuid.uuid4()), 'CRM Redesign',              290000, 'active',    d['mkt'],     '2024-03-01', None),
                (str(uuid.uuid4()), 'Digital Marketing Campaign',175000, 'active',    d['mkt'],     '2024-02-15', None),
                (str(uuid.uuid4()), 'Infrastructure Overhaul',   780000, 'on_hold',   d['eng'],     '2024-01-20', None),
                (str(uuid.uuid4()), 'HR Onboarding System',      210000, 'active',    d['hr'],      '2024-04-01', None),
                (str(uuid.uuid4()), 'Supply Chain Optimization', 540000, 'active',    d['ops'],     '2024-03-15', None),
            ]
        )

        db.executemany(
            "INSERT INTO dependents (id,employee_id,name,relationship,date_of_birth) VALUES (?,?,?,?,?)",
            [
                (str(uuid.uuid4()), e['e1'], 'Meena Patel',   'Spouse', '1990-05-12'),
                (str(uuid.uuid4()), e['e1'], 'Aryan Patel',   'Child',  '2015-08-22'),
                (str(uuid.uuid4()), e['e2'], 'Sunita Mehta',  'Spouse', '1993-11-30'),
                (str(uuid.uuid4()), e['e4'], 'Ramesh Sharma', 'Parent', '1960-03-15'),
                (str(uuid.uuid4()), e['e5'], 'Pooja Sharma',  'Spouse', '1995-07-08'),
                (str(uuid.uuid4()), e['e3'], 'Lakshmi Nair',  'Spouse', '1988-01-25'),
                (str(uuid.uuid4()), e['e4'], 'Kiran Nair',    'Child',  '2018-09-14'),
                (str(uuid.uuid4()), e['e5'], 'Sita Kumar',    'Parent', '1958-12-01'),
            ]
        )

        # one employee login per seeded employee (username / password)
        db.executemany(
            "INSERT INTO users (username,password_hash,role,employee_id) VALUES (?,?,?,?)",
            [
                ('yahia',   generate_password_hash('yahia123'),   'employee', e['e1']),
                ('mostafa', generate_password_hash('mostafa123'), 'employee', e['e2']),
                ('youssef', generate_password_hash('youssef123'), 'employee', e['e3']),
                ('alyaa',   generate_password_hash('alyaa123'),   'employee', e['e4']),
                ('habiba',  generate_password_hash('habiba123'),  'employee', e['e5']),
            ]
        )

    # always make sure an admin account exists
    if db.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0] == 0:
        db.execute("INSERT INTO users (username,password_hash,role) VALUES (?,?,?)",
                   ('admin', generate_password_hash('admin123'), 'admin'))
    db.commit()
    db.close()


# ── Access control (runs before every request) ─────────────────────────────────

@app.before_request
def check_access():
    # login page and css/js files are open to everyone
    if request.endpoint in ('login', 'static'):
        return None

    # 1) must be logged in
    if 'user_id' not in session:
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Please log in first'}), 401
        return redirect(url_for('login'))

    # 2) only admins may add / edit / delete (POST, PUT, DELETE)
    if request.path.startswith('/api/') and request.method != 'GET' \
            and session.get('role') != 'admin':
        return jsonify({'error': 'Admins only: employees have read-only access'}), 403
    return None


# ── Login / logout ─────────────────────────────────────────────────────────────

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        user = query("SELECT * FROM users WHERE username=?",
                     (request.form.get('username', '').strip().lower(),), one=True)
        if user and check_password_hash(user['password_hash'], request.form.get('password', '')):
            session.clear()
            session['user_id']  = user['id']
            session['username'] = user['username']
            session['role']     = user['role']
            return redirect(url_for('index'))
        error = 'Wrong username or password'
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/api/me', methods=['GET'])
def me():
    row = query("""
        SELECT u.username, u.role, e.first_name, e.last_name
        FROM users u LEFT JOIN employees e ON e.id = u.employee_id
        WHERE u.id = ?""", (session['user_id'],), one=True)
    name = f"{row['first_name']} {row['last_name']}" if row['first_name'] else row['username'].title()
    return jsonify({'username': row['username'], 'role': row['role'], 'name': name})


# ── Page ───────────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


# ── Departments API ────────────────────────────────────────────────────────────

@app.route('/api/departments', methods=['GET'])
def get_departments():
    rows = query("SELECT * FROM departments ORDER BY name")
    return jsonify([row2dict(r) for r in rows])


@app.route('/api/departments', methods=['POST'])
def add_department():
    d = request.json
    if not d.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    nid = str(uuid.uuid4())
    mutate("INSERT INTO departments (id,name,budget) VALUES (?,?,?)",
           (nid, d['name'], float(d.get('budget') or 0)))
    return jsonify({'id': nid}), 201


@app.route('/api/departments/<did>', methods=['PUT'])
def update_department(did):
    d = request.json
    mutate("UPDATE departments SET name=?, budget=? WHERE id=?",
           (d['name'], float(d.get('budget') or 0), did))
    return jsonify({'ok': True})


@app.route('/api/departments/<did>', methods=['DELETE'])
def delete_department(did):
    mutate("DELETE FROM departments WHERE id=?", (did,))
    return jsonify({'ok': True})


# ── Employees API ──────────────────────────────────────────────────────────────

@app.route('/api/employees', methods=['GET'])
def get_employees():
    rows = query("""
        SELECT e.*, d.name AS dept_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY e.created_at DESC
    """)
    result = []
    for r in rows:
        rec = row2dict(r)
        rec['department'] = {'id': rec['department_id'], 'name': rec['dept_name']} if rec['dept_name'] else None
        del rec['dept_name']
        result.append(rec)
    return jsonify(result)


@app.route('/api/employees', methods=['POST'])
def add_employee():
    d = request.json
    if not d.get('first_name') or not d.get('last_name') or not d.get('email'):
        return jsonify({'error': 'First name, last name and email are required'}), 400
    nid = str(uuid.uuid4())
    mutate("""INSERT INTO employees (id,first_name,last_name,email,phone,salary,department_id)
              VALUES (?,?,?,?,?,?,?)""",
           (nid, d['first_name'], d['last_name'], d['email'],
            d.get('phone',''), float(d.get('salary') or 0),
            d.get('department_id') or None))
    return jsonify({'id': nid}), 201


@app.route('/api/employees/<eid>', methods=['PUT'])
def update_employee(eid):
    d = request.json
    mutate("""UPDATE employees SET first_name=?,last_name=?,email=?,phone=?,
              salary=?,department_id=? WHERE id=?""",
           (d['first_name'], d['last_name'], d['email'],
            d.get('phone',''), float(d.get('salary') or 0),
            d.get('department_id') or None, eid))
    return jsonify({'ok': True})


@app.route('/api/employees/<eid>', methods=['DELETE'])
def delete_employee(eid):
    mutate("DELETE FROM employees WHERE id=?", (eid,))
    return jsonify({'ok': True})


# ── Projects API ───────────────────────────────────────────────────────────────

@app.route('/api/projects', methods=['GET'])
def get_projects():
    rows = query("""
        SELECT p.*, d.name AS dept_name
        FROM projects p
        LEFT JOIN departments d ON d.id = p.department_id
        ORDER BY p.created_at DESC
    """)
    result = []
    for r in rows:
        rec = row2dict(r)
        rec['department'] = {'id': rec['department_id'], 'name': rec['dept_name']} if rec['dept_name'] else None
        del rec['dept_name']
        result.append(rec)
    return jsonify(result)


@app.route('/api/projects', methods=['POST'])
def add_project():
    d = request.json
    nid = str(uuid.uuid4())
    mutate("""INSERT INTO projects (id,name,budget,status,department_id,start_date,end_date)
              VALUES (?,?,?,?,?,?,?)""",
           (nid, d['name'], float(d.get('budget') or 0), d.get('status','active'),
            d.get('department_id') or None,
            d.get('start_date') or date.today().isoformat(),
            d.get('end_date') or None))
    return jsonify({'id': nid}), 201


@app.route('/api/projects/<pid>', methods=['PUT'])
def update_project(pid):
    d = request.json
    mutate("""UPDATE projects SET name=?,budget=?,status=?,department_id=?,
              start_date=?,end_date=? WHERE id=?""",
           (d['name'], float(d.get('budget') or 0), d.get('status','active'),
            d.get('department_id') or None,
            d.get('start_date') or date.today().isoformat(),
            d.get('end_date') or None, pid))
    return jsonify({'ok': True})


@app.route('/api/projects/<pid>', methods=['DELETE'])
def delete_project(pid):
    mutate("DELETE FROM projects WHERE id=?", (pid,))
    return jsonify({'ok': True})


# ── Dependents API ─────────────────────────────────────────────────────────────

@app.route('/api/dependents', methods=['GET'])
def get_dependents():
    rows = query("""
        SELECT d.*, e.first_name||' '||e.last_name AS emp_name
        FROM dependents d
        LEFT JOIN employees e ON e.id = d.employee_id
        ORDER BY d.created_at DESC
    """)
    result = []
    for r in rows:
        rec = row2dict(r)
        rec['emp_name'] = rec.get('emp_name') or 'Unknown'
        result.append(rec)
    return jsonify(result)


@app.route('/api/dependents', methods=['POST'])
def add_dependent():
    d = request.json
    if not all([d.get('employee_id'), d.get('name'), d.get('relationship'), d.get('date_of_birth')]):
        return jsonify({'error': 'All fields required'}), 400
    nid = str(uuid.uuid4())
    mutate("INSERT INTO dependents (id,employee_id,name,relationship,date_of_birth) VALUES (?,?,?,?,?)",
           (nid, d['employee_id'], d['name'], d['relationship'], d['date_of_birth']))
    return jsonify({'id': nid}), 201


@app.route('/api/dependents/<did>', methods=['PUT'])
def update_dependent(did):
    d = request.json
    mutate("UPDATE dependents SET employee_id=?,name=?,relationship=?,date_of_birth=? WHERE id=?",
           (d['employee_id'], d['name'], d['relationship'], d['date_of_birth'], did))
    return jsonify({'ok': True})


@app.route('/api/dependents/<did>', methods=['DELETE'])
def delete_dependent(did):
    mutate("DELETE FROM dependents WHERE id=?", (did,))
    return jsonify({'ok': True})


if __name__ == '__main__':
    import os
    os.makedirs('instance', exist_ok=True)
    init_db()
    app.run(debug=True)
