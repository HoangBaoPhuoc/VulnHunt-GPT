import React, { useState, useRef } from "react";
import {
  Upload,
  Play,
  AlertCircle,
  CheckCircle,
  Shield,
  Sword,
  Code,
  FileText,
  Zap,
  Brain,
  Database,
  Search,
} from "lucide-react";

const VulnHuntGPT = () => {
  const [file, setFile] = useState(null);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [executionTime, setExecutionTime] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [fixStrategy, setFixStrategy] = useState("");

  // State mới để chứa thông tin Pipeline
  const [pipelineInfo, setPipelineInfo] = useState({
    detector: { label: "Waiting...", confidence: 0 },
    rag: { found: false, count: 0, examples: [] },
    verdict: "Unknown",
  });

  const [hoveredLine, setHoveredLine] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (uploadedFile) => {
    if (uploadedFile && uploadedFile.name.endsWith(".sol")) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target.result);
        resetState();
      };
      reader.readAsText(uploadedFile);
    } else {
      alert("Please upload a valid .sol file");
    }
  };

  const resetState = () => {
    setScanStatus("idle");
    setVulnerabilities([]);
    setFixStrategy("");
    setExecutionTime(null);
    setPipelineInfo({
      detector: { label: "Waiting...", confidence: 0 },
      rag: { found: false, count: 0, examples: [] },
      verdict: "Unknown",
    });
  };

  const startScan = async () => {
    setScanning(true);
    setScanStatus("running");

    // Giả lập hiệu ứng loading từng bước cho đẹp mắt
    setPipelineInfo((prev) => ({
      ...prev,
      detector: { label: "Analyzing...", confidence: 0 },
    }));

    const startTime = Date.now();

    try {
      const response = await fetch("http://127.0.0.1:5000/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          filename: file?.name || "contract.sol",
        }),
      });

      if (!response.ok) throw new Error("Scan failed");

      const data = await response.json();
      const endTime = Date.now();

      setExecutionTime(((endTime - startTime) / 1000).toFixed(2));
      setVulnerabilities(data.vulnerabilities || []);
      setFixStrategy(data.fix_strategy || "");

      // Cập nhật thông tin Pipeline từ backend trả về
      setPipelineInfo({
        detector: data.pipeline_status?.detector || {
          label: "N/A",
          confidence: 0,
        },
        rag: data.pipeline_status?.rag || {
          found: false,
          count: 0,
          examples: [],
        },
        verdict: data.final_verdict || "Unknown",
      });

      setScanStatus("completed");
    } catch (error) {
      console.error("Scan error:", error);
      alert("Lỗi: " + error.message);
      setScanStatus("error");
    } finally {
      setScanning(false);
    }
  };

  // --- RENDERING HELPERS ---
  const vulnerableLines = new Set();
  const lineVulnerabilities = {};
  vulnerabilities.forEach((vuln) => {
    vuln.lines.forEach((line) => {
      vulnerableLines.add(line);
      if (!lineVulnerabilities[line]) lineVulnerabilities[line] = [];
      lineVulnerabilities[line].push(vuln);
    });
  });

  const renderCode = () => {
    const lines = code.split("\n");
    return lines.map((line, idx) => {
      const lineNumber = idx + 1;
      const isVulnerable = vulnerableLines.has(lineNumber);

      return (
        <div
          key={idx}
          className={`code-line ${isVulnerable ? "vulnerable" : ""}`}
          onMouseEnter={() => isVulnerable && setHoveredLine(lineNumber)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <span className="line-number">{lineNumber}</span>
          <span className="line-content">{line || " "}</span>
          {isVulnerable && hoveredLine === lineNumber && (
            <div className="vulnerability-tooltip">
              {lineVulnerabilities[lineNumber].map((vuln, i) => (
                <div key={i} className="tooltip-item">
                  <strong>{vuln.name}</strong>
                  <div className="tooltip-fix">
                    Fix: {vuln.remediation.substring(0, 50)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="app-container">
      <style>{`
        * { box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; background: #f1f5f9; color: #334155; }
        .app-container { min-height: 100vh; padding: 2rem; }
        
        .header { text-align: center; margin-bottom: 2rem; }
        .header h1 { font-size: 2.5rem; color: #0f172a; font-weight: 800; margin-bottom: 0.5rem; }
        .header p { color: #64748b; font-size: 1.1rem; }

        /* PIPELINE CARDS */
        .pipeline-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem;
        }
        .pipeline-card {
            background: white; padding: 1.5rem; border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-top: 4px solid #cbd5e1;
            transition: transform 0.2s;
        }
        .pipeline-card:hover { transform: translateY(-3px); }
        .pipeline-card.active { border-top-color: #3b82f6; }
        .pipeline-card.success { border-top-color: #10b981; }
        .pipeline-card.danger { border-top-color: #ef4444; }

        .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; }
        .card-value { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; }
        .card-sub { font-size: 0.9rem; color: #64748b; }

        /* MAIN LAYOUT */
        .main-grid { display: grid; grid-template-columns: 350px 1fr; gap: 2rem; margin-bottom: 3rem; }
        .panel { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: 100%; }
        
        /* CODE EDITOR */
        .code-container { height: 600px; overflow: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; font-family: 'Fira Code', monospace; font-size: 14px; }
        .code-line { display: flex; min-width: 100%; width: fit-content; position: relative; }
        .code-line:hover { background: #f1f5f9; }
        .code-line.vulnerable { background: #fee2e2; }
        .line-number { width: 50px; text-align: right; padding-right: 10px; color: #94a3b8; background: #f8fafc; border-right: 1px solid #e2e8f0; user-select: none; position: sticky; left: 0; }
        .line-content { padding: 0 1rem; white-space: pre; }

        .vulnerability-tooltip {
            position: absolute; left: 60px; top: 100%; background: #1e293b; color: white; padding: 10px; border-radius: 6px; z-index: 50; width: max-content; max-width: 400px; pointer-events: none;
        }

        /* BUTTONS */
        .btn-upload { border: 2px dashed #cbd5e1; padding: 2rem; text-align: center; border-radius: 8px; cursor: pointer; transition: 0.2s; margin-bottom: 1rem; }
        .btn-upload:hover { border-color: #3b82f6; background: #eff6ff; }
        .btn-scan { width: 100%; background: #2563eb; color: white; border: none; padding: 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; gap: 0.5rem; }
        .btn-scan:disabled { opacity: 0.7; cursor: wait; }

        /* RESULTS */
        .result-box { margin-top: 2rem; }
        .vuln-card { border: 1px solid #e2e8f0; border-radius: 8px; background: white; margin-bottom: 1.5rem; overflow: hidden; }
        .vuln-header { padding: 1rem 1.5rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .vuln-body { padding: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .badge { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
        .badge.high { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .badge.medium { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        
        .code-block { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 0.9rem; margin-top: 0.5rem; }
      `}</style>

      <div className="header">
        <h1>🛡️ VulnHunt-GPT Pipeline</h1>
        <p>Full-stack Vulnerability Detection: CodeBERT → RAG → GPT-4</p>
      </div>

      {/* PIPELINE VISUALIZATION */}
      <div className="pipeline-grid">
        {/* STEP 1: DETECTOR */}
        <div
          className={`pipeline-card ${
            scanStatus === "completed" ? "active" : ""
          }`}
        >
          <div className="card-header">
            <Brain size={18} /> 1. CodeBERT Detector
          </div>
          <div className="card-value">{pipelineInfo.detector.label}</div>
          <div className="card-sub">
            Confidence: {(pipelineInfo.detector.confidence * 100).toFixed(1)}%
          </div>
        </div>

        {/* STEP 2: RAG */}
        <div
          className={`pipeline-card ${pipelineInfo.rag.found ? "active" : ""}`}
        >
          <div className="card-header">
            <Database size={18} /> 2. RAG Knowledge Base
          </div>
          <div className="card-value">
            {pipelineInfo.rag.found
              ? `${pipelineInfo.rag.count} Similar Cases`
              : "No Matches"}
          </div>
          <div className="card-sub">
            {pipelineInfo.rag.examples[0] ||
              "Retrieving similar vulnerabilities..."}
          </div>
        </div>

        {/* STEP 3: GPT VERDICT */}
        <div
          className={`pipeline-card ${
            pipelineInfo.verdict === "Vulnerable" ? "danger" : "success"
          }`}
        >
          <div className="card-header">
            <Shield size={18} /> 3. GPT Final Verdict
          </div>
          <div
            className="card-value"
            style={{
              color:
                pipelineInfo.verdict === "Vulnerable" ? "#dc2626" : "#059669",
            }}
          >
            {pipelineInfo.verdict}
          </div>
          <div className="card-sub">
            {vulnerabilities.length} confirmed issues found
          </div>
        </div>
      </div>

      <div className="main-grid">
        {/* LEFT PANEL */}
        <div className="panel">
          <div
            className="btn-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload
              style={{
                margin: "0 auto 10px",
                display: "block",
                color: "#3b82f6",
              }}
            />
            <strong>{file ? file.name : "Upload Contract (.sol)"}</strong>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sol"
            style={{ display: "none" }}
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />

          <button
            className="btn-scan"
            onClick={startScan}
            disabled={!code || scanning}
          >
            {scanning ? "Processing Pipeline..." : "Start Analysis"}
          </button>

          <div
            style={{
              marginTop: "auto",
              paddingTop: "1rem",
              borderTop: "1px solid #f1f5f9",
              fontSize: "0.9rem",
              color: "#64748b",
            }}
          >
            Status: <strong>{scanStatus.toUpperCase()}</strong> <br />
            Time: {executionTime || "--"}s
          </div>
        </div>

        {/* RIGHT PANEL - CODE */}
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "10px 15px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              fontWeight: 600,
            }}
          >
            Source Code Viewer
          </div>
          <div className="code-container">
            {code ? (
              renderCode()
            ) : (
              <div style={{ padding: 20, color: "#94a3b8" }}>
                Code content will appear here...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED RESULTS */}
      {scanStatus === "completed" && vulnerabilities.length > 0 && (
        <div className="result-box">
          <h2
            style={{
              marginBottom: "1.5rem",
              borderBottom: "2px solid #3b82f6",
              display: "inline-block",
            }}
          >
            Detailed Vulnerability Report
          </h2>

          {/* GLOBAL FIX */}
          {fixStrategy && (
            <div
              style={{
                background: "#eff6ff",
                padding: "1.5rem",
                borderRadius: "8px",
                marginBottom: "2rem",
                border: "1px solid #bfdbfe",
              }}
            >
              <h3 style={{ color: "#1e40af", marginTop: 0 }}>
                <Shield size={20} style={{ verticalAlign: "middle" }} />{" "}
                Recommended Fix Strategy
              </h3>
              <p style={{ color: "#1e3a8a", lineHeight: 1.6 }}>{fixStrategy}</p>
            </div>
          )}

          {/* VULN CARDS */}
          {vulnerabilities.map((vuln, idx) => (
            <div key={idx} className="vuln-card">
              <div className="vuln-header">
                <div
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <AlertCircle
                    color={vuln.severity === "High" ? "#dc2626" : "#d97706"}
                  />
                  {vuln.name}
                </div>
                <span
                  className={`badge ${
                    vuln.severity === "High" ? "high" : "medium"
                  }`}
                >
                  {vuln.severity}
                </span>
              </div>
              <div className="vuln-body">
                <div>
                  <strong>Explanation:</strong>
                  <p style={{ lineHeight: 1.6, color: "#334155" }}>
                    {vuln.explanation}
                  </p>
                  <div
                    style={{
                      marginTop: "1rem",
                      background: "#f8fafc",
                      padding: "1rem",
                      borderRadius: "6px",
                      borderLeft: "3px solid #cbd5e1",
                    }}
                  >
                    <em>"{vuln.attack_scenario}"</em>
                  </div>
                </div>
                <div>
                  <strong>
                    Vulnerable Code (Lines {vuln.lines.join(", ")}):
                  </strong>
                  <div className="code-block">{vuln.code_snippet}</div>
                  <br />
                  <strong style={{ color: "#059669" }}>Remediation:</strong>
                  <div
                    className="code-block"
                    style={{
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #86efac",
                    }}
                  >
                    {vuln.remediation}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VulnHuntGPT;
