import subprocess
import time
import os

print("🚀 System A - Quick Start")
print("============================================\n")

# Kill old node processes
print("Stopping any running instances...")

try:
    # subprocess.run(
    #     ["taskkill", "/F", "/IM", "node.exe"],
    #     stdout=subprocess.DEVNULL,
    #     stderr=subprocess.DEVNULL
    # )
    subprocess.run(["nginx", "-s", "stop"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
except:
    pass

try:
    subprocess.run(["taskkill", "/F", "/IM", "node.exe"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
except:
    pass

time.sleep(2)

# Start all 3 instances
print("Starting 3 instances...")

subprocess.run(["python", "scripts/start-all.py"])

time.sleep(6)

# Run Health Check
print("\nRunning Health Check...")

subprocess.run(["python", "scripts/health-script.py"])

# Run Smoke Test
print("\nRunning Smoke Test...")

subprocess.run(["python", "scripts/smoke_test.py"])

print("\n🎉 Quick Start Completed Successfully!")
print("You can now start the full system with just one command:")
print("python scripts/quick-start.py")