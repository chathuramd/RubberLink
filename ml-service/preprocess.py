import numpy as np
IMAGE_SIZE=(224,224)
def preprocess_image(pil_image):
    img=pil_image.resize(IMAGE_SIZE)
    arr=np.asarray(img).astype("float32")/255.0
    return np.expand_dims(arr,0)
