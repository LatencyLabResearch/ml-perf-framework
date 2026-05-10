import os
import time
import subprocess

print("🚀 Starting System A - All 3 Instances...")
print("============================================\n")

base_path = os.getcwd()

# Function to start an instance
def start_instance(instance_id, port):
    print(f"Starting Instance {instance_id} (Port {port})...")

    env = os.environ.copy()
    env["PORT"] = str(port)
    env["INSTANCE_ID"] = str(instance_id)

    subprocess.Popen(
        ["cmd", "/k", "npm start"],
        cwd=base_path,
        env=env
    )

# Start all 3 instances
start_instance(1, 3000)
time.sleep(3)

start_instance(2, 3001)
time.sleep(3)

start_instance(3, 3002)

print("\n🎉 All 3 instances launched!")
print("Please wait 5-10 seconds for them to fully start.")