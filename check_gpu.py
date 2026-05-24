import torch
print("--- GPU CHECK ---")
available = torch.cuda.is_available()
print(f"CUDA Available: {available}")
if available:
    print(f"GPU Device: {torch.cuda.get_device_name(0)}")
    print(f"Device Count: {torch.cuda.device_count()}")
else:
    print("Device: CPU (No CUDA detected)")
print("-----------------")
