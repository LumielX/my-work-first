n = int(input())
h = list(map(int, input().split()))

count = 0
for i in range(n):
    ok = True
    if i > 0 and h[i-1] >= h[i]:
        ok = False
    if i < n-1 and h[i+1] >= h[i]:
        ok = False
    if ok:
        count += 1

print(count)