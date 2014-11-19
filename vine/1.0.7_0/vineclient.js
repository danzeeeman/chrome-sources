var VineClient = {
    appVersion: null,
    avatarRQ: null,
    client: null,
    sessionID: null,
    jsonRQ: false,
    version: "1.0.7",
    videoRQ: false,
    thumbRQ: false,

    init: function () {
        var self = this;

        // Catch All API Requests
        chrome.webRequest.onBeforeRequest.addListener(function (details) {
            var url = details.url;
            if (url.slice(-1) == "?") {
                url = url.replace('?','');
            }
            self.client = details.tabId;
            self.request({url: url, method: details.method, formData: (details.requestBody) ? details.requestBody.formData : {}});

            return {cancel: true};
        },{urls: ["https://api.vineapp.com/*"], types: ["main_frame","sub_frame"]}, ["blocking","requestBody"]);

        // Change API Request Headers
        chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
            var h = [];

            for (var i = 0;i < details.requestHeaders.length;i++) {
                switch (details.requestHeaders[i].name) {
                    case 'User-Agent':
                        if (details.url.contains('serve')) {
                            h.push({name: 'User-Agent', value: "vine/106 CFNetwork/672.0.8 Darwin/14.0.0"});
                        } else {
                            h.push({name: 'User-Agent', value: "iphone/106 (iPhone; iOS 7.0.4; Scale/2.00)"});
                        }
                    break;

                    case 'Content-Type':
                        if (self.avatarRQ) {
                            h.push({name: 'Content-Type', value: 'image/jpeg'});
                            self.avatarRQ = false;
                        } else if (self.jsonRQ) {
                            h.push({name: 'Content-Type', value: 'application/json'});
                            self.jsonRQ = false;
                        } else if (self.videoRQ) {
                            h.push({name: 'Content-Type', value: 'video/mp4'});
                            self.videoRQ = false;
                        } else if (self.thumbRQ) {
                            h.push({name: 'Content-Type', value: 'image/jpeg'});
                            self.thumbRQ = false;
                        } else {
                            h.push({name: 'Content-Type', value: 'application/x-www-form-urlencoded'});
                        }
                    break;

                    case 'Connection':
                        h.push({name: 'Connection', value: 'keep-alive'});
                    break;

                    case 'Accept-Encoding':
                        h.push({name: "Accept-Encoding", value: 'gzip,deflate'});
                    break;

                    case 'Accept-Language':
                        h.push({name: "Accept-Language", value: 'en;q=1, fr;q=0.9, de;q=0.8, zh-Hans;q=0.7, zh-Hant;q=0.6, ja;q=0.5'});
                    break;

                    case 'Origin': case 'Referer':
                        // Skip
                    break;

                    default:
                        h.push({name: details.requestHeaders[i].name, value: details.requestHeaders[i].value});
                    break;
                }
            }

            // Add Vine Headers
            h.push({name: "Proxy-Connection", value: 'keep-alive'});
            h.push({name: "X-Vine-Client", value: 'ios/' + self.appVersion});
            if (self.sessionID) {
                h.push({name: "vine-session-id", value: self.sessionID});
            }

            // Return Headers
            return {requestHeaders: h};
        },{urls: ["https://api.vineapp.com/*","https://media.vineapp.com/*"], types: ["image","main_frame","other","sub_frame","xmlhttprequest"]}, ["blocking","requestHeaders"]);

        // Upload To S3 Bucket
        chrome.webRequest.onCompleted.addListener(function (details) {
            // Loop through response headers to find filename
            var filename,error;
            for (var i = 0;i < details.responseHeaders.length;i++) {
                var value = details.responseHeaders[i].value;
                switch (details.responseHeaders[i].name) {
                    case 'X-App-Version':
                        self.appVersion = value;
                    break;

                    case 'X-Upload-Error':
                        error = value;
                    break;

                    case 'X-Upload-Filename':
                        filename = value;
                    break;
                }
            }

            if (error) {
                self.queryClient({type: 'upload-error', data: error});
            } else {
                // Progress
                self.queryClient({type: 'upload-progress'});

                // Upload Video To Vine CDN
                if (details.url.contains('upload-avatar')) {
                    self.upload('avatar',filename);
                } else if (details.url.contains('upload-video')) {
                    self.upload('video',filename,function () {
                        self.upload('thumb',filename);
                    });
                }
            }

            // Set Client
            self.client = details.tabId;
        },{urls: ["https://client.vineclient.com/ajax/upload-avatar","https://client.vineclient.com/ajax/upload-video"], types: ["main_frame","sub_frame","xmlhttprequest"]}, ["responseHeaders"]);

        // Get S3 Bucket Key
        chrome.webRequest.onCompleted.addListener(function (details) {
            // Loop through response headers to find filename
            var key;
            for (var i = 0;i < details.responseHeaders.length;i++) {
                if (details.responseHeaders[i].name == "X-Upload-Key") {
                    key = details.responseHeaders[i].value;
                }
            }

            // Set Upload Key
            var type;
            if (details.url.contains("videos/")) {
                type = "videoUrl";
            } else if (details.url.contains("thumbs/")) {
                type = "thumbnailUrl";
            } else if (details.url.contains("avatars/")) {
                type = "avatarUrl";
            }
            self.queryClient({type: 'set-upload-key', data: "{type:'" + type + "',key:'" + key + "'}"});

        },{urls: ["https://media.vineapp.com/upload/*"], types: ["xmlhttprequest"]}, ["responseHeaders"]);

        // Messaging
        chrome.runtime.onMessage.addListener(function (request,sender,sendResponse) {
            switch (request.type) {
                case 'setClient':
                    self.client = sender.tab.id;
                    sendResponse({version: self.version});
                break;

                case 'setSession':
                    self.sessionID = request.sessionID;
                    self.appVersion = request.appVersion;
                break;
            }
        });

        // Extension Icon Click Action
        chrome.browserAction.onClicked.addListener(function () {
            chrome.tabs.create({url: "https://client.vineclient.com"});
        });
    },

    upload: function (type,filename,callback) {
        var self = this,
            dataURL,
            cdnURL,
            content;

        // Set Content Type and Endpoints
        if (type == "avatar") {
            this.avatarRQ = true;
            content = "image/jpeg";
            dataURL = "https://client.vineclient.com/ajax/avatar";
            cdnURL = "https://media.vineapp.com/upload/avatars/" + this.appVersion + ".jpg";
        } else if (type == "video") {
            this.videoRQ = true;
            content = "video/mp4";
            dataURL = "https://client.vineclient.com/ajax/video";
            cdnURL = "https://media.vineapp.com/upload/videos/" + filename;
        } else if (type == "thumb") {
            this.thumbRQ = true;
            content = "image/jpeg";
            dataURL = "https://client.vineclient.com/ajax/thumb";
            cdnURL = "https://media.vineapp.com/upload/thumbs/" + filename + ".jpg";
        }

        // Data Request
        var dataRQ = new XMLHttpRequest;
        dataRQ.responseType = "arraybuffer";
        dataRQ.onload = function (ev) {
            var xhr = ev.target,
                data = new Blob([xhr.response],{type: content});
            self.queryClient({type: 'upload-progress'});

            var uploadRQ = new XMLHttpRequest();
            uploadRQ.open("PUT",cdnURL,true);
            uploadRQ.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200 && callback) {
                        callback.call(self);
                    } else if (this.status != 200) {
                        self.queryClient({type: 'upload-error', data: 'An error has occured during the uploading sequence. Please try again later.'});
                    }
                }
            }
            uploadRQ.send(data);
        };
        dataRQ.open("GET",dataURL + '/' + filename,true);
        dataRQ.send();
    },

    request: function (details) {
        var self = this,
            rq = new XMLHttpRequest,
            id = details.formData.requestid[0];
        rq.onreadystatechange = function () {
            if (this.readyState == 4) {
                var r = this.responseText,
                    d;
                // Check if response text is JSON
                if (r.match(/^\s*(?:\[.*]|\{.*\})\s*$/)) {
                    d = JSON.parse(r);
                }

                // Handle Response
                if (this.status == 200) {
                    // Replace 64 Bit Integers With Strings
                    r = r.replace(/"anchor": (\d+)/g, '"id": "$1"');
                    r = r.replace(/"id": (\d+)/g, '"id": "$1"');
                    r = r.replace(/"commentId": (\d+)/g, '"commentId": "$1"');
                    r = r.replace(/"tagId": (\d+)/g, '"tagId": "$1"');
                    r = r.replace(/"userId": (\d+)/g, '"userId": "$1"');
                    r = r.replace(/"postId": (\d+)/g, '"postId": "$1"');
                    r = r.replace(/"myRepostId": (\d+)/g, '"myRepostId": "$1"');
                    r = r.replace(/"repostId": (\d+)/g, '"repostId": "$1"');

                    // Extract Session ID from response
                    if (d && d.data.key) {
                        self.sessionID = d.data.key;
                    }
                } else {
                    // Format JSON For Response Object
                    var error = (d) ? d.error : this.status + " - " +  httpStatusCodes[this.status].name,
                        type = (d && d.error) ? "error" : "notice";
                    r = "{code: " + ((d && d.code) ? d.code : this.status) + ",success: false,error: \"" + error + "\",type: \"" + type + "\"}";
                }

                // Broadcast Response To Client Tab
                self.queryClient({id: id, type: 'request', data: r});
            }
        };

        // Set Method & Build Request Data
        var data = "",
            method = details.formData.method[0];
        if (details.formData.json) {
            data = {};
            self.jsonRQ = true;
            Object.keys(details.formData).map(function(k) {
                var v = details.formData[k][0];
                if (k != "requestid" && k != "json" && k != "method" && k != "entities") {
                    data[k] = v;
                } else if (k == "entities") {
                    v = v.stripslashes();
                    data[k] = JSON.parse(v);
                }
            });
            data = JSON.stringify(data,null,'\t');
            data = data.replace('"entities": ""','"entities": []');
        } else {
            data = [];
            Object.keys(details.formData).map(function(k) {
                if (k != "requestid" && k != "json" && k != "method") {
                    data.push(k + '=' + details.formData[k][0]);
                }
            });
            data = data.join('&');
        }

        if (method == "GET") {
            details.url += "?" + data;
            data = "";
        }
        rq.open(method,details.url,true);
        rq.send(data);
    },

    queryClient: function (details) {
        chrome.tabs.query({active: true, currentWindow: true}, function () {
            chrome.tabs.sendMessage(this.client,details);
        }.bind(this));
    }
}
VineClient.init.call(VineClient);