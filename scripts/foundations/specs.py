SPECS = [
    # ── 1 programs are instructions ──
    {"name": "morning", "code": '''
print("Wake up")
print("Brush teeth")
print("Eat breakfast")
''', "notes": {1: "Line 1 ran: Wake up appears in the output. Next comes line 2, never line 3 first."}},
    {"name": "comment", "code": '''
print("Wake up")
# print("Snooze")
print("Coffee")
print("Work")
''', "notes": {1: "Line 1 ran. Line 2 starts with #, so it's a comment, a note for humans: Python skips it and goes straight to line 3."}},

    # ── 3 variables ──
    {"name": "boxes", "code": '''
name = "Ada"
age = 36
age = age + 1
print(name, age)
''', "notes": {
        1: "A box labelled name now holds the text \"Ada\".",
        3: "Python worked out the right side first (36 + 1 = 37), then put 37 in the age box. The old 36 is gone.",
    }},
    {"name": "copyint", "code": '''
a = 3
b = a
a = 10
print(b)
''', "notes": {
        2: "b gets a copy of what's in a right now: 3. The two boxes aren't linked.",
        3: "Only the a box changes. b still holds 3.",
    }},
    {"name": "badswap", "code": '''
a = 1
b = 2
a = b
b = a
print(a, b)
''', "notes": {
        3: "a now holds 2, and the 1 that was in it is lost for good.",
        4: "b gets a copy of a, which is already 2. Both boxes hold 2.",
    }},
    {"name": "goodswap", "code": '''
a = 1
b = 2
temp = a
a = b
b = temp
print(a, b)
''', "notes": {
        3: "Before anything is overwritten, temp keeps a copy of a's 1.",
        4: "a takes b's 2. The 1 is safe in temp.",
        5: "b takes the 1 back out of temp. Swapped.",
    }},

    # ── 5 decisions ──
    {"name": "ifhot", "code": '''
temp = 30
if temp > 25:
    print("Shorts")
print("Go outside")
''', "notes": {
        2: "temp > 25 is 30 > 25, which is True, so the indented line runs next.",
        4: "This line isn't indented, so it isn't part of the if: it runs either way.",
    }},
    {"name": "ifcold", "code": '''
temp = 18
if temp > 25:
    print("Shorts")
print("Go outside")
''', "notes": {
        2: "temp > 25 is 18 > 25, which is False, so the indented line is skipped.",
    }},
    {"name": "ifelse", "code": '''
age = 15
if age >= 18:
    print("Adult ticket")
else:
    print("Child ticket")
print("Enjoy the film")
''', "notes": {
        2: "15 >= 18 is False, so Python jumps to the else branch.",
        3: "Exactly one of the two branches ran. Now the program carries on below both.",
    }},
    {"name": "grades", "code": '''
score = 85
if score >= 90:
    print("A")
elif score >= 80:
    print("B")
elif score >= 70:
    print("C")
else:
    print("Keep going")
''', "notes": {
        2: "85 >= 90 is False: on to the next check.",
        3: "85 >= 80 is True: this branch wins.",
        4: "One branch ran, so Python skips every remaining elif and else, even though 85 >= 70 is also True.",
    }},
    {"name": "nested", "code": '''
raining = True
have_umbrella = False
if raining:
    if have_umbrella:
        print("Walk")
    else:
        print("Take the bus")
else:
    print("Walk")
''', "notes": {
        3: "raining is True, so we go inside the outer if, where there is a second question.",
        4: "have_umbrella is False, so the inner else runs.",
    }},

    # ── 6 loops ──
    {"name": "countdown", "code": '''
n = 3
while n > 0:
    print(n)
    n = n - 1
print("Liftoff!")
''', "notes": {
        2: "3 > 0 is True, so the indented body runs.",
        4: "End of the body: Python jumps back up to check the condition again.",
        11: "0 > 0 is False. The loop is over; Python continues after it.",
    }},
    {"name": "minus3", "code": '''
n = 10
while n > 0:
    n = n - 3
print(n)
''', "notes": {
        2: "10 > 0 is True, so the body runs.",
        10: "-2 > 0 is False, so the loop stops. n jumped from 1 straight past 0, because the check only happens at the top.",
    }},
    {"name": "product0", "code": '''
result = 0
for i in range(1, 4):
    result = result * i
print(result)
''', "notes": {
        2: "range(1, 4) hands out 1, 2, 3. First pass: i is 1.",
        3: "0 × 1 is 0. Anything times 0 is 0, so result is stuck.",
    }},

    # ── 7 functions ──
    {"name": "greet", "code": '''
def greet(name):
    print("Hi, " + name)

greet("Ada")
greet("Lin")
''', "notes": {
        1: "def only creates the function and names it greet. Nothing inside it runs yet.",
        2: "greet(\"Ada\") calls the function: a new frame appears with the parameter name holding the argument \"Ada\".",
    }},
    {"name": "square", "code": '''
def square(n):
    return n * n

y = square(4)
print(y + 1)
''', "notes": {
        4: "square() handed back 16 and its frame is gone. So y = square(4) became y = 16.",
    }},
    {"name": "printret", "code": '''
def double(x):
    print(x * 2)

result = double(5)
print(result)
''', "notes": {}},
    {"name": "scope", "code": '''
count = 10

def reset():
    count = 0
    print("inside:", count)

reset()
print("outside:", count)
''', "notes": {
        4: "This makes a brand-new local count inside reset's frame. The global count is a different box.",
    }},

    # ── 8 collections ──
    {"name": "scores", "inline": True, "code": '''
scores = [7, 9]
scores.append(4)
total = 0
for s in scores:
    total = total + s
print(len(scores), total)
''', "notes": {
        2: "append adds 4 to the end. The list grows to 3 items.",
    }},

    # ── 9 references and the stack ──
    {"name": "alias0", "code": '''
nums = [1, 2, 3]
other = nums
''', "notes": {
        1: "The list is an object in memory (#1). The nums box doesn't hold the list itself: it holds an arrow to it.",
        2: "other = nums copies the arrow, not the list. Two names, one list.",
    }},
    {"name": "alias", "code": '''
a = [1, 2, 3]
b = a
b.append(4)
print(a)
''', "notes": {
        3: "append changes the object that b points at, and a points at the same object.",
    }},
    {"name": "copylist", "code": '''
a = [1, 2, 3]
b = a.copy()
b.append(4)
print(a)
''', "notes": {
        2: ".copy() builds a second list (#2) with the same items. Now each name has its own.",
        3: "Only list #2 changes.",
    }},
    {"name": "bonus", "code": '''
def add_bonus(scores):
    scores.append(100)

mine = [50, 60]
add_bonus(mine)
print(len(mine))
''', "notes": {
        3: "The parameter scores gets a copy of the arrow, so it points at the very same list as mine.",
    }},
    {"name": "fact", "code": '''
def fact(n):
    if n == 1:
        return 1
    return n * fact(n - 1)

print(fact(4))
''', "notes": {
        3: "n == 1 is False (n is 4), so line 3 is skipped.",
        4: "To finish 4 * fact(3), Python first needs fact(3). It calls fact again, and this frame waits.",
        5: "The new frame has its own n, which is 3. n == 1 is False again.",
        9: "n == 1 is True at last. This is the base case: the calls stop here.",
        11: "fact(1) handed back 1. Back in the frame where n is 2: 2 * 1 = 2, so it returns 2.",
        12: "Back where n is 3: 3 * 2 = 6.",
        13: "Back where n is 4: 4 * 6 = 24.",
        14: "fact(4) handed back 24 and print shows it. The stack is back to just global.",
    }},
]
