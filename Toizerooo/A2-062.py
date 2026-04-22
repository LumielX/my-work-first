text = input().lower()

count = {
    'a': 0,
    'e': 0,
    'i': 0,
    'o': 0,
    'u': 0
}

for ch in text:
    if ch in count:
        count[ch] += 1

for vowel in ['a', 'e', 'i', 'o', 'u']:
    if count[vowel] > 0:
        print(f"{vowel}: {count[vowel]}")