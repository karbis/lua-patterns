//                             string       string
function setUpSettingsListener(settingName, bodyClass) {
	let body = document.querySelector("body")
	let settingElement = document.getElementById(settingName)
	let checked = ({target: checkbox}) => {
		localStorage.setItem(settingName, checkbox.checked)
		if (checkbox.checked) {
			body.classList.add(bodyClass)
		} else {
			body.classList.remove(bodyClass)
		}
	}
	
	settingElement.addEventListener("change", checked)
	settingElement.checked = localStorage.getItem(settingName) === "true"
	checked({target: settingElement})
}

setUpSettingsListener("settings-compact-mode", "compact")
setUpSettingsListener("settings-hide-testers", "hidden-testers")
setUpSettingsListener("settings-dark-mode", "dark")
setUpSettingsListener("settings-pattern-highlighting", "no-pattern-highlights")