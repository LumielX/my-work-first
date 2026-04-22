T = int(input())

vowels = "aeiou"

for line_num in range(1, T+1):
    text = input()
    
    total_vowels = 0
    current = 0
    max_consecutive = 0
    
    for ch in text:
        if ch.lower() in vowels:
            total_vowels += 1
            current += 1
            max_consecutive = max(max_consecutive, current)
        else:
            current = 0
    
    print(f"Line {line_num}: vowels = {total_vowels}, max_consecutive = {max_consecutive}")