grammar:
    _ rules _

rules:
    rule __ rules
    | rule

rule:
    id _ ":" _ choice

choice:
    sequence _ "|" _ choice
    | sequence

sequence:
    term __ sequence
    | term
    | "%"

term:
    target _ primary _ multiplicity

target:
    id _ assignment_operator
    | %

assignment_operator:
    "=" | "+="

multiplicity:
    "?" | "*" | "+" | %

primary:
    id
    | string
    | ranges
    | "(" choice ")"

id:
    [a-zA-Z0-9_] id
    | [a-zA-Z0-9_]

string:
    "\"" string_content "\""

string_content:
    string_char string_content
    | string_char

string_char:
    [^"\\]
    | "\\" .

ranges:
    range _ ranges
    | range

range:
    "[" range_content "]"
    | "."

range_content:
    range_char range_content
    | range_char

range_char:
    [^\]\\]
    | "\\" .

__:
    [ \r\n\t] _
    | comment _

_:
    __ | %

comment:
    "/" "/" single_line_comment_content [\r\n]
    | "/" "*" multiline_comment_content "*" "/"

single_line_comment_content:
    [^\r\n] single_line_comment_content
    | %

multiline_comment_content:
    [^*] multiline_comment_content
    | "*" [^/] multiline_comment_content
    | %
