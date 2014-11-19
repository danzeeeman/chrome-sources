// String Contains
String.prototype.contains = function(str,startIndex) {
    return -1 !== String.prototype.indexOf.call(this,str,startIndex);
};

// Strip Slashes
String.prototype.stripslashes = function () {
    return (this + '').replace(/\\(.?)/g, function (s,n1) {
        switch (n1) {
            case '\\':
                return '\\';
            case '0':
                return '\u0000';
            case '':
                return '';
            default:
                return n1;
        }
    });
}

// Element HasClass
Element.prototype.hasClass = function (classname) {
    if (this == null) throw new TypeError();
    return this.className.split(' ').indexOf(classname) === -1 ? false : true;
}