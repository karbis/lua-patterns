let testerInput = document.getElementById("testerInput")
let patternInput = document.getElementById("input")
let shouldReplace = document.getElementById("shouldReplace")
let replaceInput = document.getElementById("replaceInput")
let testerOutput = document.getElementById("testerOutput")

let lua = fengari.lua
let lualib = fengari.lualib
let lauxlib = fengari.lauxlib
let luaState = lauxlib.luaL_newstate()
lualib.luaL_openlibs(luaState)

lauxlib.luaL_dostring(luaState, fengari.to_luastring(`function match(input, pattern)
	local result = {}
	local prevIndex = 1
	local iterator = string.gmatch(input, "()" .. pattern .. "()")
	while true do
		local args = {iterator()}
		if #args == 0 then break end
		local start = args[1]
		local ending = args[#args]
		local matched = input:sub(start, ending - 1)
		table.insert(result, input:sub(prevIndex, start - 1))
		
		if #args == 2 then
			table.insert(result, {matched})
		else
			local groups = {}
			for j = 2, #args - 1 do
				local start, ending = matched:find(args[j], nil, true)
				local normalStr = matched:sub(1, start - 1)
				table.insert(groups, normalStr)
				table.insert(groups, args[j])
				matched = matched:sub(ending + 1)
			end
			
			if #matched ~= 0 then
				table.insert(groups, matched)
			end
			
			table.insert(result, groups)
		end
		prevIndex = ending
	end
	
	if prevIndex <= #input then
		table.insert(result, input:sub(prevIndex))
	end
	
	return result
end

function replace(input, pattern, replacement)
	local matches = match(input, pattern)
	local toReplace = {}
	
	local i = 0
	local stack = ""
	local percentCount = 0
	while i <= #replacement do
		i = i + 1
		local char = replacement:sub(i, i)
		
		if char:match("%d") and percentCount % 2 == 1 then
			table.insert(toReplace, (stack:sub(1, #stack - 1):gsub("%%%%","%%")))
			table.insert(toReplace, tonumber(char))
			stack = ""
		else
			stack = stack .. char
		end
		
		if char == "%" then
			percentCount = percentCount + 1
		else
			percentCount = 0
		end
	end
	
	if #stack ~= 0 then
		table.insert(toReplace, (stack:gsub("%%%%","%%")))
	end
	
	for i = 2, #matches, 2 do
		local groups = matches[i]
		local result = {}
		local fullStr = table.concat(groups, "")
		
		for _, v in pairs(toReplace) do
			if type(v) == "string" then
				table.insert(result, v)
			elseif v == 0 then
				table.insert(result, fullStr)
			elseif v == 1 and #groups == 1 then
				table.insert(result, groups[1])
			else
				assert(groups[v * 2], "invalid capture index")
				for i = #result, v * 2 - 2 do
					table.insert(result, "") -- add padding
				end
				table.insert(result, groups[v * 2] or "nil")
			end
		end
		
		matches[i] = result
	end
	
	return matches
end`))

function getMatchData(isGsub) {
	if (/^%\d$/g.test(patternInput.value)) return [] // weird crash
	lua.lua_getglobal(luaState, (isGsub) ? "replace" : "match")
	lua.lua_pushstring(luaState, testerInput.value)
	lua.lua_pushstring(luaState, patternInput.value)
	if (isGsub) {
		lua.lua_pushstring(luaState, replaceInput.value)
	}
	
	let result = lua.lua_pcall(luaState, (isGsub) ? 3 : 2, 1, 0)
	if (result != lua.LUA_OK) {
		let err = fengari.to_jsstring(lua.lua_tostring(luaState, -1))
		lua.lua_pop(luaState, 1)
		return [{type: "text", value: err}]
	}
		
	let matchData = []
	let matchLength = lua.lua_rawlen(luaState, -1)
	for (let i = 1; i <= matchLength; i++) {
		lua.lua_rawgeti(luaState, -1, i)
		let type = lua.lua_type(luaState, -1)
		if (type == lua.LUA_TSTRING) {
			let str = fengari.to_jsstring(lua.lua_tostring(luaState, -1))
			if (str != "") {
				matchData.push({type: "text", value: str})
			}
		} else {
			let len = lua.lua_rawlen(luaState, -1)
			for (let j = 1; j <= len; j++) {
				lua.lua_rawgeti(luaState, -1, j)
				let str = fengari.to_jsstring(lua.lua_tostring(luaState, -1))
				if (str != "" && j % 2 == 1) {
					matchData.push({type: "match", value: str, matchId: i / 2})
				} else if (j % 2 == 0) {
					matchData.push({type: "group", value: str, matchId: i / 2, groupId: j / 2})
				}
				
				lua.lua_pop(luaState, 1)
			}
		}
		
		lua.lua_pop(luaState, 1)
	}
	
	lua.lua_pop(luaState, 1)
	return matchData
}

function updateResult() {
	let matchData = getMatchData(shouldReplace.checked)
	
	testerOutput.innerHTML = ""
	matchData.forEach((match) => {
		let el = document.createElement("span")
		
		el.innerText = match.value
		if (match.type == "match") {
			el.style.setProperty("--color", "hsla(214, 100%, 62%, 50%)")
			el.title = `Match #${match.matchId}`
		} else if (match.type == "group") {
			el.style.setProperty("--color", `hsla(${(214 + 36 * match.groupId) % 360}, 100%, 62%, 50%)`)
			el.title = `Match #${match.matchId}\nGroup #${match.groupId}`
		}
		if (match.type != "text") {
			el.classList.add("match-node")
		}
		
		testerOutput.appendChild(el)
	})
}

testerInput.addEventListener("input", updateResult)
shouldReplace.addEventListener("change", updateResult)
replaceInput.addEventListener("input", updateResult)
patternInput.addEventListener("input", updateResult)