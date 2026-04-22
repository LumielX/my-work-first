import heapq

N, K = map(int, input().split())

graph = [[] for _ in range(2*N + 1)]

def nodeA(i): return i
def nodeB(i): return i + N

for _ in range(K):
    u, v, w = map(int, input().split())
    graph[nodeA(u)].append((nodeA(v), w))
    graph[nodeA(v)].append((nodeA(u), w))

for _ in range(K):
    u, v, w = map(int, input().split())
    graph[nodeB(u)].append((nodeB(v), w))
    graph[nodeB(v)].append((nodeB(u), w))

for _ in range(N):
    i, w = map(int, input().split())
    graph[nodeA(i)].append((nodeB(i), w))
    graph[nodeB(i)].append((nodeA(i), w))

INF = int(1e18)
dist = [INF] * (2*N + 1)

start = nodeA(1)
dist[start] = 0

pq = [(0, start)]

while pq:
    d, u = heapq.heappop(pq)
    if d > dist[u]:
        continue

    for v, w in graph[u]:
        if dist[v] > d + w:
            dist[v] = d + w
            heapq.heappush(pq, (dist[v], v))

ans = min(dist[nodeA(N)], dist[nodeB(N)])
print(ans)