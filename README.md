# 🛡️ VulnHunt-GPT: Smart Contract Vulnerability Detection System

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![React](https://img.shields.io/badge/React-Vite-61DAFB)
![OpenAI](https://img.shields.io/badge/AI-OpenAI%20GPT-green)
![PyTorch](https://img.shields.io/badge/DL-PyTorch-orange)

**VulnHunt-GPT** là hệ thống phát hiện lỗ hổng bảo mật cho Smart Contract (Solidity) sử dụng phương pháp lai (Hybrid Approach) kết hợp giữa Deep Learning và Large Language Models (LLMs).

Hệ thống không chỉ phát hiện lỗ hổng mà còn giải thích nguyên nhân, cung cấp ngữ cảnh từ các vụ tấn công tương tự (RAG) và đề xuất mã nguồn đã vá lỗi.

---

## 🚀 Tính năng nổi bật

- **Quy trình 3 bước (3-Stage Pipeline):**
  1.  **CodeBERT Detector:** Phân loại nhanh loại lỗ hổng (Reentrancy, Access Control,...) với độ tin cậy cao.
  2.  **RAG (Retrieval-Augmented Generation):** Tìm kiếm các đoạn mã lỗi tương tự trong cơ sở tri thức (Knowledge Base) để cung cấp ngữ cảnh thực tế.
  3.  **GPT Reasoner:** Tổng hợp thông tin, loại bỏ dương tính giả (False Positives) và đưa ra báo cáo chi tiết.
- **Giao diện trực quan:** Dashboard React hiển thị trạng thái Pipeline theo thời gian thực.
- **Báo cáo chi tiết:**
  - Vị trí dòng code lỗi (Line-level detection).
  - Kịch bản tấn công (Attack Scenario).
  - Chiến lược sửa lỗi (Remediation Strategy).
  - So sánh code trước và sau khi vá (Diff View).

---

## 🛠️ Cấu trúc dự án

```text
VulnHunt-GPT/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   └── package.json
├── server/                 # Backend (Flask API)
│   ├── app.py              # Entry point của Server
│   ├── requirements.txt    # Các thư viện Python cần thiết
│   └── VulnHunt-GPT-.../   # Core Logic (CodeBERT, RAG, GPT)
│       ├── data/           # Chứa Vector DB (.pkl, .index)
│       ├── results/        # Chứa Model đã train (.bin)
│       └── src/            # Mã nguồn xử lý chính
└── README.md
```

````

---

## ⚙️ Yêu cầu cài đặt

- **Node.js** (v16 trở lên)
- **Python** (v3.8 trở lên)
- **OpenAI API Key** (Có credit để chạy GPT-3.5/4)
- **Git**

---

## 📥 Hướng dẫn chạy (Localhost)

### Bước 1: Clone dự án

```bash
git clone [https://github.com/username/VulnHunt-GPT.git](https://github.com/username/VulnHunt-GPT.git)
cd VulnHunt-GPT

```

### Bước 2: Thiết lập Backend (Server)

1. Di chuyển vào thư mục server:

```bash
cd server

```

2. Cài đặt các thư viện Python:

```bash
pip install -r requirements.txt

```

_(Lưu ý: Nếu dùng Windows, hãy đảm bảo đã cài C++ Build Tools nếu gặp lỗi khi cài thư viện)_ 3. Cấu hình **OpenAI Key**:

- Mở file `app.py` (hoặc `.env` trong thư mục server).
- Cập nhật biến `OPENAI_API_KEY` bằng key của bạn: `sk-proj-...`

4. Đảm bảo dữ liệu Model và RAG đã tồn tại:

- Chạy lệnh tạo Knowledge Base (nếu chưa có):

```bash
python src/rag/build_kb.py

```

5. Khởi chạy Server:

```bash
python app.py

```

_Server sẽ chạy tại: `http://127.0.0.1:5000_`

### Bước 3: Thiết lập Frontend (Client)

1. Mở một terminal mới, di chuyển vào thư mục client:

```bash
cd client

```

2. Cài đặt dependencies:

```bash
npm install

```

3. Khởi chạy giao diện:

```bash
npm run dev

```

_Truy cập trình duyệt tại: `http://localhost:5173_`

---

## 🧪 Cách sử dụng

1. Truy cập giao diện web.
2. Upload file Smart Contract có đuôi `.sol`.
3. Nhấn nút **"Start Analysis"**.
4. Quan sát Pipeline chạy qua 3 bước:

- **Detector:** Hiện nhãn dự đoán và độ tin cậy.
- **RAG:** Hiện số lượng mã nguồn tương đồng tìm thấy.
- **GPT Verdict:** Kết luận cuối cùng (Vulnerable/Safe).

5. Xem báo cáo chi tiết và code fix bên dưới.

---

## 🔧 Xử lý lỗi thường gặp (Troubleshooting)

- **Lỗi "RAG Knowledge Base not found":**
- Hãy chắc chắn bạn đã chạy lệnh `python src/rag/build_kb.py` tại thư mục server.
- Kiểm tra file `src/config.py` xem đường dẫn `KB_PATH` có trúng với vị trí file `.pkl` không.

- **Lỗi "OpenAI 401 Unauthorized":**
- Kiểm tra lại API Key trong file `server/app.py`.
- Đảm bảo tài khoản OpenAI còn hạn mức sử dụng (Quota).

- **Lỗi Frontend không kết nối được (Network Error):**
- Kiểm tra xem cửa sổ terminal chạy Python Server có đang mở không.
- Kiểm tra xem Server có báo lỗi 500 không.

---
````
