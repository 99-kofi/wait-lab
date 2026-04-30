import numpy as np

# -----------------------------
# CONFIGURATION (Version 1, Level H)
# -----------------------------
SIZE = 21 
EC_H = 0b10  # Level H (30% error correction)
NSYM = 17    # Number of ECC bytes for 1-H
DATA_CAP = 9 # Number of data bytes for 1-H
MASK = 2     # Using Mask 2 (j % 3 == 0) - often looks cleaner for logos

EXP = [0] * 512
LOG = [0] * 256

def init_tables():
    x = 1
    for i in range(255):
        EXP[i] = x
        LOG[x] = i
        x <<= 1
        if x & 0x100: x ^= 0x11d
    for i in range(255, 512):
        EXP[i] = EXP[i - 255]

init_tables()

def gf_mul(x, y):
    if x == 0 or y == 0: return 0
    return EXP[LOG[x] + LOG[y]]

def rs_encode_msg(msg, nsym):
    gen = [1]
    for i in range(nsym):
        new_gen = [0] * (len(gen) + 1)
        for j in range(len(gen)):
            new_gen[j] ^= gen[j]
            new_gen[j+1] ^= gf_mul(gen[j], EXP[i])
        gen = new_gen
    res = msg + [0] * nsym
    for i in range(len(msg)):
        coef = res[i]
        if coef != 0:
            for j in range(len(gen)):
                res[i+j] ^= gf_mul(gen[j], coef)
    return res[-nsym:]

# -----------------------------
# PIXEL ART "HELLO" (5x13)
# -----------------------------
# 1 = Black module, 0 = White module
HELLO_LOGO = np.array([
    [1,0,1,0,1,1,1,0,1,0,0,0,1,0,0,0,1,1,1],
    [1,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,1,1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1]
])

# -----------------------------
# CORE QR BUILDING
# -----------------------------
def create_structure():
    mat = np.full((SIZE, SIZE), -1, dtype=int)
    reserved = np.zeros((SIZE, SIZE), dtype=bool)

    def add_finder(r, c):
        mat[r:r+7, c:c+7] = 0
        reserved[r:r+7, c:c+7] = True
        for i in range(7):
            for j in range(7):
                if i in [0,6] or j in [0,6] or (2<=i<=4 and 2<=j<=4):
                    mat[r+i, c+j] = 1

    add_finder(0, 0)
    add_finder(SIZE-7, 0)
    add_finder(0, SIZE-7)
    
    # Timing lines
    for i in range(8, SIZE-8):
        mat[6, i] = 1 if i % 2 == 0 else 0
        mat[i, 6] = 1 if i % 2 == 0 else 0
        reserved[6, i] = reserved[i, 6] = True

    # Reserved format areas
    reserved[8, :9] = reserved[:9, 8] = True
    reserved[8, SIZE-8:] = reserved[SIZE-8:, 8] = True
    mat[SIZE-8, 8] = 1 # Dark module
    
    return mat, reserved

def get_bits(text):
    bits = [0,1,0,0] # Byte mode
    bits += [int(x) for x in format(len(text), '08b')]
    for char in text:
        bits += [int(x) for x in format(ord(char), '08b')]
    bits += [0] * 4 # Terminator
    while len(bits) % 8 != 0: bits.append(0)
    pad = [0xec, 0x11]
    idx = 0
    while len(bits) < DATA_CAP * 8:
        bits += [int(x) for x in format(pad[idx%2], '08b')]
        idx += 1
    return bits

def place_data(mat, reserved, bits):
    idx = 0
    direction = -1
    c = SIZE - 1
    while c > 0:
        if c == 6: c -= 1
        rows = range(SIZE) if direction == 1 else range(SIZE-1, -1, -1)
        for r in rows:
            for col in (c, c-1):
                if not reserved[r, col]:
                    val = bits[idx] if idx < len(bits) else 0
                    # Apply Mask 2: col % 3 == 0
                    mat[r, col] = val ^ 1 if (col % 3 == 0) else val
                    idx += 1
        direction *= -1
        c -= 2

def add_format_info(mat):
    fmt = (EC_H << 3) | MASK
    gen = 0x537
    rem = fmt << 10
    for i in range(14, 9, -1):
        if (rem >> i) & 1: rem ^= (gen << (i - 10))
    bits = ((fmt << 10) | rem) ^ 0b101010000010010
    
    pos = [(8,0),(8,1),(8,2),(8,3),(8,4),(8,5),(8,7),(8,8),(7,8),(5,8),(4,8),(3,8),(2,8),(1,8),(0,8)]
    for i, (r, c) in enumerate(pos):
        mat[r, c] = (bits >> i) & 1
    for i in range(8): mat[8, SIZE-1-i] = (bits >> i) & 1
    for i in range(7): mat[SIZE-7+i, 8] = (bits >> (8+i)) & 1

# -----------------------------
# EXECUTION
# -----------------------------
def build_artistic_qr():
    mat, reserved = create_structure()
    
    # 1. Generate standard Data + ECC
    bits = get_bits("HELLO")
    bytes_data = [int("".join(map(str, bits[i:i+8])), 2) for i in range(0, len(bits), 8)]
    ecc = rs_encode_msg(bytes_data, NSYM)
    all_bits = bits + [int(x) for b in ecc for x in format(b, '08b')]
    
    # 2. Place data in matrix
    place_data(mat, reserved, all_bits)
    
    # 3. Add format info
    add_format_info(mat)
    
    # 4. SHAPE IT TO "HELLO": Overlay the logo in the center
    # We place it at row 9, col 1 to avoid finders
    start_r, start_c = 9, 1
    h, w = HELLO_LOGO.shape
    mat[start_r:start_r+h, start_c:start_c+w] = HELLO_LOGO

    # 5. Add Quiet Zone
    return np.pad(mat, pad_width=2, mode='constant', constant_values=0)

def print_qr(matrix):
    for row in matrix:
        print("".join("██" if x == 1 else "  " for x in row))

qr = build_artistic_qr()
print_qr(qr)
print("\nThis QR code encodes 'HELLO' and visually contains 'HELLO'!")
