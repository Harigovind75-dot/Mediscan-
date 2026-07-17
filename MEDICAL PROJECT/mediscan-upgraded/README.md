# 🩺 MediScan AI v2.0 — Full Stack Health Assistant

An AI-powered health assistant with **symptom analysis chat** and **prescription analyzer**.  
Built with Python Flask + Groq API (FREE — no credit card needed).

---

## ✨ What's New in v2.0

| Feature | Description |
|---|---|
| 📋 **Prescription Analyzer** | Upload any prescription image → AI extracts medicines, companies, dosages |
| 🏭 **Company Detection** | Identifies the pharmaceutical manufacturer of each medicine |
| 👁️ **Vision AI** | Powered by Groq's Llama 4 Scout vision model |
| ⬇️ **JSON Export** | Download full prescription analysis as JSON |
| 🖨️ **Print Results** | Print-friendly prescription summary |

---

## 🚀 Quick Start

### 1. Get a FREE Groq API Key
1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Click **API Keys** → **Create API Key**
4. Copy the key

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env and paste your Groq API key

pip install -r requirements.txt
python app.py
```

### 3. Open Frontend
Open `frontend/index.html` in your browser, or serve with Live Server.

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server health check |
| POST | `/api/chat` | Symptom analysis chat |
| POST | `/api/prescription` | Analyze prescription image |

### POST /api/prescription
```json
{
  "image": "<base64 encoded image string>",
  "type": "image/jpeg"
}
```

**Response:**
```json
{
  "medicines": [
    {
      "name": "Amoxicillin",
      "generic_name": "Amoxicillin trihydrate",
      "company": "GSK / GlaxoSmithKline",
      "dosage": "500mg",
      "form": "capsule",
      "frequency": "3 times daily",
      "duration": "7 days",
      "uses": "Bacterial infections",
      "warnings": "Complete the full course"
    }
  ],
  "doctor_name": "Dr. Smith",
  "patient_name": "John Doe",
  "date": "2026-05-15",
  "notes": null
}
```

---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python 3.x, Flask, Flask-CORS
- **AI (Chat)**: Groq — `llama-3.1-8b-instant"`
- **AI (Vision)**: Groq — `meta-llama/llama-4-scout-17b-16e-instruct`
- **Fonts**: Google Fonts (Fraunces + DM Sans)

---

## ⚠️ Medical Disclaimer
MediScan AI is a BCA academic project for educational purposes only.  
It does not replace professional medical diagnosis. Always consult a qualified doctor.
