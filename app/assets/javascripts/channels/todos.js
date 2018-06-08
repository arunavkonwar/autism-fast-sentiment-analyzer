App.todos = App.cable.subscriptions.create("TodosChannel", {
  // Called when the subscription is ready for use on the server
  connected: function () {},

  // Called when the subscription has been terminated by the server
  disconnected: function () {},

  // Called when there's incoming data on the websocket for this channel
  received: function (cmd) {
    parts = cmd.split("|");
    parts.forEach(function (part) {
      switch(part[0]) {
        case "A":
          // See if it's in there already
          // (what if it's supposed to add another link to an item that's alrady showing???)
          var partObj = JSON.parse(part.substring(1, 99999));
          if (partObj.item_id) {
            var itemObjs = allLists.filter(function (x) {return x.item_id === partObj.item_id});
            if (itemObjs.length > 0) {
              itemObjs.forEach(function (x) {
                var list = document.getElementsByClassName('link' + x.id.toString())[0];
                if (list)
                  list.firstChild.lastChild.firstChild.innerHTML = "NEW CONTENT" + cmd.content;
                  $(list).removeClass("editPending");
              });
            }
              // %%%TODO
              // Put in edit code -- and perhaps borrow some of the below for position updates
            else {
              // Put this new one in along with the same parent_id stuff
              var inSameParent = false;
              for (var idx = 0; idx < allLists.length; ++idx) {
                var list = allLists[idx];
                if (list.parent_id === partObj.parent_id) {
                  inSameParent = true;
                  if (list.position > partObj.position)
                    break;
                } else {
                  if (inSameParent)
                    break;
                }
              }
              allLists.splice(idx, 0, partObj);
              // Perhaps this Add is coming in from an undelete, in which case if the name matches, clean things up
              if (txtName.value === partObj.name)
                txtName.value = "";
              var newLI = addItem(partObj);
            }
          } else {  // No item_id present -- must be just expanding / collapsing
            // There could be multiple tabs open showing the same link, so although the
            // primary one would have instantly shown expanding / collapsing other tabs
            // for this user need to be updated as well.
            changeExpanded(partObj, function (listObj, obj) {
              return listObj.is_detail_expanded = obj.is_detail_expanded;
            });
          }
          break;
        case "M":
          var parts = part.substring(1, 999).split(",");
          var linkId = parseInt(parts[0]);
          var listObj = allLists.find(function (x) {return x.id === linkId});
          listObj.parent_id = (parts[1] === "null" ? null : parseInt(parts[1]));
          listObj.position = parseInt(parts[2]);
          var list = document.getElementsByClassName('link' + linkId.toString())[0];
          list.setAttribute("x-position", listObj.position);

          if (parts[1] === "null")
            $(list).addClass("list");
          else  // It's becoming (or already was) an item
            $(list).removeClass("list");

          var before = {position: -2147483648};
          var after = {position: 2147483647};
          for (var i = 0; i < allLists.length; ++i) {
            var lst = allLists[i];
            // lst.link_email !== myEmail || 
            if (lst.id === linkId || lst.parent_id !== listObj.parent_id)
              continue;
            if (lst.position < listObj.position && lst.position > before.position) before = lst;
            if (lst.position > listObj.position && lst.position < after.position) after = lst;
          }
          var separator = $(list).next();
          if (separator[0].className === "sep")
            separator.detach();
          else
            separator = null;
          var parent = $(list).parent();
          list = $(list).detach();
          if (parent.find(".item").length === 0) // Take out the UL if this was the last item
            parent.detach();
          if (before.id) {
            before = document.getElementsByClassName('link' + before.id.toString())[0];
            list.insertAfter(before);
            separator.insertAfter(before);
          } else if (after.id) {
            after = document.getElementsByClassName('link' + after.id.toString())[0];
            list.insertBefore(after);
            separator.insertBefore(after);
          } else {  // First child item
            // %%% TODO: If there were two trees with the same kind of thing being
            // moved around, how do we get both perfectly?
            var parent = document.getElementsByClassName('link' + listObj.parent_id.toString())[0];
            if (parent === null)
              console.log("CAN'T FIND PARENT!!!", listObj.parent_id);
            var ul;
            if (parent.getElementsByTagName("ul").length === 0) {
              ul = document.createElement("ul");
              ul.appendChild(newSeparator());
              parent.appendChild(ul);
            } else
              ul = parent.lastChild; // We'll just expect that the last element underneath is a UL
            // if (ul.parentElement.tagName == "LI")
            //   $(list).removeClass("list");
            $(ul).append(list);
            $(ul).append(separator);
          }
          break;
        case "D":
          var linkID = parseInt(part.substring(1, 999));
          var list = document.getElementsByClassName('link' + linkID.toString())[0];
          var listObj = allLists.find(function (x) {return x.id === id});

          // Remove from allLists
          var idx = 0;
          for (; idx < allLists.length; ++idx)
            if (allLists[idx].id === linkID)
              break;
          if (idx !== allLists.length)
            allLists.splice(idx, 1);

          var separator = $(list).next();
          if (separator.hasClass("sep"))
            separator.detach();
          $(list).detach();

          break;
      }
    });
  },

  update: function () {
    return this.perform('update');
  }
});

function addItemDDEvents(item) {
  item.addEventListener("click", itemClick);

  // All drag-drop
  item.addEventListener("dragstart", itemDragStart);
  item.addEventListener("dragover", itemDragOver);
  item.addEventListener("dragleave", itemDragLeave);
  item.addEventListener("drop", itemDrop);

  // All touch
  item.addEventListener("touchstart", itemTouchStart);
}

var isChild = false, isUpper, neighbour, destination;

function itemClick(e) {
  var linkId = findLinkID(this);
  e.stopPropagation();
  var isDetailExpanded = changeExpanded({id: linkId}, function (listObj) {
    return listObj.is_detail_expanded = !listObj.is_detail_expanded;
  });
  App.todos.perform("update",
    {cmd: "A" + linkId + ',{"is_detail_expanded":"' + isDetailExpanded.toString() + '"},'}
  );
}

function changeExpanded(obj, fn) {
  var listObj = allLists.find(function (x) {return x.id === obj.id});
  var isDetailExpanded = fn(listObj, obj);

  var links = document.getElementsByClassName("link" + obj.id.toString());
  for (var i = 0; i < links.length; ++i) {
    // Last TD in the first table
    var tds = links[i].getElementsByTagName("table")[0].getElementsByTagName("td");
    var contentPane = $(tds[tds.length - 1]);
    if (isDetailExpanded)
      contentPane.removeClass("hide");
    else
      contentPane.addClass("hide");
  }
  return isDetailExpanded;
}

function itemDragStart(e) {
  if (e.originalEvent) {
    e = e.originalEvent;
    e.dataTransfer.setData("application/x-id", this.id);  // FF
  }
  e.dataTransfer.effectAllowed = "copy";
  beingDragged = this;
  e.stopPropagation();
}

function itemDragOver(e) {
  fixDrag(e, "move");
  // How far up or down are we on this LI?
  var bounds = this.getElementsByTagName("table")[0].getBoundingClientRect();
  if (this !== beingDragged.parentElement.parentElement) {
    newIsChild = (e.clientX - bounds.left) > (bounds.width * 0.70);
    // Make sure we're not trying to put a subordinate part of the tree onto a leaf part
    if (newIsChild && notAncestorOf(this, parseInt(beingDragged.getAttribute("x-linkid")))) {
      if (isChild !== newIsChild) {
        if (newIsChild) {
          $(this).addClass("addChild");
          $(visibleSep).removeClass("visibleSep");
          visibleSep = null;
          neighbour = this;
        }
        if (!newIsChild)
          $(this).removeClass("addChild");
        isChild = newIsChild;
      }
    }
  }

  if (!isChild) {
    isUpper = (e.clientY - bounds.top) < (bounds.height / 2);
    newVisibleSep = (isChild ? null : (isUpper ? this.previousSibling : this.nextSibling));
    neighbour = this;
    if (newVisibleSep)
      destination = (isUpper ? newVisibleSep.previousSibling : newVisibleSep.nextSibling);
    if (visibleSep !== newVisibleSep) {
      if (visibleSep)
        $(visibleSep).removeClass("visibleSep");
      if (newVisibleSep)
        $(newVisibleSep).addClass("visibleSep");
      visibleSep = newVisibleSep;
    }
  }
  e.stopPropagation();
}

function notAncestorOf(obj, id) {
  // Search through all IDs down to the root
  var isGood = true;
  while (obj !== null) {
    if (parseInt(obj.getAttribute("x-linkid")) === id) {
      isGood = false;
      break;
    }
    obj = obj.parentElement;
  }
  return isGood;
}

function itemDragLeave(e) {
  $(this).removeClass("addChild");
  isChild = false;
  $(visibleSep).removeClass("visibleSep");
  visibleSep = null;
}

function itemDrop(e) {
  $(visibleSep).removeClass("visibleSep");
  visibleSep = null;
  var draggedId = parseInt(beingDragged.id.substring(1, 999));
  var draggedLinkId = parseInt(findLinkID(beingDragged));
  var neighbourLinkId = parseInt(findLinkID(neighbour));

  if (isChild) {
    $(this).removeClass("addChild");
    isChild = false;
    // Final check to make sure we don't hose stuff
    if (notAncestorOf(this, draggedLinkId)) {
      App.todos.perform("update", {cmd: "M" + draggedLinkId.toString() + "," +
        neighbourLinkId.toString() + ",null"});
    }
  } else {
    if (destination === null || (beingDragged !== this && draggedLinkId !== parseInt(destination.getAttribute("x-linkid")))) {
      // Find the position (and later parent_id)
      App.todos.perform("update", {cmd: "M" + draggedLinkId.toString() + "," +
        neighbourLinkId.toString() + "," + (isUpper ? "true" : "false")});
    }
  }
  e.stopPropagation();
}





// Touch support
var touchDivWidth = 0;
var touchDivHeight = 0;
var touchDiv;
var lastTouchX = null;
var lastTouchY = null;
var lastTarget = null;
var clickTimeout = null;

function touchPreamble(e) {
  if (e.originalEvent)
    e = e.originalEvent;
  if (beingDragged === null || e.changedTouches.length > 1)
    return true;
  touchInfo = e.changedTouches[0];
}
function touchPlaceDiv(e) {
  if (lastTouchX !== touchInfo.pageX || lastTouchY !== touchInfo.pageY) {
    lastTouchX = touchInfo.pageX;
    lastTouchY = touchInfo.pageY;
    touchDiv.css("left", (lastTouchX - (touchDivWidth / 2)).toString() + "px");
    touchDiv.css("top", (lastTouchY - (touchDivHeight / 2)).toString() + "px");
  }
  e.stopPropagation();
}

function itemTouchStart(e) {
  if (changingDoneness)
    return false;
  beingDragged = this;
  if (touchPreamble(e)) {  // More than 1 finger = cancel
    beingDragged = null;
    return;
  }
  lastTouchX = null;
  lastTouchY = null;
  clickTimeout = setTimeout(realTouch, 500); // Give it half a sec to potentially end in a click
  // Prevent the screen from scrolling while we might start dragging around
  document.body.className = "freeze";
  // If we don't do this then click works to expand detail,
  // but the freeze doesn't work to hold the screen from scrolling around
  e.preventDefault();
  // This is just something that would normally happen for drags in touchPlaceDiv,
  // but waiting half a second and being asyncyronous means we need to do this now.
  e.stopPropagation();
}

function realTouch() {
  clickTimeout = null;
  var itemObj = findDraggedObj();
  touchDiv.html(itemObj.name);
  touchDiv.css("opacity", "1.0");
  touchDivWidth = touchDiv[0].clientWidth * 2;
  touchDivHeight = touchDiv[0].clientHeight * 2;
  touchPlaceDiv({stopPropagation: function () {}});
}

$(function () {
  touchDiv = $("#touchDiv");

  $("body").on("touchmove", function (e) {
    console.log("TouchMove");
    if (touchPreamble(e))
      return;
    touchPlaceDiv(e);

    // Hit the normal event handler for mouse dragover
    var target = findItem();
    if (target !== lastTarget) {
      if (lastTarget !== null && lastTarget.id !== "myLists") {
        // Note: Our dragleave doesn't need client events, so we just pass in null here
        if (lastTarget.id === "trash")
          trashDragLeave.call(lastTarget, null);
        else
          itemDragLeave.call(lastTarget, null);
      }
      lastTarget = target;
      if (target !== null && target.id !== "myLists") {
        if (target.id === "trash")
          trashDragOver.call(target,
            {dataTransfer: {}, preventDefault: function () {}, stopPropagation: function () {}});
        else
          itemDragOver.call(target, {clientX: touchInfo.clientX, clientY: touchInfo.clientY, dataTransfer: {},
            preventDefault: function () {}, stopPropagation: function () {}});
      }
    }
  }).on("touchend", function (e) {
    if (touchPreamble(e))
      return;
    var target = findItem();
    // Is it a click instead of a drag?
    if (clickTimeout && target === beingDragged) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      // Hit the normal event handler for click
      itemClick.call(target, {stopPropagation: function () {}});
      beingDragged = null;
      target = null;
    } else {
      touchDiv.css("opacity", "0.0");
      document.body.className = ""; // Unfreeze
      if (target !== null && target.id !== "myLists") {
        // Hit the normal event handler for mouse drop
        if (target.id === "trash")
          trashDrop.call(target, null);
        else
          itemDrop.call(target, {clientX: touchInfo.clientX, clientY: touchInfo.clientY, dataTransfer: {},
            preventDefault: function () {}, stopPropagation: function () {}});
      }
    }
  });

  function findItem() {
    var target = document.elementFromPoint(touchInfo.clientX, touchInfo.clientY);
    if (target.id !== "myLists" && target.id !== null && target.id !== "trash") {
      while (target !== null) {
        if ((" " + target.className + " ").indexOf(" item ") >= 0)
          break;
        target = target.parentNode;
      }
    }
    return target;
  }
});
