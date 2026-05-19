import requests
import csv
import os
import glob
import time
from datetime import datetime

BACKEND_PORTS     = [3000, 3001, 3002, 3003]  # want to consider our backend ports #
LOAD_BALANCER_URL = "http://localhost:8080/health" # want to check ur load balancer url
ML_SERVICE_URL    = "http://localhost:5000/predict/health" # ml model server's health end point 
LOG_FOLDER        = "logging/raw"
METRICS_FOLDER    = "logging/metrics"
REPORT_FOLDER     = "logging/health_reports"
DATASET_MIN       = 150_000 
DATASET_MAX       = 300_000
TIMEOUT_SECONDS   = 5

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
GRAY   = "\033[90m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def color(text, c): 
    return f"{c}{text}{RESET}"

def print_header(title):
    line = "=" * 60
    print(f"\n{color(line, CYAN)}")
    print(f"{color(f'  {title}', CYAN)}")
    print(f"{color(line, CYAN)}")

def print_section(title):
    print(f"\n{color(f'── {title} ──', YELLOW)}")

def print_status(label, status, detail=""):
    padding = " " * max(1, 30 - len(label))
    status_color = {
        "Healthy":       GREEN,
        "Degraded":      YELLOW,
        "Not Responding":RED,
        "Error":         RED,
    }.get(status, RESET)
    detail_str = f"  {color(detail, GRAY)}" if detail else ""
    print(f"  {label}{padding}{color(f'[{status}]', status_color)}{detail_str}")

def check_instances():
    print_section("Backend Instance Status")

    healthy_count  = 0
    instance_stats = []

    for port in BACKEND_PORTS:
        label = f"Instance (port {port})"
        try:
            start    = time.time()
            response = requests.get(
                f"http://localhost:{port}/health",
                timeout=TIMEOUT_SECONDS
            )
            elapsed_ms = round((time.time() - start) * 1000, 2)

            if response.status_code == 200:
                healthy_count += 1
                detail = f"Response: {elapsed_ms}ms"

                try:
                    body = response.json()
                    if "cpu_usage"          in body: detail += f"  CPU: {body['cpu_usage']}%"
                    if "memory_usage"       in body: detail += f"  MEM: {body['memory_usage']}MB"
                    if "active_connections" in body: detail += f"  Conn: {body['active_connections']}"
                except Exception:
                    pass

                print_status(label, "Healthy", detail)
                instance_stats.append({
                    "port": port, "status": "Healthy",
                    "response_ms": elapsed_ms, "checked_at": datetime.now()
                })

            else:
                print_status(label, "Degraded", f"HTTP {response.status_code}")
                instance_stats.append({
                    "port": port, "status": "Degraded",
                    "response_ms": elapsed_ms, "checked_at": datetime.now()
                })

        except requests.exceptions.ConnectionError:
            print_status(label, "Not Responding", "Connection refused — instance may be offline")
            instance_stats.append({
                "port": port, "status": "Not Responding",
                "response_ms": -1, "checked_at": datetime.now()
            })
        except requests.exceptions.Timeout:
            print_status(label, "Not Responding", f"Timed out after {TIMEOUT_SECONDS}s")
            instance_stats.append({
                "port": port, "status": "Not Responding",
                "response_ms": -1, "checked_at": datetime.now()
            })

    return healthy_count, instance_stats


def check_load_balancer():
   
    print_section("Load Balancer Check (port 8080)")
    try:
        response = requests.get(LOAD_BALANCER_URL, timeout=TIMEOUT_SECONDS)
        if response.status_code == 200:
            print_status("Load Balancer", "Healthy", "HTTP 200")
        else:
            print_status("Load Balancer", "Degraded", f"HTTP {response.status_code}")
    except Exception:
        print_status("Load Balancer", "Not Responding", "Check nginx/HAProxy config")

# ── 4. Log File Summary ────────────────────────────────────────
def check_logs():
   
    print_section("Log File Summary")

    if os.path.exists(LOG_FOLDER):
        csv_files = sorted(
            glob.glob(f"{LOG_FOLDER}/*.csv"),
            key=os.path.getmtime, reverse=True
        )
        if csv_files:
            print(f"  {color(f'Raw request logs found: {len(csv_files)} file(s)', GREEN)}")
            for f in csv_files[:5]:
                size_kb   = round(os.path.getsize(f) / 1024, 1)
                mod_time  = datetime.fromtimestamp(os.path.getmtime(f)).strftime("%Y-%m-%d %H:%M:%S")
                print(f"  {color(f'  {os.path.basename(f)}  |  {mod_time}  |  {size_kb} KB', GRAY)}")
            if len(csv_files) > 5:
                print(f"  {color(f'  ... and {len(csv_files) - 5} more file(s)', GRAY)}")

            # Row count for latest file
            try:
                with open(csv_files[0], "r") as f:
                    row_count = sum(1 for _ in f) - 1  # subtract header
                print(f"  {color(f'Latest file row count: {row_count} request records', CYAN)}")
            except Exception:
                pass
        else:
            print(f"  {color('Log folder exists but no CSV files found.', YELLOW)}")
    else:
        print(f"  {color(f'Log folder \'{LOG_FOLDER}\' not found. Data collection not started yet.', YELLOW)}")

    if os.path.exists(METRICS_FOLDER):
        metric_files = glob.glob(f"{METRICS_FOLDER}/*.csv")
        print(f"  {color(f'Metrics logs: {len(metric_files)} file(s) in \'{METRICS_FOLDER}\'', GRAY)}")
    else:
        print(f"  {color(f'Metrics folder \'{METRICS_FOLDER}\' not found.', YELLOW)}")


# ── 5. Dataset Collection Progress ────────────────────────────
def check_dataset_progress():
   
    print_section("Dataset Collection Progress")

    total_rows = 0
    if os.path.exists(LOG_FOLDER):
        for filepath in glob.glob(f"{LOG_FOLDER}/*.csv"):
            try:
                with open(filepath, "r") as f:
                    total_rows += sum(1 for _ in f) - 1  # subtract header row
            except Exception:
                pass

    progress_pct = min(100.0, round((total_rows / DATASET_MIN) * 100, 1))
    bar_filled   = int(progress_pct / 5)
    bar_empty    = 20 - bar_filled
    bar          = "[" + ("█" * bar_filled) + ("░" * bar_empty) + "]"

    bar_color = GREEN if progress_pct >= 100 else (YELLOW if progress_pct >= 50 else RED)

    print(f"  Total records collected : {color(str(total_rows), BOLD)}")
    print(f"  Target range            : {color(f'{DATASET_MIN:,} – {DATASET_MAX:,}', GRAY)}")
    print(f"  Progress to min target  : {color(f'{bar} {progress_pct}%', bar_color)}")

    # Advice based on progress
    if total_rows == 0:
        print(f"  {color('► Start workload simulation with JMeter to begin collection.', YELLOW)}")
    elif total_rows < DATASET_MIN * 0.3:
        print(f"  {color('► Keep running experiments. Try burst and peak load scenarios.', YELLOW)}")
    elif total_rows < DATASET_MIN:
        print(f"  {color('► Good progress. Continue with mixed load scenarios.', CYAN)}")
    else:
        print(f"  {color('✔ Sufficient data for model training. Consider starting ML phase.', GREEN)}")

    return total_rows


def export_health_report(instance_stats):
    
    os.makedirs(REPORT_FOLDER, exist_ok=True)
    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"{REPORT_FOLDER}/health_{timestamp}.csv"

    with open(report_file, "w", newline="",encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["port", "status", "response_ms", "checked_at"])
        writer.writeheader()
        writer.writerows(instance_stats)

    print(f"\n  {color(f'Health report saved to: {report_file}', GRAY)}")


def main():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print_header("Proactive ML Framework — System Health Check")
    print(f"  {color(f'Timestamp  : {timestamp}', GRAY)}")
    print(f"  {color(f'Instances  : {len(BACKEND_PORTS)} backend instances monitored', GRAY)}")

    healthy_count, instance_stats = check_instances()
    check_load_balancer()
    check_logs()
    total_rows = check_dataset_progress()

    print_header("Health Check Summary")
    if healthy_count == len(BACKEND_PORTS):
        print(f"  {color(f'✔  All {len(BACKEND_PORTS)} backend instances are HEALTHY', GREEN)}")
    elif healthy_count > 0:
        print(f"  {color(f'⚠  {healthy_count} of {len(BACKEND_PORTS)} instances running — check failing nodes', YELLOW)}")
    else:
        print(f"  {color('✖  No instances responding — system may be offline', RED)}")

    print(f"\n  {color(f'Health check completed at {timestamp}', GRAY)}")
    print(color("=" * 60, CYAN))

    export_health_report(instance_stats)


if __name__ == "__main__":
    main()
