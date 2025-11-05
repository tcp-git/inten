# FastAPI AI Engine Project

โครงการนี้เป็นการสร้าง **AI Engine** สำหรับประมวลผลข้อความ (NLP) ด้วย FastAPI และ Sentence-BERT เพื่อรองรับฟังก์ชันต่าง ๆ เช่น การสร้าง embedding, การดึงคำสำคัญ, การวิเคราะห์ช่วงราคา และการช่วยค้นหาอสังหาริมทรัพย์

---

## ✅ สิ่งที่ได้ดำเนินการ

### 1. สร้างโปรเจกต์ Python แยกสำหรับ AI Services
- ตั้งค่าโฟลเดอร์ `ai_engine/` พร้อมโครงสร้างโปรเจกต์ที่เหมาะสม  
- สร้างสถาปัตยกรรมแบบ **modular** แบ่งเป็น `services` และ `models`  

### 2. ติดตั้ง dependencies
- ติดตั้ง **FastAPI**, **uvicorn**, และ **sentence-transformers**  
- สร้าง `requirements.txt` ครบถ้วน  
- ใช้เวอร์ชันที่เข้ากับ **Python 3.12**  
- ตรวจสอบการทำงานร่วมกันของแพ็กเกจทั้งหมด  

### 3. ตั้งค่าโครงสร้างโปรเจกต์ AI Services
- `main.py` → จุดเริ่มต้นของ FastAPI พร้อมจัดการ lifecycle  
- `services/intent_service.py` → การตรวจจับ intent และประมวลผล NLP  
- `models/request_models.py` → Pydantic models สำหรับ request/response  
- `config.py` → การตั้งค่าและ environment variables  
- `README.md` → เอกสารและคำแนะนำการติดตั้ง  

### 4. โหลดและตั้งค่า Sentence-BERT Model
- ใช้ **IntentService** class พร้อม async model initialization  
- โมเดล: `all-MiniLM-L6-v2` (384-dimensional embeddings)  
- รองรับ **ตรวจสอบสุขภาพโมเดล**, error handling  
- มี **preprocessing ข้อความ** และ **keyword extraction**  

### 5. สร้าง FastAPI Application เบื้องต้น
- `/health` → ตรวจสอบสถานะของบริการ  
- `/` → แสดงข้อมูลบริการ  
- ตั้งค่า **CORS middleware**  
- จัดการ startup/shutdown lifecycle อย่างถูกต้อง  
- รองรับ **error handling** ครอบคลุม  

### 6. ฟีเจอร์เพิ่มเติม
- การดึง **ช่วงราคาจากข้อความธรรมชาติ** (ไทย/อังกฤษ)  
- การดึง **location hints** จากข้อความ  
- การดึง **keywords** พร้อม filter stop words  
- การจัดการ config ผ่าน environment variables  
- สคริปต์ทดสอบการติดตั้ง AI Engine  
- logging และ monitoring สำหรับตรวจสอบระบบ  

---

## ✅ ผลลัพธ์

AI Engine พร้อมใช้งานและผ่านการทดสอบแล้ว สามารถ:

- ประมวลผล **query ภาษาไทย/อังกฤษ**  
- สร้าง **semantic embeddings**  
- ดึง **parameters สำหรับค้นหาอสังหาริมทรัพย์**  
- รองรับข้อกำหนด **Requirements 1.1 และ 1.4**  

ระบบพร้อมใช้งานจริงสำหรับงานค้นหาและประมวลผลข้อความในโปรเจกต์อสังหาริมทรัพย์
