# 🌿 RubberLink — Sri Lankan Natural Rubber Supply Chain & AI Quality Grading Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-MobileNetV2-EE4C2C.svg)](https://pytorch.org/)
[![MariaDB](https://img.shields.io/badge/MariaDB-10.11-003545.svg)](https://mariadb.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC.svg)](https://tailwindcss.com/)

> **RubberLink** is an end-to-end commercial supply chain traceability and automated quality assessment platform tailored for the Sri Lankan natural rubber industry. It connects rubber tappers, estate owners, and factories into a unified, transparent workflow powered by Computer Vision.

---

## 📌 Problem & Motivation

The Sri Lankan natural rubber industry faces several systemic challenges:
1. **Subjective Grading Disputes:** Manual inspection often leads to grading disagreements between smallholders and factory managers, leaving tappers vulnerable to arbitrary price cuts.
2. **Delayed Revenue Calculations:** Complex percentage-based sharing (e.g., 60% Tapper / 40% Estate Owner) requires manual paper records and slow reconciliation.
3. **Lack of Digital Traceability:** From tree harvest to vulcanized sheet purchase, rubber batches lack verified provenance, weighing receipts, and immutable audit trails.
4. **Digital Divide:** Field workers speak Sinhala and Tamil, whereas enterprise software is almost exclusively in English.

**RubberLink** bridges this gap by introducing transparent AI-assisted grading, automated revenue splits, multi-language accessibility, and complete lifecycle audit trails.

---

## 🏛️ System Architecture

```
                                 ┌─────────────────────────────────────────┐
                                 │       React + Vite Frontend (UI)        │
                                 │   Port 3000 · TailwindCSS · Multi-Lang  │
                                 └────────────────────┬────────────────────┘
                                                      │ HTTP / REST
                                                      ▼
                                 ┌─────────────────────────────────────────┐
                                 │       Node.js + Express Backend         │
                                 │      Port 5000 · Prisma ORM · JWT       │
                                 └──────────┬──────────────────┬───────────┘
                                            │                  │
                         SQL Queries (3306) │                  │ Multipart Image (8000)
                                            ▼                  ▼
                    ┌───────────────────────────────┐  ┌───────────────────────────────────┐
                    │       MariaDB Database        │  │     FastAPI ML Microservice       │
                    │  Port 3306 · rubber_mis schema│  │ Port 8000 · MobileNetV2 (97.78%)  │
                    └───────────────────────────────┘  └───────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. 👥 Multi-Tier Role-Based Workspaces
* **System Admin:** Manage master entities, create factories, estates, users, and audit platform security logs.
* **Rubber Tapper:** Submit daily harvests (sheet count, weight KG, expected grade, photo, and field notes).
* **Estate Owner:** Review submissions with an interactive popup modal, verify weights, assess grades, and approve/reject with recorded reasons.
* **Factory Manager:** Set daily buying prices (Q1/Q2/Q3), run AI quality predictions, conduct physical checklist inspections, and finalize payments.

### 2. 🧠 AI-Powered Computer Vision Grading
* Powered by **MobileNetV2 (Transfer Learning)** trained on rubber sheet visual datasets.
* Classifies sheets into **Q1 (Premium)**, **Q2 (Medium)**, and **Q3 (Low)** with **97.78% test accuracy**.
* **Responsible AI (Human-in-the-Loop):** AI offers an objective suggestion; the factory manager retains accountability and must record mandatory notes if overriding the AI's grade.
* **Explainable Transparency:** Provides class probabilities, confidence scores, and an inspection trace.

### 3. 💵 Automated Revenue-Sharing & Payments
* Configurable contract splits between tappers and estate owners (e.g., 60% / 40%).
* Real-time calculation based on confirmed weight and daily market prices:
  $$\text{Total Payment} = \text{Final Weight (KG)} \times \text{Daily Price (LKR)}$$
* Immediate balance allocation to tapper and estate owner accounts with timestamped receipts.

### 4. 🌐 Native Multi-Language Support (i18n)
* Built-in client-side language switcher supporting **English**, **Sinhala (සිංහල)**, and **Tamil (தமிழ்)**.
* Stored in browser `localStorage` for seamless persistence across sessions.

### 5. 🛡️ Audit Logs & Integrity
* Immutable audit records tracking every key event: batch submissions, owner approvals, ML requests, overrides, price modifications, and payments.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Lucide Icons | Responsive single-page application & dashboards |
| **State & i18n** | React Context API, LocalStorage | Language localization & user session management |
| **Backend API** | Node.js, Express.js, Multer | RESTful API, business logic, file storage |
| **Database ORM** | MariaDB 10.11, Prisma ORM | Relational data persistence & transactional integrity |
| **AI / ML Service** | Python, FastAPI, MobileNetV2, PyTorch | Microservice for image classification & defect scoring |

---

## ⚡ Quick Start Guide (Windows)

### Option A: 1-Click Launcher (Recommended)
Simply double-click the included launcher script:
```cmd
start-rubberlink.bat
```
This automatically launches all 4 services in the background and opens `http://localhost:3000` in your default browser. To stop all services at once, double-click `stop-rubberlink.bat`.

---

### Option B: Manual Terminal Execution (VS Code)

#### 1. Start MariaDB Database (Port 3306)
```powershell
& "C:\Users\Santhush Premaweera\.cache\mariadb\mariadb-10.11.8-winx64\bin\mysqld.exe" --datadir="C:\Users\Santhush Premaweera\.cache\mariadb\data" --port=3306 --console
```

#### 2. Start ML Microservice (Port 8000)
```powershell
cd ml-service
& "C:\Users\Santhush Premaweera\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m uvicorn main:app --port 8000 --host 0.0.0.0
```

#### 3. Start Backend Server (Port 5000)
```powershell
cd backend
node server.js
```

#### 4. Start Frontend Client (Port 3000)
```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 3000
```

---

## 🔑 Default Demo Accounts

| Role | Email | Password | Access Level |
|---|---|---|---|
| **System Admin** | `admin@rubbermis.com` | `Admin123` | Full administrative control & audit logs |
| **Rubber Tapper** | `tapper@rubbermis.com` | `Tapper123` | Production submission & earnings tracking |
| **Estate Owner** | `owner@rubbermis.com` | `Owner123` | Batch approvals & revenue reconciliation |
| **Factory Manager** | `factory@rubbermis.com` | `Factory123` | Daily price setting, AI grading & payments |

---

## 📄 License
Academic & Commercial Demonstration Project — All Rights Reserved.
