/**
* The MIT License (MIT)
*
* Copyright (C) 2013 Sergi Mansilla
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the 'Software'), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
* THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/'use strict';

/**
* Creates a virtually-rendered scrollable list.
* @param {object} config
* @constructor
*/
function VirtualList(config) {
    var width = (config && config.w + 'px') || '100%';
    var height = (config && config.h + 'px') || '100%';
    var itemHeight = this.itemHeight = config.itemHeight;

    this.items = config.items;
    this.generatorFn = config.generatorFn;
    this.totalRows = config.totalRows || (config.items && config.items.length);

    var scroller = VirtualList.createScroller(itemHeight * this.totalRows);
    this.container = VirtualList.createContainer(width, height);
    this.container.appendChild(scroller);

    var screenItemsLen = Math.ceil(config.h / itemHeight);
    // Cache 4 times the number of items that fit in the container viewport
    this.cachedItemsLen = screenItemsLen * 3;
    this._renderChunk(this.container, 0);

    var self = this;
    var lastRepaintY;
    var maxBuffer = screenItemsLen * itemHeight;
    var lastScrolled = 0;
	

    // As soon as scrolling has stopped, this interval asynchronouslyremoves all
    // the nodes that are not used anymore
    this.rmNodeInterval = setInterval(function(){
        if (lastScrolled>0 &&  (Date.now() - lastScrolled) > 100) {
            var badNodes = $('[data-rm="1"]');
			//alert(badNodes.length);
            badNodes.remove();
            lastScrolled=0;
        }
    }, 200);

    function onScroll(e) {
        var scrollTop = e.target.scrollTop;
        var first = parseInt(scrollTop / itemHeight) - screenItemsLen;
        first = first < 0 ? 0 : first;
        if (!lastRepaintY || Math.abs(scrollTop - lastRepaintY) > maxBuffer) {
            self._renderChunk(self.container, first);
            lastRepaintY = scrollTop;
        }
        lastScrolled = Date.now();
        e.preventDefault && e.preventDefault();
    }

    this.container.addEventListener('scroll', onScroll);
}

VirtualList.prototype.createRow = function(i) {
    var item;
    if (this.generatorFn) item = this.generatorFn(i);
    else if (this.items) {
        if (typeof this.items[i] === 'string') {
            var itemText = document.createTextNode(this.items[i]);
            item = document.createElement('div');
            item.style.height = this.itemHeight + 'px';
            item.appendChild(itemText);
        } else {
            item = this.items[i];
        }
    }
	item.className += " vrow";  //item.classList.add('vrow');
    item.style.position = 'absolute';
    item.style.top = (i * this.itemHeight) + 'px';
    return item;
};

/**
* Renders a particular, consecutive chunk of the total rows in the list. To
* keep acceleration while scrolling, we mark the nodes that are candidate for
* deletion instead of deleting them right away, which would suddenly stop the
* acceleration. We delete them once scrolling has finished.
*
* @param {Node} node Parent node where we want to append the children chunk.
* @param {Number} from Starting position, i.e. first children index.
* @return {void}
*/
VirtualList.prototype._renderChunk = function(node, from) {
    var finalItem = from + this.cachedItemsLen;
    if (finalItem > this.totalRows) finalItem = this.totalRows;

    // Append all the new rows in a document fragment that we will later append to
    // the parent node
    var fragment = document.createDocumentFragment();
    for (var i = from; i < finalItem; i++) {
        fragment.appendChild(this.createRow(i));
    }

    // Hide and mark obsolete nodes for deletion.
    for (var j = 1, l = node.childNodes.length; j < l; j++) {
        node.childNodes[j].style.display = 'none';
        node.childNodes[j].setAttribute('data-rm', '1');
    }
    node.appendChild(fragment);
};

VirtualList.createContainer = function(w, h) {
    var c = document.createElement('div');
    c.style.width = w;
    c.style.height = h;
    c.style.overflow = 'auto';
    c.style.position = 'relative';
    c.style.padding = 0;
    c.style.border = '1px solid black';
    return c;
};

VirtualList.createScroller = function(h) {
    var scroller = document.createElement('div');
    scroller.style.opacity = 0;
    scroller.style.position = 'absolute';
    scroller.style.top = 0;
    scroller.style.left = 0;
    scroller.style.width = '1px';
    scroller.style.height = h + 'px';
    return scroller;
};

//addEventListener polyfill 1.0 / Eirik Backer / MIT Licence
(function(win, doc){
	if(win.addEventListener)return;		//No need to polyfill
 
	function docHijack(p){var old = doc[p];doc[p] = function(v){return addListen(old(v))}}
	function addEvent(on, fn, self){
		return (self = this).attachEvent('on' + on, function(e){
			var e = e || win.event;
			e.preventDefault  = e.preventDefault  || function(){e.returnValue = false}
			e.stopPropagation = e.stopPropagation || function(){e.cancelBubble = true}
			e.target = e.srcElement;
			fn.call(self, e);
		});
	}
	function addListen(obj, i){
		if(i = obj.length)while(i--)obj[i].addEventListener = addEvent;
		else obj.addEventListener = addEvent;
		return obj;
	}
 
	addListen([doc, win]);
	if('Element' in win)win.Element.prototype.addEventListener = addEvent;			//IE8
	else{		//IE < 8
		doc.attachEvent('onreadystatechange', function(){addListen(doc.all)});		//Make sure we also init at domReady
		docHijack('getElementsByTagName');
		docHijack('getElementById');
		docHijack('createElement');
		addListen(doc.all);	
	}
})(window, document);
