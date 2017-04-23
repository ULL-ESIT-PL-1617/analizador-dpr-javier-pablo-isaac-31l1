Object.constructor.prototype.error = function(message, t) {
  t = t || this;
  t.name = "SyntaxError";
  t.message = message;
  throw treturn;
};

RegExp.prototype.bexec = function(str) {
  var i, m;
  i = this.lastIndex;
  m = this.exec(str);
  if (m && m.index === i) {
    return m;
  }
  return null;
};

String.prototype.tokens = function() {
  var RESERVED_WORD, BOOLEAN, from, getTok, i, key, m, make, n, result, rw, tokens, value;
  from = void 0;
  i = 0;
  n = void 0;
  m = void 0;
  result = [];
  tokens = {
    WHITES: /\s+/g,
    ID: /[a-zA-Z_]\w*/g,
    NUM: /\b\d+(\.\d*)?([eE][+-]?\d+)?\b/g,
    STRING: /('(\\.|[^'])*'|"(\\.|[^"])*")/g,
    ONELINECOMMENT: /\/\/.*/g,
    MULTIPLELINECOMMENT: /\/[*](.|\n)*?[*]\//g,
    COMPARISONOPERATOR: /[<>=!]=|[<>]|==/g,
    TWOCHAROPERATORS: /(\+\+|\-\-)/g,
    ONECHAROPERATORS: /(->|[=()&|;:,{}[\]])/g,
    ADDOP: /[+-]/g,
    MULTOP: /[*\/]/g
  };
  RESERVED_WORD = {
    p: "P",
    "if": "IF",
    "then": "THEN",
    "else": "ELSE",
    "const": "CONST",
      "for": "FOR"
  };
  BOOLEAN = {
    "true": "TRUE",
    "false": "FALSE"
  };

  make = function(type, value) {
    return {
      type: type,
      value: value,
      from: from,
      to: i
    };
  };
  getTok = function() {
    var str;
    str = m[0];
    i += str.length;
    return str;
  };
  if (!this) {
    return;
  }
  while (i < this.length) {
    for (key in tokens) {
      value = tokens[key];
      value.lastIndex = i;
    }
    from = i;
    if (m = tokens.WHITES.bexec(this) || (m = tokens.ONELINECOMMENT.bexec(this)) || (m = tokens.MULTIPLELINECOMMENT.bexec(this))) {
      getTok();
    } else if (m = tokens.ID.bexec(this)) {
      rw = RESERVED_WORD[m[0]];
      b = BOOLEAN[m[0]];
      if (rw) {
        result.push(make(rw, getTok()));
      } else if(b) {
            result.push(make("BOOLEAN", eval(getTok())));
      } else {
        result.push(make("ID", getTok()));
      }
    } else if (m = tokens.NUM.bexec(this)) {
      n = +getTok();
      if (isFinite(n)) {
        result.push(make("NUM", n));
      } else {
        make("NUM", m[0]).error("Bad number");
      }
    } else if (m = tokens.STRING.bexec(this)) {
      result.push(make("STRING", getTok().replace(/^["']|["']$/g, "")));
    } else if (m = tokens.COMPARISONOPERATOR.bexec(this)) {
      result.push(make("COMPARISON", getTok()));
    } else if (m = tokens.TWOCHAROPERATORS.bexec(this)) {
      result.push(make("TWOCHAROPERATOR", getTok()));
    } else if (m = tokens.ONECHAROPERATORS.bexec(this)) {
      result.push(make(m[0], getTok()));
    } else if (m = tokens.ADDOP.bexec(this)) {
      result.push(make("ADDOP", getTok()));
    } else if (m = tokens.MULTOP.bexec(this)) {
      result.push(make("MULTOP", getTok()));
    }  else {
      throw "Syntax error near '" + (this.substr(i)) + "'";
    }
  }
  return result;
};

var parse = function(input) {
    var tabla_constantes = [];
  var condition, coma, expression, factor, lookahead, match, statement, statements, term, tokens, tree;
  tokens = input.tokens();
  lookahead = tokens.shift();
  match = function(t) {
    if (lookahead.type === t) {
      lookahead = tokens.shift();
      if (typeof lookahead === "undefined") {
        lookahead = null;
      }
    } else {
      throw ("Syntax Error. Expected " + t + " found '") + lookahead.value + "' near '" + input.substr(lookahead.from) + "'";
    }
  };

  coma = function() {
      var array_result = [];
      if (lookahead.type === "FOR")
          array_result.push(bucle());
      else array_result.push(expression());
      while (lookahead && lookahead.type == ";") {
        match(";");
        if (lookahead.type === "FOR")
            array_result.push(bucle());
        else array_result.push(expression());
      }
      return array_result;

  }

  expression = function() {
    let result, right, type;
    let args = [];
    if (lookahead.type === "IF")
        return conditional();
    if (lookahead && lookahead.type == "CONST") {
        return constante();
    }
      result = term();
      if (lookahead && lookahead.value === "(" && result.type === "ID") {
        match("(");
        args.push(factor());
        while (lookahead.value === ",") {
          match(",");
          args.push(term());
        }
        match(")");
        result = {
           type: "ID",
           value: result.value,
           argumentos: args
        };
      }
      else if (lookahead && lookahead.type === "=" && result.type === "ID") {
        result = asignation(result);
    } else {
        while(lookahead && lookahead.type === "ADDOP"){
          type = lookahead.value;
          match("ADDOP");
          right = term();
          result = {
             type: type,
             left: result,
             right: right
          };
         }
      }

    if(lookahead && lookahead.type === "COMPARISON") {
      result = comparation(result);
    }

    return result;
  };

   bucle = function() {
     let init, condition, result, increment, code;
     match("FOR");
     match("(");
     init = term();
     if (lookahead && lookahead.type === "=" && init.type === "ID") {
       init = asignation(init);
     }
     match(";");
     condition = term();
     if (lookahead && lookahead.type === "COMPARISON" && condition.type === "ID") {
       condition = comparation(condition);
     }
     match(";");
     increment = incremento();
     match(")");
     match("{");
     if (lookahead && lookahead.value != "}") {
       code = coma();
     }
     match("}");
     result = {
       type: "FOR",
       inicio: init,
       condicion: condition,
       incremento: increment,
       codigo: code
     }
     return result;
   }

   incremento = function() {
     var operator, id, increment;
     id = term();
     if (lookahead && lookahead.type === "TWOCHAROPERATOR" && id.type === "ID") {
       operator = lookahead.value;
       match("TWOCHAROPERATOR");
       if (operator === "++")
        increment = 1;
       else if (operator === "--") {
         increment = -1;
       }
     }
     return increment;
   }
   constante = function() {
     match("CONST");
     result = term();
     if (lookahead && lookahead.type === "=" && result.type === "ID") {
       if (!tabla_constantes[result.value])
         tabla_constantes.push(result.value);
       result.constante = true;
       result = asignation(result);
     }
     return result;
   }


  asignation = function(id) {
    var assignment;
    let result;
    match("=");
    if (lookahead.value == "->") {
      match("->");
      result = funcion();
    }
     else {
       assignment = expression();
       result = {
           type: "=",
           left: id,
           right: assignment
         };
     }
    return result;
  }

  funcion = function(id) {
    let args = [];
    let code;
    let j = 0;
    let statement;
    let funcionArray;
    let result;
    match("(");
    args.push(lookahead.value);
    match("ID");
    while (lookahead && lookahead.value == ",") {
      match(",");
      args.push(lookahead.value);
      match("ID");
    }
    match(")");
    match("{");
    if (lookahead && lookahead.value != "}") {
      codigo = coma();
    }
    match("}");

    result = {
        nombrefuncion: id,
        argumentos: args,
        code: codigo
      }

      return result
    }


  conditional = function() {
      let condicion, resultado, resultado1, resultado2;
      match("IF");
      condicion = expression();
      match("THEN");
      resultado1 = expression();
      match("ELSE");
      resultado2 = expression();
      resultado = {
           type: "IF",
           condition: condicion,
           type2: "THEN",
           first: resultado1,
           type3:  "ELSE",
           second: resultado2,

         };
      return resultado;
  }

   comparation = function(left) {
    var comparator = lookahead.value;
    var resultado;
    match("COMPARISON");
    right = expression();
    resultado = {
       type: comparator,
       left: left,
       right: right
     };
    return resultado;
  }
  term = function() {
    var result, right, type;
    result = factor();
    if (lookahead && lookahead.type === "MULTOP") {
      type = lookahead.value;
      match("MULTOP");
      right = term();
      if(type === "*"){
        result = {
          type: "*",
          left: result,
          right: right
        };
      }
      else if(type === "/"){
        result = {
          type: "/",
          left: result,
          right: right
        };
      }
    }
    return result;
  };

  factor = function() {
    var result, id;
    result = null;
    if (lookahead.type === "NUM") {
      result = {
       type: "NUM",
       value: lookahead.value
     };
        match("NUM");
    }
      else if(lookahead.type === "ID") {
        id = lookahead.value;
        if (tabla_constantes.indexOf(id) > -1) {
            result = {
             type: "ID",
             value: id,
             constante: true
           };
         } else {
           result = {
            type: "ID",
            value: id,
            constante: false
          };
          }
            match("ID");
    } else if (lookahead.type === "BOOLEAN") {
      result = {
       type: "BOOLEAN",
       value: lookahead.value
     };
      match("BOOLEAN");
    }else if (lookahead.type === "(") {
      match("(");
      result = expression();
      match(")");
    }else {
      throw "Syntax Error. Expected number or identifier or '(' but found " + (lookahead ? lookahead.value : "end of input") + " near '" + input.substr(lookahead.from) + "'";
    }
    return result;
  };

  tree = coma(input);
  if (lookahead != null) {
    throw "Syntax Error parsing statements. " + "Expected 'end of input' and found '" + input.substr(lookahead.from) + "'";
  }
  return tree;
};
