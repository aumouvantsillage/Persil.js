grammar:
    _ rule_list _

rule_list:
    rule __ rule_list
    | rule

rule:
    id _ ':' _ production_list

production_list:
    production _ '|' _ production_list
    | production

production:
    term __ production
    | term

term:
    id
    | character
    | range
    | '.'
    | '%'

id:
    [a-zA-Z_] id
    | [a-zA-Z_]

range:
    '[' range_exp ']'

range_exp:
    range_char range_exp
    | range_char

range_char:
    [^\]\\]
    | '\\' .

__:
    [ \r\n\t] _

_:
    __ | %
