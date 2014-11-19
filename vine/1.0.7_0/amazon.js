// Change Request Headers For Amazon Requests
chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
    var h = [];

    for (var i = 0;i < details.requestHeaders.length;i++) {
        switch (details.requestHeaders[i].name) {
            case 'Origin':
                // Skip
            break;

            case 'Referer':
                var ref = details.url.match(/\&vcref\=(.*)/g);
                if (ref && ref.length) {
                    h.push({name: "Referer", value: ref[0].replace("&vcref=","")});
                }
            break;

            default:
                h.push({name: details.requestHeaders[i].name, value: details.requestHeaders[i].value});
            break;
        }
    }

    // Return Headers
    return {requestHeaders: h};
},{urls: ["http://www.amazon.com/*"], types: ["image","main_frame","other","sub_frame","xmlhttprequest"]}, ["blocking","requestHeaders"]);