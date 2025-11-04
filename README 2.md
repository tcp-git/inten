# 🧠 Backend Development Plan – Eduvice Winter Fellowship 2025

**Project:** AI-assisted Property Search (PropTech)  
**Role:** Backend Developer (Node.js + MongoDB + AI Intent Search)  
**Duration:** 7 Weeks (September – December 2025)

---

## 🎯 Objective

พัฒนา Backend สำหรับระบบค้นหาอสังหาริมทรัพย์แบบ Smart Search  
โดยใช้ AI ช่วยทำความเข้าใจเจตนาผู้ใช้ (Intent-based Search)  
เชื่อมต่อกับฐานข้อมูล MongoDB และให้ Frontend ใช้งานผ่าน REST API

---

## 🧩 Tech Stack

| Category      | Technology                       |
| ------------- | -------------------------------- |
| Runtime       | Node.js (Express.js)             |
| Database      | MongoDB (Atlas)                  |
| ODM           | Mongoose                         |
| AI Engine     | FastAPI (Sentence-BERT)          |
| Search        | Text + Geo + Semantic Search     |
| Auth          | JWT                              |
| Validation    | Joi                              |
| Documentation | Swagger (OpenAPI 3)              |
| Deployment    | Railway / Render / MongoDB Atlas |
| Tools         | ESLint, Prettier, Nodemon        |

---

## 🗓️ Weekly Detailed Plan (7 Weeks)

### 🧭 Week 1 – Environment Setup & Project Initialization

**Goal:** เตรียมเครื่องมือและโครงสร้างพื้นฐานทั้งหมดของระบบ

**Tasks:**

- ติดตั้ง Node.js, npm, MongoDB Atlas
- สร้างโครงสร้างโปรเจกต์ `backend/`
- ติดตั้ง dependencies พื้นฐาน (`express`, `mongoose`, `dotenv`, `cors`)
- ตั้งค่าไฟล์ `.env` (PORT, MONGO_URI, JWT_SECRET)
- เขียน `app.js` เชื่อมต่อฐานข้อมูลและเริ่ม server
- ตั้งค่า ESLint + Prettier + Nodemon
- ทดสอบ API เริ่มต้น: `GET /api/health`

**Output:**

- Server รันได้ที่ `http://localhost:5000`
- โครงสร้างไฟล์พร้อมใช้งานสำหรับสัปดาห์ต่อไป

---

### 🏗️ Week 2 – Schema Design & CRUD APIs

**Goal:** ออกแบบฐานข้อมูลและสร้าง API CRUD สำหรับ Property

**Tasks:**

- ออกแบบ Schema `Property`:
  - title, description, price, type, area, rooms, location(lat/lng), features
- เพิ่ม Index สำหรับ GeoSearch (`2dsphere`)
- เขียน Controller/Service สำหรับ CRUD (Create, Read, Update, Delete)
- Validate input ด้วย Joi
- ทดสอบ API ด้วย Postman

**Output:**

- Endpoint ตัวอย่าง:
  - `POST /api/properties`
  - `GET /api/properties/:id`
  - `PUT /api/properties/:id`
  - `DELETE /api/properties/:id`

**Tools:**

- Express.js, Mongoose, Joi

---

### 🌍 Week 3 – Keyword & Geo Search

**Goal:** ให้ระบบค้นหาอสังหาริมทรัพย์ได้ด้วย keyword และพิกัดจริง

**Tasks:**

- เพิ่ม Text Index: `{ title: "text", description: "text" }`
- สร้าง API `/api/properties/search?q=บ้าน&lat=13.7&lng=100.6`
- ใช้ `$text` + `$geoNear` เพื่อค้นหาและกรองตามระยะทาง
- รองรับ Pagination (`limit`, `page`)
- เพิ่ม Swagger Documentation สำหรับ endpoint นี้

**Output:**

- API ที่สามารถค้นหา property ตาม keyword + location ได้จริง

---

### 🤖 Week 4 – AI Intent Engine (FastAPI + Sentence-BERT)

**Goal:** พัฒนา AI Engine สำหรับเข้าใจเจตนาของผู้ใช้

**Tasks:**

- สร้างโปรเจกต์ `ai_server/` ด้วย FastAPI
- ติดตั้ง dependencies:
  ```bash
  pip install fastapi uvicorn sentence-transformers
  ```
- พัฒนา API `/intent` รับข้อความ เช่น “บ้านใกล้โรงเรียน งบไม่เกิน 2 ล้าน”
- ใช้โมเดล `all-MiniLM-L6-v2` สร้าง Embedding
- คืนค่า response:
  ```json
  { "embedding": [...], "keywords": ["บ้าน", "โรงเรียน"], "intent": "ค้นหาบ้านราคาต่ำกว่า 2M ใกล้โรงเรียน" }
  ```
- ทดสอบ API ด้วย cURL / Postman

**Output:**

- AI Engine ทำงานแยกจาก backend หลักได้
- FastAPI รันที่ `http://localhost:8000`

---

### 🔗 Week 5 – Integration: Node.js ↔ FastAPI

**Goal:** เชื่อม backend กับ AI Engine ให้ทำงานร่วมกันได้

**Tasks:**

- เพิ่ม `aiSearch.service.js` เรียก API `/intent`
- ส่งข้อความค้นหาจากผู้ใช้ไปยัง FastAPI
- ประมวลผลผลลัพธ์ (embedding, cleaned query)
- ปรับ `property.controller.js` ให้ใช้ข้อมูลจาก AI ก่อนค้นหา MongoDB
- จัดการ Error / Timeout

**Output:**

- Endpoint `/api/properties/search` สามารถทำงานผ่าน AI Layer ได้แล้ว

---

### 🧮 Week 6 – Semantic Search + Ranking

**Goal:** จัดอันดับผลลัพธ์ด้วยความคล้ายเชิงความหมาย (Semantic Ranking)

**Tasks:**

- เก็บ Embedding ของแต่ละ Property ใน MongoDB
- ใช้ Cosine Similarity คำนวณคะแนนความคล้าย
- ปรับผลลัพธ์ของ `/search` ให้แสดงตาม Relevance Score
- เพิ่ม API `/api/properties/similar/:id`
- ทดสอบการค้นหาแบบ Intent เช่น “บ้านผู้สูงอายุใกล้สีลม”

**Output:**

- ระบบค้นหาที่ “เข้าใจความหมาย” ได้จริง
- Ranking ตาม Intent และ Semantic Match

**Tools:**

- Sentence-BERT, NumPy (ฝั่ง AI), Mongoose Query Aggregation

---

### 🚀 Week 7 – Optimization, Testing & Deployment

**Goal:** ทดสอบ, ปรับปรุง และ deploy ระบบจริง

**Tasks:**

- เพิ่ม Error Handler กลาง + Logging ด้วย Winston
- เพิ่ม Swagger Docs ครบทุก Endpoint
- ปรับ Performance ของ Query ด้วย Index / Caching
- Unit Test เบื้องต้นด้วย Jest / Supertest
- Deploy:
  - Backend → Railway
  - Database → MongoDB Atlas
  - AI Server → Render / EC2
- เขียน README สรุปการติดตั้งและใช้งาน API

**Output:**

- ระบบพร้อมใช้งานจริง (Production-ready)
- เชื่อมต่อกับ Frontend ได้เต็มรูปแบบ

---

## ✅ Final Deliverables

- Node.js REST API พร้อม Swagger Docs
- AI Engine (FastAPI) พร้อม Intent Detection
- ระบบค้นหาด้วย Text + Geo + AI Semantic
- เอกสาร `README.md` (แผนงาน 7 สัปดาห์)
- Code พร้อม deploy บน Railway / Render

---

## 👩‍💻 Developer Info

**Name:** _(ใส่ชื่อของคุณ)_  
**Role:** Backend Developer  
**Tech Stack:** Node.js, Express, MongoDB, FastAPI, HuggingFace  
**Timeline:** 7 Weeks (Sep–Dec 2025)

---

> “Build real AI-powered backend — where every search understands human intent.”
