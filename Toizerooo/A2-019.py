s = input()
s_upper = s.upper()

if "BUU" in s_upper:
    max_u = 0

    for i in range(len(s_upper)):
        if s_upper[i] == 'B':
            count = 0
            j = i + 1

            while j < len(s_upper) and s_upper[j] == 'U':
                count += 1
                j += 1

            if count >= 2:
                max_u = max(max_u, count)

    print("Yes", max_u)

elif 'B' in s_upper:
    index_b = s_upper.index('B')
    result = s[:index_b+1] + 'U' * (len(s) - index_b - 1)
    print(result)

else:
    result = ""
    while len(result) < len(s):
        result += "BUU"

    print(result[:len(s)])