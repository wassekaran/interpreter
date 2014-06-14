"use strict";

var parser = (function () {
    var _err;
    var _lex;
    var _curr;
    var _ast;
    var _precedence = [{lx:"LX_LOR"},
		       {lx:"LX_LAND"},
		       {lx:"LX_OR"},
		       {lx:"LX_XOR"},
		       {lx:"LX_AND"},
		       {lx:["LX_EQ", "LX_NEQ"]},
		       {lx:["LX_LE", "LX_LT", "LX_GE", "LX_GT"]},
		       {lx:["LX_LSHIFT", "LX_RSHIFT"]},
		       {lx:["LX_PLUS", "LX_MINUS"]},
		       {lx:["LX_MULT", "LX_DIV", "LX_MODULO"]},
		       {lx:"LX_POW", func:ruleUnary}];

    function parser(lexemes) {
	_err = false;
	_lex = lexemes;
	shift();
	_ast = ruleBlock();
	if (_curr)
	    error("Unexpected symbol at the end of expression: " + _curr.name);
	return (_err ? null : _ast);
    }

    /* block: "{" instruction+ "}"
     */
    function ruleBlock() {
	var node;

	if (accept("LX_LCURLY")) {
	    shift();
	    node = {name:"LX_BLOCK", children:[]};
	    do {
		node.children.push(ruleBlock());
	    } while (!accept("LX_RCURLY") && !_err);
	    shift();
	}
	else
	    node = ruleInstruction();
	return (node);
    }

    /* instruction: assign ";"
     */
    function ruleInstruction() {
	var node = ruleAssign();

	if (!node)
	    return (false);
	if (!expect("LX_SEMICOLON"))
	    return (false);
	shift();
	return (node);
    }

    /* assign: (id "=")? plusMinus
     */
    function ruleAssign() {
	var parent;
	var node;
	var tmp;

	if (accept("LX_ID") && _lex[0].name == "LX_ASSIGN") {
	    node = {name:_lex[0].name, children:[]};
	    node.children.push({name:_curr.name, val:_curr.val});
	    shift();
	    shift();
	    if (!(tmp = operatorPipeline(0)))
		return (false);
	    node.children.push(tmp);
	} else if (!(node = operatorPipeline(0)))
	    return (false);
	return (node);
    }

    /* Operator pipeline that handles operator precedence
       via multiple recursions with changing arguments
     */
    function operatorPipeline(id) {
	var state = _precedence[id]
	var node;
	var parent;
	var tmp;

	node = state.func ? state.func() : operatorPipeline(id + 1);
	while (accept(state.lx)) {
	    parent = {name:_curr.name, children:[node]};
	    shift();
	    if (!(tmp = (state.func ? state.func() : operatorPipeline(id + 1))))
		return (false);
	    parent.children.push(tmp);
	    node = parent;
	}
	return (node);
    }

    /* unary: [+-!] base
            | (--|++) id
     */
    function ruleUnary() {
	var node;
	var tmp;

	if (accept("LX_MINUS")) {
	    node = {name:_curr.name, children:[]};
	    node.children.push({name:"LX_NUMBER", val:0});
	    shift();
	    if (!(tmp = ruleBase()))
		return (false);
	    node.children.push(tmp);
	} else if (accept(["LX_LNOT", "LX_NOT"])) {
	    node = {name:_curr.name, children:[]};
	    shift();
	    if (!(tmp = ruleBase()))
		return (false);
	    node.children.push(tmp);
	} else if (accept(["LX_INC", "LX_DEC"])) {
	    node = {name:_curr.name, children:[]};
	    shift();
	    if (!expect("LX_ID"))
		return (false);
	    node.children.push({name:_curr.name, val:_curr.val});
	    shift();
	} else {
	    if (accept("LX_PLUS"))
		shift();
	    if (!(node = ruleBase()))
		return (false);
	}
	return (node);
    }

    /* base: number
           | id
           | "(" expression ")"
     */
    function ruleBase() {
	var node = false;

	if (accept("LX_NUMBER")) {
	    node = {name:_curr.name, val:parseFloat(_curr.val)};
	    shift();
	} else if (accept("LX_ID")) {
	    node = {name:_curr.name, val:_curr.val};
	    shift();
	} else if (accept("LX_LPAREN")) {
	    shift();
	    node = ruleAssign();
	    if (expect("LX_RPAREN"))
		shift();
	} else
	    error("Can't make rule \"base\"");
	return (node);
    }

    function accept(lx) {
	if (!_curr)
	    return (false);
	if (typeof lx == "string") {
	    if (_curr.name == lx)
		return (true);
	} else {
	    for (var i in lx) {
		if (_curr.name == lx[i])
		    return (true);
	    }
	}
	return (false);
    }

    function expect(lx) {
	if (accept(lx))
	    return (true);
	if (_curr)
	    error("Expected symbol \"" + lx + "\" but got \"" + _curr.name + "\"");
	else
	    error("Expected symbol \"" + lx + "\"");
	return (false);
    }

    function shift() {
	do
	    _curr = _lex.shift();
	while (_curr && _curr.name == "LX_NEWLINE");
    }

    function error(msg) {
	if (_curr)
	    console.error("Error at line " + _curr.line + ": " + msg);
	else
	    console.error("Error: " + msg);
	_err = true;
    }

    return (parser);
} ());

module.exports = parser;
