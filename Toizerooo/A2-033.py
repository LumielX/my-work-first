i = input()
o = input()

ih, im = map(int, i.split('.'))
oh, om = map(int, o.split('.'))

if not (0 <= ih <= 23 and 0 <= oh <= 23 and 0 <= im <= 59 and 0 <= om <= 59):
    print("ERROR")
    exit()

if (oh * 60 + om) <= (ih * 60 + im):
    print("ERROR")
    exit()

start = ih * 60 + im
end = oh * 60 + om
diff = end - start

if diff < 15:
    print("FREE")
    exit()

hours = diff // 60
if diff % 60 != 0:
    hours += 1

if hours == 1:
    cost = 25
elif hours == 2:
    cost = 50
elif hours == 3:
    cost = 80
elif hours == 4:
    cost = 110
elif hours == 5:
    cost = 145
elif hours == 6:
    cost = 180
else:
    cost = 250

print(cost)