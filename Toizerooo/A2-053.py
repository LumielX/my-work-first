name = input().strip()

name = name.replace(" ", "")

if len(name) == 0:
    print("Invalid")
    exit()

name = name[0].upper() + name[1:-1] + name[-1].upper()

first_char = name[0]
last_char = name[-1]

values = []

for i in range(1, 11):
    key = i - 1

    if i % 2 == 1:  # คี่
        val = ord(first_char) + key
    else:  # คู่
        val = ord(last_char) - key

    values.append(val)

total = sum(values)

result = total / len(name)

while result > 9:
    result /= 10

result_str = str(result).replace(".", "")

answer = result_str[-6:]

print(answer)