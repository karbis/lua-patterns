let input = document.getElementById("input")
let inputHighlighter = document.getElementById("inputHighlighter")

const tokColors = Object.freeze({
	[TOK.START]: "start",
	[TOK.END]: "end",
	[TOK.ANY]: "any",
	[TOK.ZEROORMORE]: "quantifier",
	[TOK.ONEORMORE]: "quantifier",
	[TOK.ZEROORMORELAZY]: "quantifier",
	[TOK.ZEROORONE]: "quantifier",
	[TOK.LPAR]: "capture",
	[TOK.RPAR]: "capture",
	[TOK.LBRACKET]: "set",
	[TOK.RBRACKET]: "set",
	[TOK.INVERSE]: "set",
	[TOK.CLASS]: "classToken",
	[TOK.CAPTUREREF]: "captureref",
	[TOK.BALANCED]: "balanced",
	[TOK.FRONTIER]: "frontier",
	[TOK.ERROR]: "error",
})

let simplifyTokens = (tokens) => {
	let i = -1;
	let isBasicChar = (token) => {
		return token.type == TOK.CHAR || token.type == TOK.ESCAPED
	}
	let isQuantifier = (token) => {
		return token.type == TOK.ZEROORMORE || token.type == TOK.ZEROORONE || token.type == TOK.ZEROORMORELAZY || token.type == TOK.ONEORMORE
	}
	
	// character simplification & quantifier grouping
	while (i < tokens.length - 1) {
		i++
		let curToken = tokens[i]
		let prevToken = tokens[i - 1]
		let nextToken = tokens[i + 1]
		
		if (nextToken && isBasicChar(curToken) && isQuantifier(nextToken)) {
			nextToken.subStringStart = curToken.subStringStart
			tokens.splice(i, 1)
			i -= 1
		} else if (nextToken && isQuantifier(nextToken) && !isBasicChar(curToken)) {
			curToken.subStringEnd = nextToken.subStringEnd
			tokens.splice(i + 1, 1)
		} else if (prevToken && isBasicChar(curToken) && isBasicChar(prevToken)) {
			prevToken.string += curToken.string
			prevToken.subStringEnd = curToken.subStringEnd
			tokens.splice(i, 1)
			i -= 1
		}
	}
	
	i = -1
	// set, capture and frontier grouping
	while (i < tokens.length - 1) {
		i++
		let curToken = tokens[i]
		let prevToken = tokens[i - 1]
		
		if (curToken.type != TOK.LBRACKET && curToken.type != TOK.LPAR) continue
		let endingChar = (curToken.type == TOK.LBRACKET) ? TOK.RBRACKET : TOK.RPAR
		let intendedType = (curToken.type == TOK.LBRACKET && prevToken && prevToken.type == TOK.FRONTIER) ? TOK.FRONTIER : curToken.type
		curToken.type = intendedType
		
		while (i < tokens.length - 1 && tokens[i].type != endingChar) {
			i += 1
			if (!isBasicChar(tokens[i]) && tokens[i].type != TOK.INVERSE) continue
			tokens[i].type = intendedType
		}
		tokens[i].type = intendedType
	}
	
	return tokens
}

let onPatternInput = ({target: target}) => {
	if (target.value.length == 0) {
		window.history.replaceState(null, null, location.pathname)
	} else {
		window.history.replaceState(null, null, "?pattern=" + encodeURIComponent(target.value))
	}
	
	inputHighlighter.innerHTML = ""
	
	let tokens = simplifyTokens(PatternsPrint(target.value))
	tokens.forEach((token) => {
		let el = document.createElement("span")
		el.innerText = input.value.substring(token.subStringStart, token.subStringEnd)
		
		if (tokColors[token.type]) {
			let col = tokColors[token.type]
			el.classList.add("token", col)
		}
		
		inputHighlighter.appendChild(el)
	})
}

input.addEventListener("input", onPatternInput)
input.focus()
input.select()

{
	let param = new URLSearchParams(window.location.search).get("pattern")
	if (param) {
		input.value = param
		onPatternInput({target: input})
	}
}

input.addEventListener("scroll", () => {
	inputHighlighter.scrollLeft = input.scrollLeft
})