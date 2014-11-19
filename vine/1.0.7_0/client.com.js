// Client
chrome.runtime.onMessage.addListener(function (details) {
    var b = document.getElementById('vineclient'),
        s = document.createElement('script');
    switch (details.type) {
        case 'request':
            s.innerHTML = "if (Handler) { Handler.respond({id: '" + details.id + "',data:" + details.data + "}); }";
        break;

        case 'upload-error':
            s.innerHTML = "if (window.fireEvent) { window.fireEvent('Upload.error','" + details.data + "'); }";
        break;

        case 'upload-progress':
            s.innerHTML = "if (window.fireEvent) { window.fireEvent('Upload.progress'); }";
        break;

        case 'set-upload-key':
            s.innerHTML = "if (window.fireEvent) { window.fireEvent('Upload.setKey'," + details.data + "); }";
        break;
    }

    // Check body exists
    if (b) {
        b.appendChild(s);
        b.removeChild(s);
    }
});