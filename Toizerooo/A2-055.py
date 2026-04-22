n = int(input())
temps = list(map(float, input().split()))

total = sum(temps)

avg = total / n

sorted_temps = sorted(temps)

if n % 2 == 1:
    median = sorted_temps[n // 2]
else:
    median = (sorted_temps[n//2 - 1] + sorted_temps[n//2]) / 2

mx = max(temps)
mn = min(temps)

alert = 0
for t in temps:
    if t >= 37:
        alert += 1

print(f"SUM={total:.2f}")
print(f"AVG={avg:.2f}")
print(f"MEDIAN={median:.2f}")
print(f"MAX={mx:.2f}")
print(f"MIN={mn:.2f}")
print(f"ALERT={alert}")

print("SORTED=" + " ".join(f"{x:.2f}" for x in sorted_temps))