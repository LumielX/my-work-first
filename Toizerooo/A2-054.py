N, P = map(int, input().split())

grid = [list(map(int, list(input().strip()))) for _ in range(N)]

for row in grid:
    print("".join(map(str, row)))

row_sums = [sum(row) for row in grid]
for i in range(N):
    print("".join(map(str, grid[i])), row_sums[i])

col_sums = [0]*N
for j in range(N):
    for i in range(N):
        col_sums[j] += grid[i][j]
print(*col_sums)

badTilesRow = [row.count(0) for row in grid]
print(*badTilesRow)

badPointsCol = []
for j in range(N):
    count = 0
    for i in range(N):
        if grid[i][j] == 0:
            count += 1
    badPointsCol.append(count)
print(*badPointsCol)

totalBadTiles = sum(badTilesRow)
totalPoints = sum(row_sums)
totalFine = totalBadTiles * P

print(totalBadTiles, totalPoints)
print(f"{totalFine:.2f}")