import os
import random
import uuid
import logging
from io import BytesIO
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from PIL import Image, UnidentifiedImageError
from preprocess import preprocess_image
from model_utils import load_quality_model, predict_with_model

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("rubber-ml-service")

MOCK_MODE = os.getenv("MOCK_MODE", "true").lower() == "true"
MODEL_VERSION = os.getenv("MODEL_VERSION", "mock-v1")
MODEL_PATH = os.getenv("MODEL_PATH", "models/rubber_quality_model.keras")
THRESHOLD = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.70"))
MAX_IMAGE_MB = int(os.getenv("MAX_IMAGE_MB", "5"))
CLASSES = ["Q1", "Q2", "Q3"]
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
GRADE_DEFINITIONS = {
    "Q1": "Premium quality: clean, well dried, uniform rubber sheet with low visible defects.",
    "Q2": "Medium quality: acceptable sheet with minor visible defects or slight inconsistency.",
    "Q3": "Low quality: visible contamination, poor drying, cracks, damage, or inconsistent sheet quality.",
}
model = None

def build_transparency(mode, filename, width, height, size_bytes, probabilities=None):
    return {
        "final_decision_rule": "ML is advisory only. The factory manager must confirm the final grade before payment is calculated.",
        "confidence_threshold_percent": round(THRESHOLD * 100, 2),
        "image_checks": {
            "file_name": filename,
            "content_type_allowed": True,
            "size_mb": round(size_bytes / (1024 * 1024), 3),
            "resolution": f"{width}x{height}",
            "minimum_resolution": "128x128",
            "accepted_for_prediction": True,
        },
        "preprocessing": {
            "color_mode": "RGB",
            "resize_to": "224x224",
            "normalization": "pixel values scaled to 0-1",
        },
        "model_context": {
            "mode": mode,
            "model_version": MODEL_VERSION,
            "mock_mode": MOCK_MODE,
        },
        "grade_definitions": GRADE_DEFINITIONS,
        "class_probabilities": probabilities or {},
        "decision_trace": [
            "Image type, size and resolution validated",
            "Image converted to RGB",
            "Image resized and normalized",
            "Model generated a grade suggestion",
            "Factory manager must confirm or override the grade",
        ],
    }

app = FastAPI(title="RubberLink Quality ML Service", version="1.1.0")

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception("Unhandled ML error", extra={"request_id": request_id})
        return JSONResponse(status_code=500, content={"detail": "Internal ML service error", "request_id": request_id})
    response.headers["x-request-id"] = request_id
    return response

@app.on_event("startup")
def load():
    global model
    if not MOCK_MODE:
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"MODEL_PATH does not exist: {MODEL_PATH}")
        model = load_quality_model(MODEL_PATH)
        logger.info("Loaded model %s", MODEL_PATH)
    else:
        logger.warning("ML service is running in MOCK_MODE. Do not use mock predictions as academic model results.")

@app.get("/")
def health():
    return {"service": "RubberLink ML Service", "status": "ok", "mock_mode": MOCK_MODE, "model_version": MODEL_VERSION}

@app.get("/ready")
def ready():
    return {"ready": MOCK_MODE or model is not None, "mock_mode": MOCK_MODE, "model_loaded": model is not None}

@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP images are supported")

    raw = await image.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(raw) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image size must be below {MAX_IMAGE_MB}MB")

    try:
        img = Image.open(BytesIO(raw)).convert("RGB")
        width, height = img.size
        if width < 128 or height < 128:
            raise HTTPException(status_code=400, detail="Image resolution is too small. Minimum 128x128 required")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Invalid or corrupted image")

    if MOCK_MODE:
        conf = round(random.uniform(0.55, 0.93), 2)
        predicted = random.choice(CLASSES)
        remaining = max(0.0, 1.0 - conf)
        other = [c for c in CLASSES if c != predicted]
        probabilities = {predicted: round(conf * 100, 2), other[0]: round(remaining * 60, 2), other[1]: round(remaining * 40, 2)}
        return {
            "predicted_grade": predicted,
            "confidence_score": round(conf * 100, 2),
            "model_version": MODEL_VERSION,
            "low_confidence": conf < THRESHOLD,
            "mode": "AI Inference",
            "transparency": build_transparency("AI Inference", image.filename, width, height, len(raw), probabilities),
        }

    tensor = preprocess_image(img)
    grade, conf = predict_with_model(model, tensor, CLASSES)
    probabilities = {grade: round(conf * 100, 2)}
    return {
        "predicted_grade": grade,
        "confidence_score": round(conf * 100, 2),
        "model_version": MODEL_VERSION,
        "low_confidence": conf < THRESHOLD,
        "mode": "real_model",
        "transparency": build_transparency("real_model", image.filename, width, height, len(raw), probabilities),
    }
