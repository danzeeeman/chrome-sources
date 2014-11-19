var YO_API_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJzZVRva2VuIjoicDFseXU5dGt4TDlQaFkzUzlXSENyMklIQyIsImNyZWF0ZWQiOjE0MTQyMDczOTIsInVzZXJJRCI6InkwbnlSak5RckQiLCJ1c2VybmFtZSI6IlRHUlJUVCJ9.HvYKmWOwWJt1y7dE6wCaeCmSuKv5_pAkLJ2R4Jr8WdA",Session=Backbone.Model.extend({initialize:function(){null===localStorage.getItem("com.yo.token")?this.set("loggedIn",!1):this.set("loggedIn",!0),this.on("destroy",function(){localStorage.removeItem("com.yo.token"),localStorage.removeItem("com.yo.contacts"),this.trigger("loggedOut")},this)},login:function(a,b,c){this.requestToken(a,function(a){localStorage.setItem("com.yo.token",a),this.trigger("loggedIn"),b()}.bind(this),c)},requestToken:function(a,b,c){$.ajax("http://newapi.justyo.co/rpc/login",{type:"POST",data:JSON.stringify(a)}).success(function(a){b(a.tok)}).fail(function(){console.error("error logging in"),c()})}}),Contact=Backbone.Model.extend({sendYo:function(a,b){var c=this;chrome.tabs.query({active:!0,lastFocusedWindow:!0},function(d){var e=localStorage.getItem("com.yo.token");$.ajax({type:"POST",url:"http://newapi.justyo.co/rpc/yo",headers:{Authorization:"Bearer "+e},data:JSON.stringify({to:c.get("name"),link:d[0].url})}).success(function(){a()}).fail(function(a){b(a)})})}}),Contacts=Backbone.Collection.extend({model:Contact,initialize:function(){if(localStorage.getItem("com.yo.contacts")){var a=JSON.parse(localStorage.getItem("com.yo.contacts"));this.populateContacts(a)}this.requestContacts(function(a){this.updateLocalStorage(a),this.populateContacts(a)}.bind(this)),this.on("contact:updateLocalStorage",function(a){var b=JSON.parse(localStorage.getItem("com.yo.contacts")),c=b.indexOf(a.get("name"));b.unshift(b.splice(c,1)[0]),localStorage.setItem("com.yo.contacts",JSON.stringify(b))}),this.on("contact:reorder",function(a){this.unshift(this.remove(a)),this.trigger("rerender")}),this.on("remove",function(a){this.removeContactFromLocalStorage(a)})},requestContacts:function(a){var b=localStorage.getItem("com.yo.token");$.ajax("http://newapi.justyo.co/rpc/get_contacts",{type:"POST",headers:{Authorization:"Bearer "+b}}).done(function(b){a(b.contacts)}.bind(this)).fail(function(){console.error("error retrieving list of contacts")})},updateLocalStorage:function(a){for(var b=this.parseLocalStorage(),c=0;c<a.length;c++)-1===b.indexOf(a[c])&&b.push(a[c]);localStorage.setItem("com.yo.contacts",JSON.stringify(b))},populateContacts:function(a){for(var b=0;b<a.length;b++)this.findWhere({name:a[b]})||this.add(new Contact({name:a[b]}));this.trigger("contacts:loaded")},parseLocalStorage:function(){var a;return a=localStorage.getItem("com.yo.contacts")?JSON.parse(localStorage.getItem("com.yo.contacts")):[]},removeContactFromLocalStorage:function(a){var b=this.parseLocalStorage(),c=b.indexOf(a.get("name"));b.splice(c,1),localStorage.setItem("com.yo.contacts",JSON.stringify(b))}}),AddContact=Backbone.Model.extend({requestAddContact:function(a){var b=localStorage.getItem("com.yo.token");$.ajax("http://newapi.justyo.co/rpc/add",{type:"POST",headers:{Authorization:"Bearer "+b},data:JSON.stringify({username:a})}).done(function(){}).fail(function(){})}}),HamburgerView=Backbone.View.extend({className:"hamburger alizarin",events:{click:"handleClick"},template:_.template('<img src="images/logout.png" class="hamburger-sign-out"></img>'),render:function(){return this.$el.html(this.template()),this.$el},handleClick:function(){this.model.destroy()}}),alizarin="#e74c3c",yoColors={turquoise:"#1ABC9C",emerald:"#2ECC71",peter:"#3498DB",asphalt:"#34495E",green:"#16A085",sunflower:"#F1C40F",belize:"#2980B9",wisteria:"#8E44AD",alizarin:"#e74c3c",amethyst:"#9B59B6"},ContactView=Backbone.View.extend({tagName:"li",events:{mousedown:"handleMouseDown",mouseup:"handleMouseUp"},template:_.template('<span class="contact-name"><%= name %></span>'),render:function(){return this.$el.html(this.template(this.model.attributes)),this.$el},handleMouseDown:function(a){var b=this;if(1!==a.which||"CANCELED"===b.$el.find("span").text())return!1;b.initialTime=Date.now(),b.percentLoaded=0;var c=b.$el.attr("class").toString().split(" ")[1],d=(yoColors[c],!1);b.updateLoop=setInterval(function(){var a=Date.now();if(b.elapsed=a-b.initialTime,b.elapsed>300){b.percentLoaded=Math.min(Math.round(100*(b.percentLoaded+.59))/100,100),b.$el.removeClass("long").find("span").text("SENDING LINK");var c=100-b.percentLoaded+"% "+b.percentLoaded+"%";b.$el.css("background-position",c),b.percentLoaded>=100&&(clearInterval(b.updateLoop),d||(b.initiateYo({longPress:!0}),d=!0))}},10)},handleMouseUp:function(){clearInterval(this.updateLoop),void 0===this.elapsed||this.elapsed<300?this.initiateYo({longPress:!1}):this.percentLoaded<100&&(this.$el.css("background-position","100% 0%"),this.$el.removeClass("long").find("span").text("CANCELED"),setTimeout(function(){this.model.trigger("rerender")}.bind(this),2e3))},initiateYo:function(a){var b=this,c=b.$el.attr("class").toString().split(" ")[1],d=$("<img>");a.longPress?d.attr("src","images/spiffygif_alizarin_60x60.gif"):d.attr("src","images/spiffygif_"+c+"_60x60.gif"),b.$el.html(d),b.model.sendYo(function(){b.$el.removeClass("long"),b.$el.removeClass("extra-long"),b.$el.html($("<span>").text("SENT YOLINK!").addClass("contact-name"));var a=b.$el.height(),c=$(".yo-contact").index(b.$el)*b.$el.height(),d=a;$(".contact-list").animate({scrollTop:"0"},300),b.$el.css({"z-index":-1}),b.$el.animate({top:"-="+c},300,function(){b.model.trigger("contact:updateLocalStorage",b.model),setTimeout(function(){b.model.trigger("contact:reorder",b.model)},2e3)}),b.$el.parent().find("li").each(function(){$(this)!==b.$el&&$(this).position().top<b.$el.position().top&&$(this).animate({top:"+="+d},300)})},function(a){b.model.trigger("rerenderInTwoSeconds"),void 0!==a.responseJSON&&"NO SUCH USER"===a.responseJSON.error.message?(b.$el.html($("<span>").html("FAILED YO: <br>NO SUCH USER").addClass("contact-name")),b.$el.addClass("long"),b.$el.removeClass("extra-long"),b.model.trigger("removeContact",b.model)):(b.$el.html($("<span>").text("FAILED! DO YOU HAVE INTERNET?").addClass("contact-name")),b.$el.addClass("long"))})}});$.fn.textWidth=function(){var a=$(this).html(),b="<span>"+a+"</span>";$(this).html(b);var c=$(this).find("span:first").width();return $(this).html(a),c};var ContactsView=Backbone.View.extend({el:"ul.contact-list",className:"contacts-view contact-list",initialize:function(){this.render(),this.listenTo(this.model,"contacts:loaded",this.render),this.listenTo(this.model,"rerender",this.render),this.listenTo(this.model,"rerenderInTwoSeconds",this.renderInTwoSeconds),this.listenTo(this.model,"scrollDownToBottom",this.scrollDown)},scrollDown:function(){var a=this.model.length;this.$el.animate({scrollTop:60*a},300)},renderInTwoSeconds:function(){setTimeout(function(){this.render()}.bind(this),2e3)},render:function(){var a=this;a.$el.html(""),a.model.forEach(function(b,c){var d=new ContactView({model:b});a.$el.append(d.render().addClass("yo-contact").addClass(orderedColors[c%orderedColors.length]))},a);var b=orderedColors[this.model.length%orderedColors.length];addContact.set("color",b),a.$el.append(new AddContactView({model:addContact}).render()),a.$el.append(new HamburgerView({model:session}).render()),$(".contact-list").find("span.contact-name").each(function(){var b=function(){var a=parseInt($(this).css("font-size")),b=$(this).height();return b/a};$(this).textWidth()>260&&$(this).parent().addClass("long");var c=b.call(this);c>2&&($(this).parent().removeClass("long"),$(this).parent().addClass("extra-long")),c=b.call(this);var d=$(this).text(),e=a.model.findWhere({name:d});if(3>=c)e.set("displayName",d),e.set("truncate",!1);else{var f,g,h=d.indexOf("From");for(h>=0?(f=d.slice(0,h),g=d.slice(h,d.length)):(f=d.slice(0,d.length-10),g=d.slice(d.length-10,d.length));c>3;){c=b.call(this),f=c>4?f.slice(0,f.length-10):f.slice(0,f.length-1);var i=f+"..."+g;$(this).text(i)}void 0===e.get("displayName")?e.set("displayName",i):e.get("displayName").length<i.length?$(this).text(e.get("displayName")):e.set("displayName",i)}})}}),orderedColors=["turquoise","emerald","peter","asphalt","green","sunflower","belize","wisteria"],LoginView=Backbone.View.extend({el:"div.login-view",className:"login-view",events:{"submit form":"handleFormSubmit","keydown .username":"keydownUsername","keydown .passcode":"keydownPasscode"},template:_.template('<form>\n<input type="text" name="username" placeholder="USERNAME" class="turquoise login-view-item username">\n<input type="password" name="password" placeholder="PASSCODE" class="emerald login-view-item passcode">\n<input type="submit" value="TAP TO LOGIN" class="peter login-view-item submit">\n</form>'),render:function(){return this.$el.html(this.template()),this.$el},handleFormSubmit:function(a){var b=this;a.preventDefault();var c=$("<img>").attr("src","images/spiffygif_peter_60x60.gif").addClass("spiffy-gif");b.$el.find("input:last").hide(),b.$el.find("form").append($("<div>").addClass("login-view-item peter").html(c)),b.model.login({username:b.$el.find("input[name=username]").val().toUpperCase(),password:b.$el.find("input[name=password]").val()},function(){},function(){b.$el.find("input:last").val("FAILED").show(),b.$el.find(".spiffy-gif").parent("div.peter.login-view-item").detach()})},keydownUsername:function(){var a=this.$el.find(".username");setTimeout(function(){a.val().length>0?(a.css("text-align","center"),a.css("padding-left","0")):(a.css("text-align","left"),a.css("padding-left","40px"));var b=Math.max(30-(Math.max(a.val().length,10)-10),16);a.css("font-size",b+"px")},0)},keydownPasscode:function(){var a=this.$el.find(".passcode");setTimeout(function(){a.val().length>0?(a.css("text-align","center"),a.css("padding-left","0")):(a.css("text-align","left"),a.css("padding-left","45px"))},0)}}),AddContactView=Backbone.View.extend({tagName:"li",className:"add-contact-view",events:{click:"handleClick","submit form":"handleFormSubmit",keydown:"validateInput","paste input":"validateInput"},staticTemplate:_.template('<div class="add-contact-input plus-sign">+</div>'),formTemplate:_.template('<form>\n<input type="text" name="username" placeholder="+" class="add-contact-input" autofocus>\n</form>'),render:function(){return this.$el.html(this.staticTemplate()),this.$el.find("div").addClass(this.model.get("color")),this.model.set("clicked",!1),this.$el},handleClick:function(){this.model.get("clicked")||(this.$el.html(this.formTemplate()),this.$el.find("input").addClass(this.model.get("color")),this.model.set("clicked",!0));var a=this.$el.find("input");a.trigger("focus"),0===a.val().length&&(a.css("text-align","left"),a.attr("placeholder","TYPE USERNAME TO ADD"),a.css("font-size","18px"),a.css("padding-left","12px"),this.$el.parent().find(".hamburger").hide())},validateInput:function(){var a=this.$el.find("input");setTimeout(function(){if(a.val(a.val().replace(/[^\w\s\+]/gi,"")),a.val().length>0){a.css("text-align","center"),a.css("padding-left","0");var b=Math.max(30-(Math.max(a.val().length,10)-10),16);a.css("font-size",b+"px")}else a.css("text-align","left"),a.css("font-size","18px"),a.css("padding-left","12px")},0)},handleFormSubmit:function(a){a.preventDefault();var b=this.$el.find("input").val().toUpperCase();this.model.trigger("newContact",b),this.model.requestAddContact(b)}}),session=new Session,addContact=new AddContact,loginView=new LoginView({model:session});loginView.render(),loginView.$el.hide();var contacts,contactsView;$(function(){var a=function(){contacts=new Contacts,contacts.on("removeContact",function(a){contacts.remove(a)}),contactsView=new ContactsView({model:contacts}),$(".login-view").hide(),$(".contact-list").show()},b=function(){loginView.render(),$(".login-view").show(),$(".contact-list").hide(),$(".contact-list").html("")};session.get("loggedIn")?a():b(),session.on("loggedIn",function(){a()}),session.on("loggedOut",function(){b()}),addContact.on("newContact",function(a){contacts.add(new Contact({name:a})),contacts.updateLocalStorage([a]),contacts.trigger("rerender"),contacts.trigger("scrollDownToBottom")})});