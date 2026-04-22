money = int(input())

if money < 100 or money > 20000 or money % 100 != 0:
    print("ERROR")
else:
    b1000 = money // 1000
    money = money % 1000

    b500 = money // 500
    money = money % 500

    b100 = money // 100

    if b1000 > 0:
        print("1000 =", b1000)
    if b500 > 0:
        print("500 =", b500)
    if b100 > 0:
        print("100 =", b100)