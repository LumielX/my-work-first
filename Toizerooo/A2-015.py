# รับค่าจาก input
w, l, n = map(int, input().split())
price = int(input())

perimeter = 2 * (w + l)

total_length = perimeter * n

total_cost = total_length * price

print(total_length)
print(total_cost)