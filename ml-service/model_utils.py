import os
from pathlib import Path
try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None
    nn = None
    models = None
    transforms = None

CLASSES = ["Q1", "Q2", "Q3"]
IMG_SIZE = (224, 224)

if TORCH_AVAILABLE:
    transform = transforms.Compose([
        transforms.Resize(IMG_SIZE),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
else:
    transform = None

def build_mobilenet_for_inference():
    model = models.mobilenet_v2()
    in_features = model.last_channel
    model.classifier = nn.Sequential(
        nn.Dropout(0.25),
        nn.Linear(in_features, 64),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(64, len(CLASSES)),
    )
    return model

def load_quality_model(path):
    if not TORCH_AVAILABLE:
        raise RuntimeError("PyTorch is not installed")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}")
    model = build_mobilenet_for_inference()
    state_dict = torch.load(path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()
    return model

def predict_with_model(model, pil_image, classes):
    if not TORCH_AVAILABLE:
        raise RuntimeError("PyTorch is not installed")
    tensor = transform(pil_image).unsqueeze(0)
    with torch.no_grad():
        outputs = model(tensor)
        probs = torch.softmax(outputs, dim=1)[0].tolist()
    
    top_idx = int(torch.tensor(probs).argmax().item())
    probabilities = {cls: round(probs[i] * 100, 2) for i, cls in enumerate(classes)}
    predicted_grade = classes[top_idx]
    confidence = float(probs[top_idx])
    return predicted_grade, confidence, probabilities
