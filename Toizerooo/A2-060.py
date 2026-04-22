n = int(input())
data = [tuple(map(int, input().split())) for _ in range(n)]

x1, y1, d1 = data[0]
x2, y2, d2 = data[1]
x3, y3, d3 = data[2]

A1 = 2*(x2 - x1)
B1 = 2*(y2 - y1)
C1 = d1**2 - d2**2 + x2**2 - x1**2 + y2**2 - y1**2

A2 = 2*(x3 - x2)
B2 = 2*(y3 - y2)
C2 = d2**2 - d3**2 + x3**2 - x2**2 + y3**2 - y2**2

det = A1*B2 - A2*B1

Tx = (C1*B2 - C2*B1) // det
Ty = (A1*C2 - A2*C1) // det

print(Tx, Ty)