# 🧠 AI Intent Engine (FastAPI + Sentence-BERT)

ตัวอย่างโปรเจกต์สร้าง API ที่เข้าใจเจตนาของผู้ใช้  
ด้วย FastAPI + Sentence-BERT บน Ubuntu

---

## 1️⃣ ติดตั้งแพ็กเกจที่จำเป็น

อัปเดตและติดตั้ง Python + pip (ถ้ายังไม่มี):

    ```bash
    sudo apt update
    sudo apt install python3 python3-pip -y

ติดตั้ง venv สำหรับสร้าง Virtual Environment:

     ```bash
    sudo apt install python3.12-venv -y

2️⃣ สร้างและเปิดใช้งาน Virtual Environment

    # สร้างโฟลเดอร์โปรเจกต์
    mkdir ~/ai_server
    cd ~/ai_server

    # สร้าง venv
    python3 -m venv venv

    # เปิดใช้งาน
    source venv/bin/activate

    ถ้าเปิดใช้งานสำเร็จ prompt จะขึ้นว่า (venv) เช่น:
    (venv) omega@omega-01:~/ai_server$


    ตรวจสอบ venv:
     ```bash
        which python
        # ตัวอย่าง output: /home/omega/ai_server/venv/bin/python

        ls ~/ai_server/venv
        # ควรมี bin, lib, pyvenv.cfg

3️⃣ ติดตั้งแพ็กเกจ Python
```bash
pip install fastapi uvicorn sentence-transformers torch

    ตรวจสอบแพ็กเกจ:

    ```bash
    pip list

🧹 วิธีแก้ไขปัญหาแพ็กเกจ

    1.ลบแพ็กเกจเฉพาะตัว:
     ```bash
    pip uninstall fastapi uvicorn sentence-transformers torch -y

    2.ลบทุกแพ็กเกจใน venv:

    ```bash
    pip freeze > old.txt
    cat old.txt | xargs pip uninstall -y

    3.ลบ venv แล้วสร้างใหม่ (ถ้ามี error เยอะ):

       ```bash
        deactivate
        rm -rf venv
        python3 -m venv venv
        source venv/bin/activate

4️⃣ รัน FastAPI รันแบบ default:

    ```bash
    uvicorn main:app --reload

    ⚠️ ปัญหา: FastAPI จะฟังเฉพาะ 127.0.0.1 (localhost) → คนอื่นใน LAN เข้าถึงไม่ได้


    ✅ วิธีแก้

    1.ระบุ host เป็น 0.0.0.0:

     ```bash
        uvicorn main:app --host 0.0.0.0 --port 8000

    2.ตรวจสอบ firewall:

    ```bash
        sudo ufw status

    3.เปิด port 8000:

    ```bash
     # สำหรับทุกเครื่อง
    sudo ufw allow 8000

    # หรือสำหรับ LAN subnet
    sudo ufw allow from 10.134.0.0/16 to any port 8000

5️⃣ Flow Diagram (ASCII / Markdown)

+-----------------+
| ผู้ใช้พิมพ์ข้อความ |
+-----------------+
|
v
+-----------------+
| ส่งข้อความไป AI |
| Intent Engine |
+-----------------+
|
v
+-----------------+
| AI วิเคราะห์ |
| - intent |
| - keywords |
| - embedding |
+-----------------+
|
v
+-----------------+
| ระบบนำข้อมูลไปใช้ |
| - filter บ้าน |
| - ตอบอัตโนมัติ |
+-----------------+
|
v
+-----------------+
| ผู้ใช้เห็นผลลัพธ์ |
+-----------------+

6️⃣ หมายเหตุ / เคล็ดลับ

    ตรวจสอบว่า venv ถูกสร้างและเปิดใช้งานแล้ว

    ตรวจสอบสิทธิ์ไฟล์และโฟลเดอร์ให้ web server เข้าถึงได้

    สำหรับการอัปเดตแพ็กเกจหรือแก้ไข error ให้พิจารณาลบ venv แล้วสร้างใหม่

    เปิด port 8000 และกำหนด host 0.0.0.0 เพื่อให้ LAN เข้าถึง API ได้
