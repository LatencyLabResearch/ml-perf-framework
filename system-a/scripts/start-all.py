# scripts/start-all.py
import os
import time
import subprocess

print("🚀 Starting System A - Full Cluster")
print("============================================\n")

base_path = os.getcwd()

# -----------------------------------
# Start Nginx Load Balancer
# -----------------------------------
print("Starting Nginx Load Balancer (3000)...")

nginx_exe = r"C:\tools\nginx-1.31.1\nginx.exe"
nginx_conf = os.path.join(base_path, "nginx", "nginx.conf")

subprocess.Popen(
    [nginx_exe, "-c", nginx_conf],
    cwd=r"C:\tools\nginx-1.31.1"
)

time.sleep(2)

# -----------------------------------
# Start Backend Instances (unchanged)
# -----------------------------------
def start_instance(instance_id, port):
    print(f"Starting Instance {instance_id} (Port {port})...")
    env = os.environ.copy()
    env["PORT"] = str(port)
    env["INSTANCE_ID"] = f"instance-{instance_id}"
    subprocess.Popen(
        ["cmd", "/k", "npm start"],
        cwd=base_path,
        env=env
    )

start_instance(1, 3001)
time.sleep(2)

start_instance(2, 3002)
time.sleep(2)

start_instance(3, 3003)

print("\n🎉 Full cluster launched!")
print("Wait 5-10 seconds before testing.")