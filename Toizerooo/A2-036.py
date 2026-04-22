num, query = map(int, input().split())

timeline = [0] * 1441

for _ in range(num):
    start, stop = map(int, input().split())
    timeline[start] += 1
    timeline[stop] -= 1

for i in range(1, 1441):
    timeline[i] += timeline[i-1]

queries = list(map(int, input().split()))

for q in queries:
    print(timeline[q], end=" ")