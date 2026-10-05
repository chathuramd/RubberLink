import json
import time
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models

CLASSES = ["Q1", "Q2", "Q3"]
IMG_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 10
LR = 1e-4

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "dataset"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Training on device: {device}")

# Data Transformations
train_transforms = transforms.Compose([
    transforms.Resize(IMG_SIZE),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.15, contrast=0.15),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_transforms = transforms.Compose([
    transforms.Resize(IMG_SIZE),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Datasets & Dataloaders
train_dataset = datasets.ImageFolder(str(DATA_DIR / "train"), transform=train_transforms)
val_dataset = datasets.ImageFolder(str(DATA_DIR / "validation"), transform=val_transforms)
test_dataset = datasets.ImageFolder(str(DATA_DIR / "test"), transform=val_transforms)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

print(f"Dataset summary: Train={len(train_dataset)}, Val={len(val_dataset)}, Test={len(test_dataset)}")
print(f"Classes: {train_dataset.classes}")

# Model Architecture: Pre-trained MobileNetV2
def build_mobilenet():
    try:
        model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    except Exception:
        model = models.mobilenet_v2(pretrained=True)
    
    # Freeze the base feature extractor
    for param in model.features.parameters():
        param.requires_grad = False
    
    # Custom classifier head
    in_features = model.last_channel
    model.classifier = nn.Sequential(
        nn.Dropout(0.25),
        nn.Linear(in_features, 64),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(64, len(CLASSES)),
    )
    return model

model = build_mobilenet().to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.classifier.parameters(), lr=LR)

history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}
best_val_acc = 0.0
best_model_path = MODELS_DIR / "rubber_quality_model.pt"

print("\n--- Starting MobileNetV2 Fine-Tuning ---")
start_time = time.time()

for epoch in range(1, EPOCHS + 1):
    # Training Phase
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    for inputs, labels in train_loader:
        inputs, labels = inputs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * inputs.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)
        
    epoch_train_loss = running_loss / total
    epoch_train_acc = correct / total

    # Validation Phase
    model.eval()
    val_loss, val_correct, val_total = 0.0, 0, 0
    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            val_loss += loss.item() * inputs.size(0)
            _, preds = torch.max(outputs, 1)
            val_correct += (preds == labels).sum().item()
            val_total += labels.size(0)

    epoch_val_loss = val_loss / (val_total or 1)
    epoch_val_acc = val_correct / (val_total or 1)

    history["train_loss"].append(round(epoch_train_loss, 4))
    history["train_acc"].append(round(epoch_train_acc * 100, 2))
    history["val_loss"].append(round(epoch_val_loss, 4))
    history["val_acc"].append(round(epoch_val_acc * 100, 2))

    print(f"Epoch [{epoch:02d}/{EPOCHS:02d}] "
          f"Train Loss: {epoch_train_loss:.4f} Acc: {epoch_train_acc*100:.2f}% | "
          f"Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc*100:.2f}%")

    if epoch_val_acc >= best_val_acc:
        best_val_acc = epoch_val_acc
        torch.save(model.state_dict(), best_model_path)

print(f"\nTraining completed in {time.time() - start_time:.1f}s")
print(f"Best model saved to: {best_model_path}")

# Evaluation Phase on Test Set
print("\n--- Evaluating Model on Test Set ---")
model.load_state_dict(torch.load(best_model_path, map_location=device))
model.eval()

all_preds = []
all_labels = []

with torch.no_grad():
    for inputs, labels in test_loader:
        inputs = inputs.to(device)
        outputs = model(inputs)
        _, preds = torch.max(outputs, 1)
        all_preds.extend(preds.cpu().tolist())
        all_labels.extend(labels.tolist())

# Native Confusion Matrix and Metrics
num_classes = len(CLASSES)
conf_matrix = [[0] * num_classes for _ in range(num_classes)]
for true_label, pred_label in zip(all_labels, all_preds):
    conf_matrix[true_label][pred_label] += 1

total_test = len(all_labels)
correct_test = sum(1 for t, p in zip(all_labels, all_preds) if t == p)
test_acc = correct_test / (total_test or 1)

per_class_metrics = {}
for i, class_name in enumerate(CLASSES):
    tp = conf_matrix[i][i]
    fp = sum(conf_matrix[r][i] for r in range(num_classes) if r != i)
    fn = sum(conf_matrix[i][c] for c in range(num_classes) if c != i)
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    per_class_metrics[class_name] = {
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1_score": round(f1, 3),
        "support": sum(conf_matrix[i]),
    }

metrics_summary = {
    "model_architecture": "MobileNetV2 (Transfer Learning)",
    "classes": CLASSES,
    "test_accuracy_percent": round(test_acc * 100, 2),
    "per_class_metrics": per_class_metrics,
    "confusion_matrix": conf_matrix,
    "training_history": history,
}

metrics_path = MODELS_DIR / "metrics.json"
metrics_path.write_text(json.dumps(metrics_summary, indent=2))
print(f"Test Accuracy: {test_acc * 100:.2f}%")
print(f"Metrics saved to: {metrics_path}")
print("Ready for live prediction!")
