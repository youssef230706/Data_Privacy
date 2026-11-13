# Employee Management System

A full-stack web application for managing employees, departments, projects, and dependents within an organisation. Built with a Python Flask REST API backend and a single-page frontend using vanilla HTML, CSS, and JavaScript.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Overview

This system provides a centralised interface for HR and administrative tasks. It supports full CRUD operations across four entities — Employees, Departments, Projects, and Dependents — with a live dashboard summarising key metrics via interactive charts.

The application runs entirely locally using SQLite and requires no external database setup. On first launch, the database is auto-created and seeded with sample data.

---

## Features

**Dashboard**
- KPI cards showing total employees, departments, projects, and dependents
- Donut chart: employee distribution by department
- Bar chart: project budgets by department
- Recent employees list

**Employees**
- Add, edit (double-click row), and delete employee records
- Fields: name, email, phone, salary, department
- Sortable by any column

**Departments**
- Create and manage departments with budget tracking
- Live employee count per department

**Projects**
- Track projects with status labels: Active, Completed, On Hold
- Fields: name, budget, department, start date, end date

**Dependents**
- Link dependents to employees
- Fields: name, relationship, date of birth

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Python 3.7+, Flask                |
| Frontend   | HTML5, CSS3, Vanilla JavaScript   |
| Database   | SQLite (via Python `sqlite3`)     |
| Charts     | HTML5 Canvas API                  |
| Architecture | Single-Page Application (SPA)  |

No external frontend frameworks or ORMs are used.

---

## Project Structure

```
employeeManagementSystem/
├── app.py                  # Flask app — all routes and database logic
├── instance/
│   └── company.db          # SQLite database (auto-created on first run)
├── templates/
│   └── index.html          # SPA shell
└── static/
    ├── css/
    │   └── style.css       # Dark-themed global styles
    └── js/
        └── app.js          # All frontend logic and API calls
```

---

## Database Schema

```
departments
  id (TEXT, PK), name, budget, created_at

employees
  id (TEXT, PK), first_name, last_name, email (UNIQUE),
  phone, salary, department_id (FK → departments), created_at

projects
  id (TEXT, PK), name, budget, status, department_id (FK → departments),
  start_date, end_date, created_at

dependents
  id (TEXT, PK), name, relationship, dob,
  employee_id (FK → employees), created_at
```

Foreign keys are enforced via `PRAGMA foreign_keys = ON`. IDs use UUID4.

---

## API Reference

All endpoints accept and return JSON.

### Departments

| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| GET    | `/api/departments`          | List all departments |
| POST   | `/api/departments`          | Create a department  |
| PUT    | `/api/departments/<id>`     | Update a department  |
| DELETE | `/api/departments/<id>`     | Delete a department  |

### Employees

| Method | Endpoint                  | Description        |
|--------|---------------------------|--------------------|
| GET    | `/api/employees`          | List all employees |
| POST   | `/api/employees`          | Add an employee    |
| PUT    | `/api/employees/<id>`     | Update an employee |
| DELETE | `/api/employees/<id>`     | Delete an employee |

### Projects

| Method | Endpoint                 | Description       |
|--------|--------------------------|-------------------|
| GET    | `/api/projects`          | List all projects |
| POST   | `/api/projects`          | Create a project  |
| PUT    | `/api/projects/<id>`     | Update a project  |
| DELETE | `/api/projects/<id>`     | Delete a project  |

### Dependents

| Method | Endpoint                   | Description          |
|--------|----------------------------|----------------------|
| GET    | `/api/dependents`          | List all dependents  |
| POST   | `/api/dependents`          | Add a dependent      |
| PUT    | `/api/dependents/<id>`     | Update a dependent   |
| DELETE | `/api/dependents/<id>`     | Delete a dependent   |

---

## Getting Started

### Prerequisites

- Python 3.7 or higher
- pip

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/ShubDeshmukh2006/employeeManagementSystem.git
cd employeeManagementSystem
```

**2. Create and activate a virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

**3. Install dependencies**
```bash
pip install flask
```

**4. Run the application**
```bash
python app.py
```

**5. Open in browser**
```
http://127.0.0.1:5000
```

The database (`instance/company.db`) is created automatically on first run, seeded with 6 departments, 9 employees, 9 projects, and 8 dependents.

To reset the database, stop the server, delete `instance/company.db`, and restart.

---

## Usage

Navigate using the sidebar:

- **Dashboard** — Overview of all key metrics and charts
- **Employees** — Manage employee records; double-click any row to edit inline
- **Departments** — Manage departments and their budgets
- **Projects** — Track project status and budgets
- **Dependents** — Manage employee dependents

---

## Known Limitations

- No user authentication or session management
- No role-based access control
- SQLite is not suitable for concurrent multi-user production use
- No input sanitisation beyond basic validation
- No unit or integration tests

---

## Roadmap

- [ ] User authentication with session management
- [ ] Role-based access (Admin, HR, Viewer)
- [ ] Export to CSV and PDF
- [ ] Full-text search and advanced filtering
- [ ] Leave and attendance tracking
- [ ] REST API documentation (Swagger / OpenAPI)
- [ ] Unit tests with pytest

---

## Author

**Shubham Deshmukh**

GitHub: [ShubDeshmukh2006](https://github.com/ShubDeshmukh2006)
