import sys
import os
import json
import torch
import joblib
import traceback
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import RobertaTokenizer, RobertaForSequenceClassification

# --- CẤU HÌNH ĐƯỜNG DẪN ---
# Tên thư mục chứa source code đồ án
REPO_FOLDER_NAME = "VulnHunt-GPT-Smart-Contract-Vulnerability-Detection-System-using-OpenAI"

# Setup đường dẫn để import được 'src'
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_path = os.path.join(current_dir, REPO_FOLDER_NAME)
sys.path.append(repo_path)

# Import các module từ source code của đồ án
try:
    from src.config import config
    from src.rag.retriever import CodeBERTRetriever
    from src.gpt_explainer.explainer import GPTSemanticReasoner
    print("✅ Đã import thành công các module VulnHunt!")
except ImportError as e:
    print(f"❌ Lỗi Import: {e}")
    sys.exit(1)

# Lấy đường dẫn từ file config của đồ án
MODEL_PATH = Path(repo_path) / config.CODEBERT_MODEL_PATH
KB_PATH = Path(repo_path) / config.KB_PATH
LE_PATH = Path(repo_path) / config.LABEL_ENCODER_PATH

app = Flask(__name__)
CORS(app)

# --- GLOBAL VARIABLES (Load Model 1 lần để chạy cho nhanh) ---
print("⏳ Đang khởi tạo hệ thống (Load Models)...")
device = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = None
detector_model = None
label_encoder = None
rag_retriever = None

# Hàm load resources
def load_resources():
    global tokenizer, detector_model, label_encoder, rag_retriever
    
    # 1. Load Tokenizer & CodeBERT Model
    try:
        print(f"   - Loading CodeBERT từ: {MODEL_PATH}")
        tokenizer = RobertaTokenizer.from_pretrained("microsoft/codebert-base")
        if LE_PATH.exists():
            label_encoder = joblib.load(LE_PATH)
            num_labels = len(label_encoder.classes_)
            
            # Load model nếu tồn tại, nếu không dùng base (cho demo)
            model_to_load = str(MODEL_PATH) if MODEL_PATH.exists() else "microsoft/codebert-base"
            detector_model = RobertaForSequenceClassification.from_pretrained(
                model_to_load, num_labels=num_labels, ignore_mismatched_sizes=True
            )
            detector_model.to(device)
            detector_model.eval()
            print("   ✅ CodeBERT Detector Ready.")
        else:
            print("   ⚠️ Không tìm thấy Label Encoder. Bỏ qua Detector.")
    except Exception as e:
        print(f"   ❌ Lỗi load Detector: {e}")

    # 2. Load RAG Retriever
    try:
        if KB_PATH.exists():
            print(f"   - Loading RAG Database từ: {KB_PATH}")
            # Cần đảm bảo CodeBERTRetriever nhận đúng path
            rag_retriever = CodeBERTRetriever(str(MODEL_PATH), str(KB_PATH), device=device)
            print("   ✅ RAG Retriever Ready.")
        else:
            print("   ⚠️ Không tìm thấy Knowledge Base. Bỏ qua RAG.")
    except Exception as e:
        print(f"   ❌ Lỗi load RAG: {e}")

# Gọi hàm load khi start server
load_resources()

@app.route('/api/scan', methods=['POST'])
def scan_contract():
    try:
        data = request.json
        code = data.get('code', '')
        
        # Biến lưu kết quả từng giai đoạn
        pipeline_results = {
            "detector": {"label": "N/A", "confidence": 0.0},
            "rag": {"found": False, "count": 0, "examples": []},
            "gpt": {}
        }

        # --- BƯỚC 1: CodeBERT DETECTION ---
        if detector_model and label_encoder:
            try:
                inputs = tokenizer(code, return_tensors="pt", max_length=512, truncation=True, padding="max_length")
                inputs = {k: v.to(device) for k, v in inputs.items()}
                with torch.no_grad():
                    logits = detector_model(**inputs).logits
                    probs = torch.softmax(logits, dim=1)
                    conf, pred_id = torch.max(probs, dim=1)
                
                pred_label = label_encoder.inverse_transform([pred_id.item()])[0]
                pipeline_results["detector"] = {
                    "label": pred_label,
                    "confidence": float(f"{conf.item():.4f}")
                }
            except Exception as e:
                print(f"Detector Error: {e}")

        # --- BƯỚC 2: RAG RETRIEVAL ---
        rag_context = []
        if rag_retriever:
            try:
                rag_results = rag_retriever.retrieve(code, k=3)
                rag_context = rag_results
                pipeline_results["rag"] = {
                    "found": True,
                    "count": len(rag_results),
                    # Chỉ lấy tên file để hiển thị cho gọn
                    "examples": [r['entry']['filename'] for r in rag_results if 'entry' in r] 
                }
            except Exception as e:
                print(f"RAG Error: {e}")

        # --- BƯỚC 3: GPT REASONING ---
        # Dùng API Key từ config hoặc env
        api_key = os.getenv("OPENAI_API_KEY") or config.OPENAI_API_KEY
        reasoner = GPTSemanticReasoner(api_key=api_key)
        
        gpt_response = reasoner.reason_and_correct(
            source_code=code,
            detector_prediction=pipeline_results["detector"]["label"],
            detector_confidence=pipeline_results["detector"]["confidence"],
            rag_examples=rag_context
        )
        
        # Xử lý kết quả trả về cho Frontend
        frontend_vulnerabilities = []
        vuln_lines = gpt_response.get("vulnerable_lines", [])
        
        for vuln in vuln_lines:
            frontend_vulnerabilities.append({
                "name": vuln.get("vulnerability_type", "Unknown").replace("_", " ").title(),
                "severity": vuln.get("severity", "Medium"),
                "lines": [vuln.get("line_number")],
                "code_snippet": vuln.get("code_snippet", ""),
                "explanation": vuln.get("explanation", ""),
                "attack_scenario": vuln.get("attack_scenario", "No scenario provided"),
                "remediation": "See fix below"
            })
            
        # Tìm fix cụ thể trong changes_made
        changes = gpt_response.get("changes_made", [])
        for v in frontend_vulnerabilities:
            for c in changes:
                if c.get("line_number") in v["lines"]:
                     v["remediation"] = c.get("fixed", v["remediation"])

        return jsonify({
            "pipeline_status": {
                "detector": pipeline_results["detector"],
                "rag": pipeline_results["rag"]
            },
            "vulnerabilities": frontend_vulnerabilities,
            "fix_strategy": gpt_response.get("fix_strategy", ""),
            "final_verdict": gpt_response.get("corrected_verdict", "Unknown"),
            "executionTime": 0
        })

    except Exception as e:
        print("🔥 Lỗi Server:")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"🚀 Server chạy tại http://127.0.0.1:5000")
    app.run(debug=True, port=5000)