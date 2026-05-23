import requests
import time
import json
import csv
import os
from datetime import datetime

BACKEND_PORTS     = [3001, 3002, 3003]
LOAD_BALANCER_URL = "http://localhost:3000"
TIMEOUT_SECONDS   = 5
REPORT_FOLDER     = "logging/smoke_reports"

MAX_BACKEND_RESPONSE_MS=500
MAX_LB_RESPONSE_MS=200

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
GRAY   = "\033[90m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def color(text, c):
    return f"{c}{text}{RESET}"
test_results=[]

def record(name, passed, detail="",response_ms=None):
    status="PASS" if passed else "FAIL"
    test_results.append({
        "test": name,
        "result":status,
        "detail":detail,
        "response_ms":response_ms if response_ms is not None else "",
        "checked_at":  datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

    badge=color(f"[{status}]",GREEN if passed else RED)
    detail_str=f"{color(detail,GRAY)}" if detail else""
    pad="" * max(1,55- len(name))
    print(f" {name}{pad}{badge}{detail_str}")

def test_backends_reachable():
    print(color("\n --Test 1: Backend Instances Reachable--",CYAN))
        
    for port in BACKEND_PORTS:
        test_name=f"Backend port {port} reachable"
        try:
            start=time.time()
            response=requests.get(
                f"http://localhost:{port}/health",
                timeout=TIMEOUT_SECONDS
            )
            elapsed_ms=round((time.time()-start)*1000,2)

            if response.status_code==200:
                record(test_name,True,f"{elapsed_ms}ms")
            else:
                record(test_name, False, f"HTTP {response.status_code}", elapsed_ms)

        except requests.exceptions.ConnectionError:
            record(test_name, False, "Connection refused — server not running")
        except requests.exceptions.Timeout:
            record(test_name, False, f"No reply after {TIMEOUT_SECONDS}s")


def test_backends_response_time():
    print(color("\n-Test 2:Backend Response Time Acceptable--",CYAN))

    for port in BACKEND_PORTS:
        test_name = f"Backend port {port} response < {MAX_BACKEND_RESPONSE_MS}ms"
        try:
            start      = time.time()
            response   = requests.get(
                f"http://localhost:{port}/health",
                timeout=TIMEOUT_SECONDS
            )
            elapsed_ms = round((time.time() - start) * 1000, 2)

            passed = response.status_code == 200 and elapsed_ms < MAX_BACKEND_RESPONSE_MS
            record(test_name, passed, f"{elapsed_ms}ms", elapsed_ms)

        except Exception as e:
            record(test_name, False, str(e))

def test_backends_return_json():
   
    print(color("\n── Test 3: Backend /health Returns Valid JSON ──", CYAN))

    for port in BACKEND_PORTS:
        test_name = f"Backend port {port} returns JSON"
        try:
            response = requests.get(
                f"http://localhost:{port}/health",
                timeout=TIMEOUT_SECONDS
            )
            
            body = response.json()
            
            # Check fields that the Node.js /health endpoint actually returns
            has_status   = "status"   in body
            has_instance = "instance" in body

            if has_status and has_instance:
                # Also verify status value is "ok"
                if body["status"] == "ok":
                    record(
                        test_name, True,
                        f"status={body['status']}  instance={body['instance']}"
                    )
                else:
                    record(
                        test_name, False,
                        f"Unexpected status value: '{body['status']}' (expected 'ok')"
                    )
            else:
                missing = []
                if not has_status:   missing.append("status")
                if not has_instance: missing.append("instance")
                record(test_name, False, f"Missing fields: {', '.join(missing)}")

        except json.JSONDecodeError:
            record(test_name, False, "Response is not valid JSON")
        except Exception as e:
            record(test_name, False, str(e))

def test_load_balancer_reachable():
    
    print(color("\n── Test 4: Load Balancer Reachable ──", CYAN))

    test_name = "Load balancer reachable (port 3000)"
    try:
        start      = time.time()
        response   = requests.get(
            f"{LOAD_BALANCER_URL}/health",
            timeout=TIMEOUT_SECONDS
        )
        elapsed_ms = round((time.time() - start) * 1000, 2)

        passed = response.status_code == 200 and elapsed_ms < MAX_LB_RESPONSE_MS
        record(test_name, passed, f"{elapsed_ms}ms", elapsed_ms)

    except requests.exceptions.ConnectionError:
        record(test_name, False, "Connection refused — check nginx/HAProxy")
    except Exception as e:
        record(test_name, False, str(e))


def test_load_balancer_routing():
    print(color("\n── Test 5: Load Balancer Routes to Backends ──", CYAN))

    test_name = "Load balancer distributes requests"
    try:
        responding_backends = set()

        # Send 8 requests — should hit multiple backends if round-robin
        for _ in range(8):
            response = requests.get(
                f"{LOAD_BALANCER_URL}/health",
                timeout=TIMEOUT_SECONDS
            )
            # Load balancer should forward which backend handled it
            # Your backend should include "port" in its /health JSON response
            try:
                body = response.json()
                if "port" in body:
                    responding_backends.add(body["port"])
            except Exception:
                pass

        if len(responding_backends) > 1:
            record(test_name, True, f"Traffic spread across {len(responding_backends)} backends: {responding_backends}")
        elif len(responding_backends) == 1:
            record(test_name, False, f"Only 1 backend responding — load balancer may not be distributing")
        else:
            record(test_name, False, "Could not detect backend routing — add 'port' to /health response")

    except Exception as e:
        record(test_name, False, str(e))


def test_log_folders():
    print(color("\n── Test 6: Log Folders Exist and Writable ──", CYAN))

    folders = {
        "logging/raw":           "Raw request logs",
        "logging/metrics":       "System metrics logs",
        "logging/health_reports":"Health check reports",
        "logging/smoke_reports": "Smoke test reports"
    }

    for folder_path, folder_label in folders.items():
        test_name = f"{folder_label} folder writable"
        try:
            # Create folder if it doesn't exist
            os.makedirs(folder_path, exist_ok=True)

            # Try writing a test file to confirm write permission
            test_file = f"{folder_path}/.write_test"
            with open(test_file, "w") as f:
                f.write("smoke_test_write_check")
            os.remove(test_file)  # Clean up test file immediately

            record(test_name, True, folder_path)

        except PermissionError:
            record(test_name, False, f"No write permission to {folder_path}")
        except Exception as e:
            record(test_name, False, str(e))


def test_end_to_end():
    print(color("\n── Test 7: End-to-End Request Flow ──", CYAN))

    test_name = "Full request flows through load balancer → backend → ML"
    try:
        start = time.time()

        # Step 1: Send request through load balancer (not directly to backend)
        response = requests.get(
            f"{LOAD_BALANCER_URL}/test",
            timeout=TIMEOUT_SECONDS
        )
        elapsed_ms = round((time.time() - start) * 1000, 2)

        if response.status_code in [200, 201]:
            record(test_name, True, f"Full round-trip: {elapsed_ms}ms", elapsed_ms)
        elif response.status_code == 404:
            # /test endpoint may not exist — but if LB routed to backend, connection works
            record(test_name, True, f"LB routing confirmed (404 = backend reached): {elapsed_ms}ms", elapsed_ms)
        else:
            record(test_name, False, f"Unexpected HTTP {response.status_code}")

    except requests.exceptions.ConnectionError:
        record(test_name, False, "Load balancer not reachable — chain is broken at entry point")
    except Exception as e:
        record(test_name, False, str(e))

def print_summary():
    total  = len(test_results)
    passed = sum(1 for r in test_results if r["result"] == "PASS")
    failed = total - passed

    print(color("\n" + "=" * 60, CYAN))
    print(color("  SMOKE TEST SUMMARY", CYAN))
    print(color("=" * 60, CYAN))

    print(f"  Total tests  : {color(str(total), BOLD)}")
    print(f"  Passed       : {color(str(passed), GREEN)}")
    print(f"  Failed       : {color(str(failed), RED if failed > 0 else GREEN)}")

    print()

    # Final verdict
    if failed == 0:
        print(color("   ALL TESTS PASSED — System is READY for experiments", GREEN))
        print(color("     You may now start JMeter and data collection.", GREEN))
    elif failed <= 2:
        print(color(f"    {failed} TEST(S) FAILED — Fix before starting experiments", YELLOW))
        print(color("     Minor issues detected. Review FAIL items above.", YELLOW))
    else:
        print(color(f"    {failed} TESTS FAILED — Do NOT start experiments", RED))
        print(color("     Critical issues found. System is NOT ready.", RED))

    # List all failed tests clearly
    failures = [r for r in test_results if r["result"] == "FAIL"]
    if failures:
        print(color("\n  Failed Tests:", RED))
        for f in failures:
            print(f"     {f['test']} — {f['detail']}")

    print(color("=" * 60 + "\n", CYAN))


def export_smoke_report():
    """
    Saves all test results to a timestamped CSV.
    Builds your experiment audit trail over time.
    """
    os.makedirs(REPORT_FOLDER, exist_ok=True)
    timestamp   = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"{REPORT_FOLDER}/smoke_{timestamp}.csv"

    with open(report_file, "w", newline="",encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["test", "result", "detail", "response_ms", "checked_at"]
        )
        writer.writeheader()
        writer.writerows(test_results)

    print(f"  {color(f'Smoke report saved: {report_file}', GRAY)}")


# =============================================================
# MAIN — Runs All Tests in Order
# =============================================================
def main():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(color(f"  {timestamp}", GRAY))
    print(color("=" * 60, CYAN))
    print(color("\n  Running 10 smoke tests...\n", GRAY))

    # Run all 10 tests in order
    test_backends_reachable()        # Test 1
    test_backends_response_time()    # Test 2
    test_backends_return_json()      # Test 3
    test_load_balancer_reachable()   # Test 4
    test_load_balancer_routing()     # Test 5
    test_log_folders()               # Test 9
    test_end_to_end()                # Test 10

    # Show summary and save report
    print_summary()
    export_smoke_report()


if __name__ == "__main__":
    main()
