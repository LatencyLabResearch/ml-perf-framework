import requests
import random
import concurrent.futures

print("============================================\n")
print("🧪 Running Edge Case + Stress Tests")
print("============================================\n")

base_url = "http://localhost:3000"

# =============================================
# Core Test Function
# =============================================
def test_endpoint(name, method, url, body=None, expected_status=200):
    print(f"\n➡️  {name}")

    try:
        if method == "GET":
            response = requests.get(url, timeout=10)

        elif method == "POST":
            response = requests.post(
                url,
                json=body if isinstance(body, dict) else None,
                data=body if isinstance(body, str) else None,
                headers={"Content-Type": "application/json"},
                timeout=10
            )

        else:
            print("   ❌ Unsupported Method")
            return

        if response.status_code == expected_status:
            print(f"   ✅ Passed ({response.status_code})")
        else:
            print(f"   ⚠️ Unexpected Status: {response.status_code}")

    except Exception as e:
        print(f"   ❌ Failed ({str(e)})")


# =============================================
# 1. NORMAL TESTS
# =============================================
print("\n================ NORMAL TESTS ================")

test_endpoint(
    "Light Endpoint",
    "GET",
    f"{base_url}/api/light"
)

test_endpoint(
    "Moderate Endpoint",
    "POST",
    f"{base_url}/api/moderate",
    {}
)

test_endpoint(
    "Heavy Endpoint",
    "POST",
    f"{base_url}/api/heavy",
    {"n": 35}
)

# =============================================
# 2. EDGE CASE TEST MATRIX
# =============================================
print("\n================ EDGE CASES ================")

edge_cases = [
    {
        "name": "Large Payload (500KB)",
        "method": "POST",
        "url": f"{base_url}/api/moderate",
        "body": {"data": "x" * 500000},
        "expected": 200
    },
    {
        "name": "Empty Body",
        "method": "POST",
        "url": f"{base_url}/api/moderate",
        "body": {},
        "expected": 200
    },
    {
        "name": "Invalid JSON",
        "method": "POST",
        "url": f"{base_url}/api/moderate",
        "body": "invalid json",
        "expected": 400
    },
    {
        "name": "404 Not Found",
        "method": "GET",
        "url": f"{base_url}/api/not-exist",
        "expected": 404
    },
    {
        "name": "Heavy Fibonacci (n=40)",
        "method": "POST",
        "url": f"{base_url}/api/heavy",
        "body": {"n": 40},
        "expected": 200
    }
]

for test in edge_cases:
    test_endpoint(
        test["name"],
        test["method"],
        test["url"],
        test.get("body"),
        test.get("expected", 200)
    )

# =============================================
# 3. RANDOMIZED STRESS TEST
# =============================================
print("\n================ RANDOM STRESS ================")

for _ in range(20):
    n = random.randint(25, 45)

    try:
        requests.post(
            f"{base_url}/api/heavy",
            json={"n": n},
            timeout=10
        )
    except:
        pass

print("   ✅ Random stress completed")

# =============================================
# 4. CONCURRENT LOAD TEST
# =============================================
print("\n================ CONCURRENT LOAD ================")
print("🔥 Sending 50 parallel requests...")


def send_parallel_request():
    try:
        requests.get(
            f"{base_url}/api/light",
            timeout=10
        )
    except:
        pass


with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
    futures = [executor.submit(send_parallel_request) for _ in range(50)]

    for future in concurrent.futures.as_completed(futures):
        pass

print("   ✅ Concurrent load completed")

# =============================================
# 5. FINAL RESULT
# =============================================
print("\n🎉 ALL EDGE CASE TESTS COMPLETED")