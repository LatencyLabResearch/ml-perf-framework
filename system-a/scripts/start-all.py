import os
import time
import subprocess

print("Starting System A - Full Cluster")
print("============================================\n")

base_path = os.getcwd()

# For Nginx run can comment this section
# -----------------------------------
# Start Load Balancer
# -----------------------------------

print("Starting Load Balancer (3000)...")

lb_env = os.environ.copy()
lb_env["LB_PORT"] = "3000"

subprocess.Popen(
    ["cmd", "/k", "node src/loadbalancer/lb.js"],
    cwd=base_path,
    env=lb_env
)

time.sleep(3)

# -----------------------------------
# Start Backend Instances
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
time.sleep(3)

start_instance(2, 3002)
time.sleep(3)

start_instance(3, 3003)

print("\n🎉 Full cluster launched!")
print("Wait 5-10 seconds before testing.")