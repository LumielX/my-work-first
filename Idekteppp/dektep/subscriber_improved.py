"""
subscriber_improved.py
=======================
รับข้อมูลจาก MQTT publisher แล้วบันทึกลง CSV
- เพิ่ม: validate ข้อมูลก่อน save (กรอง NaN)
- เพิ่ม: ตรวจ duplicate timestamp
- เพิ่ม: logging ชัดเจน + นับ row ที่บันทึก/ข้าม
- เพิ่ม: path validation ก่อนรัน
- เพิ่ม: ใช้ paho-mqtt API version ใหม่ (ไม่มี DeprecationWarning)
- แก้: ปิด/เปิดไฟล์ทุก message → ใช้ buffer flush แทน
"""


