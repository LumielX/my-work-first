teams = ["MUN", "LIV", "NEW", "CHE"]
teams.sort()

points = {}
for team in teams:
    points[team] = 0

matches = []

for i in range(len(teams)):
    for j in range(i+1, len(teams)):
        matches.append((teams[i], teams[j]))

for team1, team2 in matches:
    a, b = map(int, input().split())

    if a > b:
        points[team1] += 3
    elif a < b:
        points[team2] += 3
    else:
        points[team1] += 1
        points[team2] += 1

ranking = sorted(points.items(), key=lambda x: (-x[1], x[0]))

for i in range(4):
    team, score = ranking[i]
    print(f"{i+1}. {team} {score}")