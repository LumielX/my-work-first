import heapq
import sys

def solve():
    data = sys.stdin.read().split()
    idx = 0
    
    R, C = int(data[idx]), int(data[idx+1])
    idx += 2

    grid = []
    for i in range(R):
        row = []
        for j in range(C):
            row.append(int(data[idx]))
            idx += 1
        grid.append(row)

    N = int(data[idx]); idx += 1
    
    results = []
    
    for _ in range(N):
        sr, sc = int(data[idx]), int(data[idx+1])  # ต้นทาง
        er, ec = int(data[idx+2]), int(data[idx+3])  # ปลายทาง
        idx += 4

        INF = float('inf')
        dist = [[INF] * C for _ in range(R)]
        dist[sr][sc] = grid[sr][sc]
        
        pq = [(grid[sr][sc], sr, sc)]
        
        directions = [(-1,0),(1,0),(0,-1),(0,1)]
        
        while pq:
            cost, r, c = heapq.heappop(pq)
            
            if cost > dist[r][c]:
                continue
            
            if r == er and c == ec:
                break
            
            for dr, dc in directions:
                nr, nc = r + dr, c + dc
                if 0 <= nr < R and 0 <= nc < C:
                    new_cost = cost + grid[nr][nc]
                    if new_cost < dist[nr][nc]:
                        dist[nr][nc] = new_cost
                        heapq.heappush(pq, (new_cost, nr, nc))
        
        ans = dist[er][ec]
        if ans == INF:
            results.append("0%")
        else:
            results.append(f"{ans}%")
    
    print('\n'.join(results))

solve()