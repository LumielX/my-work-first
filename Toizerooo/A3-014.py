n = int(input())
H = [int(input()) for _ in range(n)]

H.sort()

left = 0
right = n - 1
days = 0

while left <= right:
    if H[left] + H[right] <= 18:
        left += 1
        right -= 1
    else:
        right -= 1
    days += 1

print(days)