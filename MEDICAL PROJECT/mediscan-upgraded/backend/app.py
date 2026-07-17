# ================================================================
#  MediScan AI — Python Flask Backend (Groq Edition)
#  File    : backend/app.py
#  AI      : Groq API — FREE, no credit card needed
#  Model   : llama3-8b-8192  (chat) | llava-v1.5-7b-4096-preview (vision)
#  Run     : python app.py
# ================================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os, base64, logging, re, json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL = "llama-3.3-70b-versatile"
VISION_MODEL = "llama-3.2-90b-vision-preview"   # Groq vision model

# ── System prompt (symptom chat) ──────────────────────────────────────────────
SYSTEM_PROMPT = """You are MediScan AI, a compassionate and clinically grounded health assistant built for a BCA final year project website. Your role is to:

1. Listen carefully to the user's described symptoms
2. Ask targeted clarifying questions: duration, severity (1-10 scale), body location, aggravating or relieving factors, and related symptoms
3. Provide 2-4 possible medical conditions that best match the described symptoms, with brief accessible explanations for each
4. Give practical self-care recommendations the user can follow at home
5. ALWAYS clearly state when symptoms require urgent or emergency medical attention
6. ALWAYS include a reminder that you are an AI and cannot replace a licensed medical professional

Formatting:
- Use clear section headers (e.g., "Possible Conditions:", "Self-Care Tips:")
- Keep language warm, clear, and easy to understand — no jargon
- Use bullet points for lists
- Be thorough but not overwhelming

CRITICAL SAFETY RULE:
If the user describes symptoms that could indicate a life-threatening emergency such as chest pain with shortness of breath, sudden severe headache, face drooping or arm weakness (stroke), severe allergic reaction, or uncontrolled bleeding — you MUST immediately tell them to call emergency services (911) BEFORE giving any other information.

Never provide a definitive diagnosis. Always recommend consulting a qualified healthcare professional."""

# ── Prescription analyzer prompt ──────────────────────────────────────────────
PRESCRIPTION_PROMPT = """You are a medical prescription analyzer. Carefully examine this prescription image and extract all medicines.

For EACH medicine found, provide:
1. Medicine name (as written on prescription)
2. Generic name (if identifiable)
3. Manufacturer / pharmaceutical company (if visible or well-known)
4. Dosage (strength, e.g. 500mg)
5. Form (tablet, capsule, syrup, injection, etc.)
6. Frequency / instructions (e.g. twice daily, after meals)
7. Duration (if mentioned)
8. Common uses / what it treats

IMPORTANT: Respond ONLY with valid JSON — no markdown, no explanation, no backticks.
The JSON must follow this exact structure:
{
  "medicines": [
    {
      "name": "Medicine name as written",
      "generic_name": "Generic/INN name or null",
      "company": "Pharmaceutical company name or null",
      "dosage": "e.g. 500mg or null",
      "form": "tablet/capsule/syrup/etc or null",
      "frequency": "dosage instructions or null",
      "duration": "treatment duration or null",
      "uses": "what this medicine treats",
      "warnings": "key warnings if any or null"
    }
  ],
  "doctor_name": "Doctor name if visible or null",
  "patient_name": "Patient name if visible or null",
  "date": "Prescription date if visible or null",
  "notes": "Any other important notes or null"
}

If you cannot read the prescription clearly, still return the JSON with a medicines array (empty if truly unreadable) and add a "error" key explaining the issue."""


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def root():
    return jsonify({"service": "MediScan AI Backend", "version": "2.0.0", "status": "running", "ai": "Groq — " + MODEL})


@app.route("/api/health", methods=["GET"])
def health():
    key_ok = bool(os.getenv("GROQ_API_KEY"))
    return jsonify({"status": "ok" if key_ok else "missing_key", "api_key_configured": key_ok, "model": MODEL, "vision_model": VISION_MODEL, "provider": "Groq (Free)"}), 200 if key_ok else 503


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        messages = data.get("messages")
        if not messages or not isinstance(messages, list) or len(messages) == 0:
            return jsonify({"error": "'messages' must be a non-empty list"}), 400

        for i, msg in enumerate(messages):
            if not isinstance(msg, dict):
                return jsonify({"error": f"Message {i} must be an object"}), 400
            if "role" not in msg or "content" not in msg:
                return jsonify({"error": f"Message {i} must have 'role' and 'content'"}), 400
            if msg["role"] not in ("user", "assistant"):
                return jsonify({"error": f"Message {i} role must be 'user' or 'assistant'"}), 400

        logger.info(f"Chat request — {len(messages)} message(s)")
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        response = client.chat.completions.create(
    model=MODEL,
    messages=full_messages,
    temperature=0.7,
)


        reply = response.choices[0].message.content
        logger.info(f"Groq response received — {len(reply)} chars")
        return jsonify({"reply": reply})

    except Exception as e:
        return _handle_error(e)


@app.route("/api/prescription", methods=["POST"])
def analyze_prescription():
    """Analyze a prescription image and extract medicines + companies."""
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        image_b64 = data.get("image")   # base64 string
        image_type = data.get("type", "image/jpeg")   # mime type

        if not image_b64:
            return jsonify({"error": "No image provided. Send base64 image in 'image' field."}), 400

        logger.info(f"Prescription analysis request — image type: {image_type}")

        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image_type};base64,{image_b64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": PRESCRIPTION_PROMPT
                        }
                    ]
                }
            ],
            max_tokens=2048,
            temperature=0.1,
        )

        raw = response.choices[0].message.content.strip()
        logger.info(f"Vision model response — {len(raw)} chars")

        # Strip markdown fences if present
        clean = re.sub(r"^```(?:json)?\s*", "", raw)
        clean = re.sub(r"\s*```$", "", clean).strip()

        try:
            result = json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("Could not parse JSON from vision model, returning raw")
            result = {
                "medicines": [],
                "error": "Could not parse prescription. Please upload a clearer image.",
                "raw": raw
            }

        return jsonify(result)

    except Exception as e:
        return _handle_error(e)


def _handle_error(e):
    err_str = str(e).lower()
    if "authentication" in err_str or "api key" in err_str or "401" in err_str:
        logger.error("Invalid Groq API key")
        return jsonify({"error": "Invalid GROQ_API_KEY. Check your .env file."}), 401
    elif "rate limit" in err_str or "429" in err_str:
        logger.warning("Groq rate limit hit")
        return jsonify({"error": "Rate limit reached. Wait a few seconds and try again."}), 429
    elif "connection" in err_str or "network" in err_str:
        logger.error("Cannot connect to Groq")
        return jsonify({"error": "Cannot reach Groq servers. Check your internet."}), 502
    else:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return jsonify({"error": f"Server error: {str(e)}"}), 500


if __name__ == "__main__":
    key = os.getenv("GROQ_API_KEY")
    print("\n" + "=" * 60)
    print("  🩺  MediScan AI v2.0 — Python Backend (Groq)")
    print("=" * 60)
    if not key:
        print("\n  ⚠️  WARNING: GROQ_API_KEY not found!")
        print("  1. Go to https://console.groq.com")
        print("  2. Sign up free → API Keys → Create Key")
        print("  3. Add to backend/.env:")
        print("     GROQ_API_KEY=gsk_your_key_here\n")
    else:
        print(f"\n  ✅  Groq API key loaded  ({key[:12]}…)")
        print(f"  🤖  Chat model  : {MODEL}")
        print(f"  👁️  Vision model: {VISION_MODEL}")
    print("\n  🚀  Server: http://localhost:5000")
    print("  📋  Endpoints:")
    print("      GET  /api/health")
    print("      POST /api/chat")
    print("      POST /api/prescription")
    print("  Press Ctrl+C to stop")
    print("=" * 60 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5000)
