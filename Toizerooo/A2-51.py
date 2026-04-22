N, M = map(int, input().split())

if not (1 <= N <= 10 and 1 <= M <= 20):
    print("Data Incorrect")
else:
    teams = []

    for i in range(N):
        scores = list(map(int, input().split()))

        if len(scores) != M:
            print("Data Incorrect")
            exit()

        teams.append(scores)

    total_all = 0

    for i in range(N):
        team = teams[i]

        total = sum(team)
        avg = total / M
        max_score = max(team)

        total_all += total

        print(f"Team {i+1}: Average = {avg:.2f}, Max = {max_score}")

    print(f"Total Score of All Teams = {total_all}")