def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()
    
    stack = []
    line_num = 1
    pairs = {'{': '}', '[': ']', '(': ')'}
    rev_pairs = {v: k for k, v in pairs.items()}
    
    # Simple checker ignoring comments/strings for a quick test
    in_string = False
    string_char = ''
    in_comment = False
    in_block_comment = False
    
    i = 0
    while i < len(text):
        c = text[i]
        
        if c == '\n':
            line_num += 1
            if in_comment:
                in_comment = False
        
        elif in_comment or in_block_comment:
            if in_block_comment and c == '*' and i + 1 < len(text) and text[i+1] == '/':
                in_block_comment = False
                i += 1
        elif in_string:
            if c == '\\':
                i += 1
            elif c == string_char:
                in_string = False
        else:
            if c in ['\"', '\'', '']:
                in_string = True
                string_char = c
            elif c == '/' and i + 1 < len(text) and text[i+1] == '/':
                in_comment = True
                i += 1
            elif c == '/' and i + 1 < len(text) and text[i+1] == '*':
                in_block_comment = True
                i += 1
            elif c in pairs:
                stack.append((c, line_num))
            elif c in rev_pairs:
                if not stack:
                    print(f"Unmatched closing bracket {c} at line {line_num}")
                    return
                last, lnum = stack.pop()
                if last != rev_pairs[c]:
                    print(f"Mismatched closing bracket {c} at line {line_num}, expected {pairs[last]} for {last} at line {lnum}")
                    return
        i += 1

    if stack:
        print(f"Unmatched opening brackets: {stack}")
    else:
        print("Brackets are balanced!")

check_balance('app.js')
