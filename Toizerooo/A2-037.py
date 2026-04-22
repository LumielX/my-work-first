from collections import deque

q = int(input())

emergency_queue = deque()
normal_queue = deque()

for _ in range(q):
    command = input().split()
    
    if command[0] == "ARRIVE":
        name = command[1]
        type_ = command[2]
        
        if type_ == "emergency":
            emergency_queue.append(name)
        else:
            normal_queue.append(name)
    
    elif command[0] == "TREAT":
        if emergency_queue:
            emergency_queue.popleft()
        elif normal_queue:
            normal_queue.popleft()
    
    elif command[0] == "SHOW":
        if not emergency_queue and not normal_queue:
            print("EMPTY")
        else:
            result = list(emergency_queue) + list(normal_queue)
            print(" ".join(result))