import sys
import traceback

try:
    print("Testing imports and loading...")
    from main import app
    print("Successfully loaded main.py and all dependencies!")
    sys.exit(0)
except Exception as e:
    print("Failed to load backend:")
    traceback.print_exc()
    sys.exit(1)
