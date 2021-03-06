var sips = JSON.parse(sessionStorage.getItem('^sips^')) || {};

function parse_url(l_url) {
	return l_url.replace(/^(([^:/?#]+):)?(\/\/([^/?#]*)|\/\/\/)?([^?#]*)(\\?[^#]*)?(#.*)?/,'$3').replace('//', '');
}

function set_badge(ip) {
	var bdg = (ip) ? ip.substr(ip.lastIndexOf('.') + 1) : '',
		bdgColor = (sips && sips.color && sips.color.defaultColor ? sips.color.defaultColor : '#ff0000'),
		mnems = JSON.parse(sessionStorage.getItem('^mnems^')) || {};
	if (mnems[ip]) {
		bdg = mnems[ip].mnem;
		bdgColor = mnems[ip].color || bdgColor;
	}
	chrome.browserAction.setBadgeText({'text':bdg});
	chrome.browserAction.setBadgeBackgroundColor({'color':bdgColor});
}

function tab_changed_now_update (tab_id) {
	chrome.tabs.get(tab_id, function (ctab) {
		if (ctab && ctab.url && (ctab.url.length > 0)) {
			set_badge(sessionStorage.getItem(parse_url(ctab.url)));
		}
	});
}

function update_current_tab () {
	chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT, {'populate':true}, function (win) {
		var ctab_id, tab_i, tab_len;
		if (win && win.tabs) {
			tab_len = win.tabs.length;
			for (tab_i = 0; tab_i < tab_len; tab_i += 1) {
				if (win.tabs[tab_i].active) {
					ctab_id = win.tabs[tab_i].id;
				}
			}
			if (ctab_id) {
				tab_changed_now_update(ctab_id);
			}
		}
	});
}

// extension button clicked, make sure badge is correct and toggle ip address on page
chrome.browserAction.onClicked.addListener(function (tab) {
	chrome.tabs.getSelected(null, function (tab) {
		tab_changed_now_update(tab.id);
		chrome.tabs.sendMessage(tab.id, {'toggle':true}, function () {});
	});
});

// response to the content script executed for the page
chrome.extension.onMessage.addListener(function (request, sender, response_func) {
	var response = {},
		myURL = parse_url(sender.tab.url),
		myIP = sessionStorage.getItem(myURL),
		myServer = sessionStorage.getItem(myURL+"_server"),
		mnems = JSON.parse(sessionStorage.getItem('^mnems^')) || {},
		color = (mnems[myIP] && mnems[myIP].color) ? mnems[myIP].color : (sips.color && sips.color.defaultColor ? sips.color.defaultColor : undefined);
		sips = JSON.parse(sessionStorage.getItem('^sips^')) || {};
	if (request.hasOwnProperty('load') && request.load) {
		response.visible = sips.hb;
		response.still = !! sips.hbStill;
		response.color = color;
		response.myURL = myURL;
		response.myIP = myIP;
		response.myServer = myServer
		response_func(response);
	}
});

// listeners for the IP address changes
chrome.webRequest.onCompleted.addListener(function (d) {
	if (d.url && d.ip) {
		try {
			sessionStorage.setItem(parse_url(d.url), d.ip);
		} catch (e) {
			// storage full - figure out how to delete 'old' url's
		}
		update_current_tab();
	}
}, {'urls' : [], 'types' : ['main_frame']});
chrome.tabs.onUpdated.addListener(function (tab_id, tab) {
	update_current_tab();
});
chrome.tabs.onActivated.addListener(function (active_info) {
	update_current_tab();
});
chrome.windows.onFocusChanged.addListener(function (window_id) {
	update_current_tab();
});

// Get Server header and store
chrome.webRequest.onHeadersReceived.addListener(function (d) {
	var h, s="-"
	// console.table(d)
	if (!(h = d.responseHeaders)) cl("responseHeaders not found in details!")

	if (d.url) {

		h.forEach((v,i,a)=>{
			if (v.name == 'server'){
				s = v.value
			}
		})
		
		try {
			sessionStorage.setItem(parse_url(d.url)+"_server", s);
		} catch (e) {
			// storage full - figure out how to delete 'old' url's
		}
	}

}, {urls: ["<all_urls>"],types: ["main_frame"]}, ["responseHeaders"]);
