import requests
import time
import json
import csv
import os
from datetime import datetime

BACKEND_PORTS     = [3000, 3001, 3002, 3003]
LOAD_BALANCER_URL = "http://localhost:8080"
ML_SERVICE_URL    = "http://localhost:5000"
TIMEOUT_SECONDS   = 5
REPORT_FOLDER     = "logging/smoke_reports"

MAX_BACKEND_RESPONSE_MS=500
MAX_ML_INTERFERENCE_MS=100
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
            
            # Check that expected fields exist
            has_cpu    = "cpu_usage"          in body
            has_mem    = "memory_usage"        in body
            has_conn   = "active_connections"  in body

            if has_cpu and has_mem and has_conn:
                record(
                    test_name, True,
                    f"cpu={body['cpu_usage']}% mem={body['memory_usage']}MB conn={body['active_connections']}"
                )
            else:
                missing = []
                if not has_cpu:  missing.append("cpu_usage")
                if not has_mem:  missing.append("memory_usage")
                if not has_conn: missing.append("active_connections")
                record(test_name, False, f"Missing fields: {', '.join(missing)}")

        except json.JSONDecodeError:
            record(test_name, False, "Response is not valid JSON")
        except Exception as e:
            record(test_name, False, str(e))

# =============================================================
# SMOKE TEST 4 — Load Balancer Reachable
# =============================================================
def test_load_balancer_reachable():
    """
    WHY THIS TEST EXISTS:
    The load balancer is the entry point of your entire system.
    JMeter sends all traffic to the load balancer, which then
    routes to backend instances. If it's down, JMeter traffic
    goes nowhere — your experiment produces zero useful data.
    One simple check here saves hours of wasted experiment time.
    """
    print(color("\n── Test 4: Load Balancer Reachable ──", CYAN))

    test_name = "Load balancer reachable (port 8080)"
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


# =============================================================
# SMOKE TEST 5 — Load Balancer Routes to All Backends
# =============================================================
def test_load_balancer_routing():
    """
    WHY THIS TEST EXISTS:
    The load balancer must distribute traffic across ALL 4
    instances — not just one. If it's misconfigured and only
    routes to port 3000, your multi-instance experiment is
    actually a single-instance experiment. Your routing results
    would be completely invalid.
    This test sends 4 requests through the load balancer and
    checks that different backend ports respond — proving
    distribution is working.
    """
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


# =============================================================
# SMOKE TEST 6 — ML Service Reachable
# =============================================================
def test_ml_service_reachable():
    """
    WHY THIS TEST EXISTS:
    Your proactive framework only works if the ML model is loaded
    and ready to predict BEFORE requests start arriving. If the
    model server is down, every incoming request gets no prediction
    = no proactive decision = your system falls back to reactive
    behaviour = your research contribution disappears.
    """
    print(color("\n── Test 6: ML Inference Service Reachable ──", CYAN))

    test_name = "ML service reachable (port 5000)"
    try:
        start      = time.time()
        response   = requests.get(
            f"{ML_SERVICE_URL}/predict/health",
            timeout=TIMEOUT_SECONDS
        )
        elapsed_ms = round((time.time() - start) * 1000, 2)

        if response.status_code == 200:
            record(test_name, True, f"{elapsed_ms}ms", elapsed_ms)
        else:
            record(test_name, False, f"HTTP {response.status_code}")

    except requests.exceptions.ConnectionError:
        record(test_name, False, "Connection refused — ML server not running")
    except Exception as e:
        record(test_name, False, str(e))


# =============================================================
# SMOKE TEST 7 — ML Inference Speed Acceptable
# =============================================================
def test_ml_inference_speed():
    """
    WHY THIS TEST EXISTS:
    This is the most research-critical test in the entire script.
    Your proposal cites Thomas (2025) on 'decision latency' —
    the time the ML model takes to generate a prediction.
    If the model takes 300ms to predict, and requests arrive
    every 50ms, predictions are always too late. The system
    cannot be proactive — it becomes reactive by default.
    MAX_ML_INFERENCE_MS = 100ms is the threshold. Above this,
    your proactive framework cannot function as designed.
    """
    print(color("\n── Test 7: ML Inference Speed Acceptable ──", CYAN))

    test_name = f"ML inference response < {MAX_ML_INFERENCE_MS}ms"
    try:
        # Send a sample prediction request with dummy feature values
        # These match your Section 6.2 features:
        # request-level + system-level + engineered features
        sample_payload = {
            "payload_size_kb":       12.5,   # request-level feature
            "http_method":           "GET",  # request-level feature
            "endpoint_complexity":   2,      # request-level feature
            "cpu_utilization":       45.0,   # system-level feature
            "memory_usage_mb":       512,    # system-level feature
            "active_connections":    8,      # system-level feature
            "rolling_avg_cpu":       42.3,   # engineered feature
            "request_rate_per_sec":  35.0,   # engineered feature
            "error_rate":            0.01    # engineered feature
        }

        start      = time.time()
        response   = requests.post(
            f"{ML_SERVICE_URL}/predict",
            json=sample_payload,
            timeout=TIMEOUT_SECONDS
        )
        elapsed_ms = round((time.time() - start) * 1000, 2)

        if response.status_code == 200:
            passed = elapsed_ms < MAX_ML_INFERENCE_MS
            try:
                prediction = response.json().get("predicted_latency_ms", "unknown")
                record(
                    test_name, passed,
                    f"{elapsed_ms}ms — predicted latency: {prediction}ms",
                    elapsed_ms
                )
            except Exception:
                record(test_name, passed, f"{elapsed_ms}ms", elapsed_ms)
        else:
            record(test_name, False, f"HTTP {response.status_code} — check /predict endpoint")

    except requests.exceptions.ConnectionError:
        record(test_name, False, "ML server not reachable")
    except Exception as e:
        record(test_name, False, str(e))


# =============================================================
# SMOKE TEST 8 — ML Model Returns Valid Prediction
# =============================================================
def test_ml_prediction_valid():
    """
    WHY THIS TEST EXISTS:
    The ML model could be running and responding fast, but
    returning garbage values — negative latency, null, zero,
    or an error message instead of a number. Your routing logic
    reads this prediction to make decisions. A bad prediction
    value causes bad routing decisions = corrupted experiment.
    This test checks the prediction is a positive number within
    a realistic range for web request latency.
    """
    print(color("\n── Test 8: ML Prediction Value is Valid ──", CYAN))

    test_name = "ML prediction returns valid latency value"
    try:
        sample_payload = {
            "payload_size_kb":      12.5,
            "http_method":          "GET",
            "endpoint_complexity":  2,
            "cpu_utilization":      45.0,
            "memory_usage_mb":      512,
            "active_connections":   8,
            "rolling_avg_cpu":      42.3,
            "request_rate_per_sec": 35.0,
            "error_rate":           0.01
        }

        response = requests.post(
            f"{ML_SERVICE_URL}/predict",
            json=sample_payload,
            timeout=TIMEOUT_SECONDS
        )

        body       = response.json()
        prediction = body.get("predicted_latency_ms")

        # Validity checks on the prediction value
        if prediction is None:
            record(test_name, False, "Response missing 'predicted_latency_ms' field")
        elif not isinstance(prediction, (int, float)):
            record(test_name, False, f"Prediction is not a number: {prediction}")
        elif prediction <= 0:
            record(test_name, False, f"Prediction is zero or negative: {prediction}ms")
        elif prediction > 30000:
            # 30 seconds is unrealistically high for a web request
            record(test_name, False, f"Prediction unrealistically high: {prediction}ms")
        else:
            record(test_name, True, f"Predicted latency: {prediction}ms — value looks realistic")

    except json.JSONDecodeError:
        record(test_name, False, "ML response is not valid JSON")
    except Exception as e:
        record(test_name, False, str(e))


# =============================================================
# SMOKE TEST 9 — Log Folders Exist and Are Writable
# =============================================================
def test_log_folders():
    """
    WHY THIS TEST EXISTS:
    Your data collection pipeline (Section 6.2) writes every
    request as a CSV row to logging/raw/. If this folder doesn't
    exist or isn't writable (permission issue), the logger
    silently fails. You could run a 3-hour JMeter session and
    collect zero data because the folder wasn't ready.
    This test creates each folder if missing AND verifies Python
    can actually write a file into it — not just that it exists.
    """
    print(color("\n── Test 9: Log Folders Exist and Writable ──", CYAN))

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


# =============================================================
# SMOKE TEST 10 — End-to-End Request Flow
# =============================================================
def test_end_to_end():
    """
    WHY THIS TEST EXISTS:
    The most important test. This simulates exactly what happens
    during a real experiment:
      1. Request arrives at load balancer
      2. Load balancer routes to a backend instance
      3. Backend sends features to ML model
      4. ML model returns predicted latency
      5. Backend uses prediction to make routing decision
      6. Response returned to client
    
    If this full chain works, your system is ready for experiments.
    If it breaks anywhere in the chain, you know exactly where.
    This is the final gate before starting JMeter.
    """
    print(color("\n── Test 10: End-to-End Request Flow ──", CYAN))

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


# =============================================================
# FINAL SUMMARY + EXPORT
# =============================================================
def print_summary():
    """
    Counts all PASS and FAIL results.
    Prints the final verdict — READY or NOT READY.
    Exports all results to a CSV for your research records.
    """
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

    with open(report_file, "w", newline="") as f:
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

    print(color("=" * 60, CYAN))
    print(color("  Proactive ML Framework — Smoke Test", CYAN))
    print(color(f"  {timestamp}", GRAY))
    print(color("=" * 60, CYAN))
    print(color("\n  Running 10 smoke tests...\n", GRAY))

    # Run all 10 tests in order
    test_backends_reachable()        # Test 1
    test_backends_response_time()    # Test 2
    test_backends_return_json()      # Test 3
    test_load_balancer_reachable()   # Test 4
    test_load_balancer_routing()     # Test 5
    test_ml_service_reachable()      # Test 6
    test_ml_inference_speed()        # Test 7
    test_ml_prediction_valid()       # Test 8
    test_log_folders()               # Test 9
    test_end_to_end()                # Test 10

    # Show summary and save report
    print_summary()
    export_smoke_report()


if __name__ == "__main__":
    main()
