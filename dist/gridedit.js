(function() {
  var ActionStack, Cell, CellMatrix, Column, ContextMenu, DateCell, GenericCell, GridEdit, HTMLCell, NumberCell, Row, SelectCell, StringCell, Utilities, root,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Utilities = (function() {
    function Utilities() {}

    Utilities.prototype.setAttributes = function(el, attrs) {
      var key, value, _results;
      _results = [];
      for (key in attrs) {
        value = attrs[key];
        if (value) {
          _results.push(el.setAttribute(key, value));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    Utilities.prototype.setStyles = function(el, styles) {
      var key, value, _results;
      _results = [];
      for (key in styles) {
        value = styles[key];
        _results.push(el.style[key] = "" + value + "px");
      }
      return _results;
    };

    Utilities.prototype.clearActiveCells = function(table) {
      var activeCell, activeCells, index, redCell, redCells, _i, _j, _len, _len1;
      redCells = table.redCells;
      activeCells = table.activeCells;
      if (redCells.length > 0) {
        for (index = _i = 0, _len = redCells.length; _i < _len; index = ++_i) {
          redCell = redCells[index];
          if (redCell != null) {
            redCell.makeInactive();
          }
        }
        table.redCells = [];
      }
      if (activeCells.length > 0) {
        for (index = _j = 0, _len1 = activeCells.length; _j < _len1; index = ++_j) {
          activeCell = activeCells[index];
          if (activeCell != null) {
            activeCell.makeInactive();
          }
          if (activeCell != null) {
            activeCell.hideControl();
          }
        }
        table.activeCells = [];
      }
      table.selectionStart = null;
      table.selectionEnd = null;
      table.contextMenu.hide();
      if (table.selectedCol) {
        return table.selectedCol.makeInactive();
      }
    };

    Utilities.prototype.capitalize = function(string) {
      return string.toLowerCase().replace(/\b./g, function(a) {
        return a.toUpperCase();
      });
    };

    return Utilities;

  })();

  GridEdit = (function() {
    function GridEdit(config) {
      var key, value, _ref;
      this.config = config;
      this.element = document.querySelectorAll(this.config.element || '#gridedit')[0];
      this.headers = [];
      this.rows = [];
      this.cols = [];
      this.source = this.config.rows;
      this.redCells = [];
      this.activeCells = [];
      this.copiedCells = null;
      this.selectionStart = null;
      this.selectionEnd = null;
      this.selectedCol = null;
      this.openCell = null;
      this.state = "ready";
      this.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      this.topOffset = !this.config.topOffset ? 0 : this.config.topOffset;
      this.cellStyles = {
        activeColor: "#FFE16F",
        uneditableColor: "#FFBBB3"
      };
      if (this.config.custom) {
        _ref = this.config.custom;
        for (key in _ref) {
          value = _ref[key];
          if (key in this.config.custom) {
            this.set(key, value);
          }
        }
        delete this.config.custom;
      }
      if (this.config.initialize) {
        this.init();
      }
      this.copiedCellMatrix = null;
      this.contextMenu = new ContextMenu(this.config.contextMenuItems, this);
      this.actionStack = new ActionStack(this);
    }

    GridEdit.prototype.init = function() {
      if (this.config.beforeInit) {
        this.config.beforeInit();
      }
      this.build();
      this.events();
      this.render();
      if (this.config.afterInit) {
        this.config.afterInit();
      }
    };

    GridEdit.prototype.build = function() {
      var col, colAttributes, i, row, rowAttributes, table, tbody, thead, tr, _i, _j, _len, _len1, _ref, _ref1;
      tr = document.createElement('tr');
      _ref = this.config.cols;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        colAttributes = _ref[i];
        col = new Column(colAttributes, this);
        this.cols.push(col);
        tr.appendChild(col.element);
      }
      thead = document.createElement('thead');
      thead.appendChild(tr);
      tbody = document.createElement('tbody');
      _ref1 = this.source;
      for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
        rowAttributes = _ref1[i];
        row = new Row(rowAttributes, this);
        this.rows.push(row);
        tbody.appendChild(row.element);
      }
      table = document.createElement('table');
      Utilities.prototype.setAttributes(table, {
        id: 'editable-grid',
        "class": this.config.tableClass
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      return this.tableEl = table;
    };

    GridEdit.prototype.rebuild = function(newConfig) {
      var config, option;
      if (newConfig == null) {
        newConfig = null;
      }
      config = Object.create(this.config);
      if (newConfig !== null) {
        for (option in newConfig) {
          if (newConfig[option]) {
            config[option] = newConfig[option];
          }
        }
      }
      this.destroy();
      return this.constructor(config);
    };

    GridEdit.prototype.events = function() {
      var edit, moveTo, table;
      table = this;
      moveTo = table.moveTo;
      edit = table.edit;
      document.onkeydown = function(e) {
        var cmd, ctrl, key, openCellAndPopulateInitialValue, shift, valueFromKey;
        if (table.activeCell()) {
          key = e.keyCode;
          shift = e.shiftKey;
          ctrl = e.ctrlKey;
          cmd = e.metaKey;
          valueFromKey = function(key, shift) {
            var char;
            char = String.fromCharCode(key);
            if (!shift) {
              return char.toLowerCase();
            } else {
              return char;
            }
          };
          openCellAndPopulateInitialValue = function() {
            if (!table.openCell) {
              return table.activeCell().showControl(valueFromKey(key, shift));
            }
          };
          if (cmd || ctrl) {
            if (key && key !== 91 && key !== 92) {
              if (table.contextMenu.actionCallbacks.byControl[key]) {
                e.preventDefault();
                return table.contextMenu.actionCallbacks.byControl[key](e, table);
              }
            }
          } else {
            switch (key) {
              case 39:
                if (!table.activeCell().isBeingEdited()) {
                  return moveTo(table.nextCell());
                }
                break;
              case 9:
                if (shift) {
                  return moveTo(table.previousCell());
                } else {
                  return moveTo(table.nextCell());
                }
                break;
              case 37:
                return moveTo(table.previousCell());
              case 38:
                return moveTo(table.aboveCell());
              case 40:
                return moveTo(table.belowCell());
              case 32:
                if (!table.openCell) {
                  return edit(table.activeCell());
                }
                break;
              case 13:
                break;
              case 16:
                break;
              case 17:
                break;
              case 91:
                break;
              case 8:
                if (!table.openCell) {
                  e.preventDefault();
                  return table["delete"]();
                }
                break;
              case 46:
                if (!table.openCell) {
                  e.preventDefault();
                  return table["delete"]();
                }
                break;
              default:
                if (__indexOf.call([96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111], key) >= 0) {
                  key = key - 48;
                }
                return openCellAndPopulateInitialValue();
            }
          }
        }
      };
      window.onresize = function() {
        if (table.openCell) {
          return Utilities.prototype.setStyles(table.openCell.control, table.openCell.position());
        }
      };
      window.onscroll = function() {
        if (table.openCell) {
          return table.openCell.reposition();
        }
      };
      this.tableEl.oncontextmenu = function(e) {
        return false;
      };
      return document.onclick = function(e) {
        var _ref;
        if (!((table.isDescendant(e.target)) || (e.target === ((_ref = table.activeCell()) != null ? _ref.control : void 0) || table.contextMenu))) {
          Utilities.prototype.clearActiveCells(table);
        }
        return table.contextMenu.hide();
      };
    };

    GridEdit.prototype.render = function() {
      if (this.element.hasChildNodes()) {
        this.element = document.querySelectorAll(this.config.element || '#gridedit')[0];
      }
      return this.element.appendChild(this.tableEl);
    };

    GridEdit.prototype.set = function(key, value) {
      if (key !== void 0) {
        return this.config[key] = value;
      }
    };

    GridEdit.prototype.getCell = function(x, y) {
      var e;
      try {
        return this.rows[x].cells[y];
      } catch (_error) {
        e = _error;
      }
    };

    GridEdit.prototype.activeCell = function() {
      if (this.activeCells.length > 1) {
        return this.activeCells;
      } else {
        return this.activeCells[0];
      }
    };

    GridEdit.prototype.nextCell = function() {
      var _ref;
      return (_ref = this.activeCell()) != null ? _ref.next() : void 0;
    };

    GridEdit.prototype.previousCell = function() {
      var _ref;
      return (_ref = this.activeCell()) != null ? _ref.previous() : void 0;
    };

    GridEdit.prototype.aboveCell = function() {
      var _ref;
      return (_ref = this.activeCell()) != null ? _ref.above() : void 0;
    };

    GridEdit.prototype.belowCell = function() {
      var _ref;
      return (_ref = this.activeCell()) != null ? _ref.below() : void 0;
    };

    GridEdit.prototype.moveTo = function(toCell, fromCell) {
      var beforeCellNavigateReturnVal, direction, directionModifier, newY, oldY;
      if (toCell) {
        if (fromCell === void 0) {
          fromCell = toCell.table.activeCell();
        }
        direction = toCell.table.getDirection(fromCell, toCell);
        if (toCell.beforeNavigateTo) {
          beforeCellNavigateReturnVal = toCell.beforeNavigateTo(toCell, fromCell, direction);
        }
        if (beforeCellNavigateReturnVal !== false) {
          if (!toCell.isVisible()) {
            oldY = toCell.table.activeCell().address[0];
            newY = toCell.address[0];
            directionModifier = 1;
            if (newY < oldY) {
              directionModifier = -1;
            }
            window.scrollBy(0, (toCell != null ? toCell.position().height : void 0) * directionModifier);
          }
          toCell.makeActive();
        }
      }
      return false;
    };

    GridEdit.prototype.getDirection = function(fromCell, toCell) {
      var direction, fromAddressX, fromAddressY, toAddressX, toAddressY;
      fromAddressY = fromCell.address[0];
      toAddressY = toCell.address[0];
      fromAddressX = fromCell.address[1];
      toAddressX = toCell.address[1];
      if (fromAddressY === toAddressY) {
        if (fromAddressX > toAddressX) {
          direction = "left";
        } else if (fromAddressX < toAddressX) {
          direction = "right";
        } else {
          console.log("Cannot calculate direction going from cell " + fromCell.address + " to cell " + toCell.address);
        }
      } else if (fromAddressY > toAddressY) {
        direction = "up";
      } else if (fromAddressY < toAddressY) {
        direction = "down";
      } else {
        console.log("Cannot calculate direction going from cell " + fromCell.address + " to cell " + toCell.address);
      }
      return direction;
    };

    GridEdit.prototype.edit = function(cell, newValue) {
      if (newValue == null) {
        newValue = null;
      }
      if (newValue !== null) {
        return cell != null ? cell.edit(newValue) : void 0;
      } else {
        if (cell != null) {
          cell.edit();
        }
        return false;
      }
    };

    GridEdit.prototype["delete"] = function() {
      var cell, _i, _len, _ref, _results;
      _ref = this.activeCells;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cell = _ref[_i];
        _results.push(cell.value(''));
      }
      return _results;
    };

    GridEdit.prototype.clearActiveCells = function() {
      return Utilities.prototype.clearActiveCells(this);
    };

    GridEdit.prototype.setSelection = function() {
      var cell, col, colRange, row, rowRange, _i, _j, _k, _l, _len, _len1, _len2, _m, _ref, _ref1, _ref2, _ref3, _ref4, _results, _results1;
      if (this.selectionStart !== this.selectionEnd) {
        _ref = this.activeCells;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          cell = _ref[_i];
          cell.removeFromSelection();
        }
        this.activeCells = [];
        rowRange = (function() {
          _results = [];
          for (var _j = _ref1 = this.selectionStart.address[0], _ref2 = this.selectionEnd.address[0]; _ref1 <= _ref2 ? _j <= _ref2 : _j >= _ref2; _ref1 <= _ref2 ? _j++ : _j--){ _results.push(_j); }
          return _results;
        }).apply(this);
        colRange = (function() {
          _results1 = [];
          for (var _k = _ref3 = this.selectionStart.address[1], _ref4 = this.selectionEnd.address[1]; _ref3 <= _ref4 ? _k <= _ref4 : _k >= _ref4; _ref3 <= _ref4 ? _k++ : _k--){ _results1.push(_k); }
          return _results1;
        }).apply(this);
        for (_l = 0, _len1 = rowRange.length; _l < _len1; _l++) {
          row = rowRange[_l];
          for (_m = 0, _len2 = colRange.length; _m < _len2; _m++) {
            col = colRange[_m];
            this.rows[row].cells[col].addToSelection();
          }
        }
      }
    };

    GridEdit.prototype.data = function() {
      var cell, data, row, rowData, _i, _j, _len, _len1, _ref, _ref1;
      data = [];
      _ref = this.rows;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        row = _ref[_i];
        rowData = [];
        _ref1 = row.cells;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          cell = _ref1[_j];
          rowData.push(cell.cellTypeObject.value());
        }
        data.push(rowData);
      }
      return data;
    };

    GridEdit.prototype.repopulate = function() {
      var cell, row, _i, _len, _ref, _results;
      _ref = this.rows;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        row = _ref[_i];
        _results.push((function() {
          var _j, _len1, _ref1, _results1;
          _ref1 = row.cells;
          _results1 = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            cell = _ref1[_j];
            _results1.push(cell.value(cell.source[cell.valueKey]));
          }
          return _results1;
        })());
      }
      return _results;
    };

    GridEdit.prototype.destroy = function() {
      var key, _results;
      this.element.removeChild(this.tableEl);
      _results = [];
      for (key in this) {
        _results.push(delete this[key]);
      }
      return _results;
    };

    GridEdit.prototype.isDescendant = function(child) {
      var node;
      node = child.parentNode;
      while (node != null) {
        if (node === this.tableEl) {
          return true;
        }
        node = node.parentNode;
      }
      return false;
    };

    GridEdit.prototype.addToStack = function(action) {
      return this.actionStack.addAction(action);
    };

    GridEdit.prototype.undo = function() {
      console.log('table.undo');
      return this.actionStack.undo();
    };

    GridEdit.prototype.redo = function() {
      console.log('table.redo');
      return this.actionStack.redo();
    };

    return GridEdit;

  })();

  Column = (function() {
    function Column(attributes, table) {
      var key, value, _ref;
      this.attributes = attributes;
      this.table = table;
      this.id = this.index = this.table.cols.length;
      this.cellClass = this.attributes.cellClass;
      this.cells = [];
      this.element = document.createElement('th');
      this.textNode = document.createTextNode(this.attributes.label);
      this.element.appendChild(this.textNode);
      _ref = this.attributes;
      for (key in _ref) {
        value = _ref[key];
        this[key] = value;
      }
      delete this.attributes;
      this.events();
    }

    Column.prototype.next = function() {
      return this.table.cols[this.index + 1];
    };

    Column.prototype.previous = function() {
      return this.table.cols[this.index - 1];
    };

    Column.prototype.makeActive = function() {
      this.element.classList.add('active');
      return this.table.selectedCol = this;
    };

    Column.prototype.makeInactive = function() {
      this.element.classList.remove('active');
      return this.table.selectedCol = null;
    };

    Column.prototype.events = function() {
      var col, table;
      col = this;
      table = col.table;
      this.element.onclick = function(e) {
        var cell, _i, _len, _ref, _results;
        Utilities.prototype.clearActiveCells(table);
        col.makeActive();
        _ref = col.cells;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          cell = _ref[_i];
          _results.push(cell.addToSelection());
        }
        return _results;
      };
      return this.element.onmousedown = function(e) {
        if (e.which === 3) {
          table.contextMenu.show(e.x, e.y, col.cells[0]);
          return;
        }
        return false;
      };
    };

    return Column;

  })();

  Row = (function() {
    function Row(attributes, table) {
      var cell, col, i, _i, _len, _ref;
      this.attributes = attributes;
      this.table = table;
      this.id = this.table.rows.length;
      this.cells = [];
      this.index = this.table.rows.length;
      this.element = document.createElement('tr');
      this.editable = true;
      Utilities.prototype.setAttributes(this.element, {
        id: "row-" + this.id
      });
      _ref = this.table.cols;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        col = _ref[i];
        cell = new Cell(this.attributes[col.valueKey], this);
        this.cells.push(cell);
        this.table.cols[i].cells.push(cell);
        this.element.appendChild(cell.element);
      }
      delete this.attributes;
    }

    Row.prototype.below = function() {
      return this.table.rows[this.index + 1];
    };

    Row.prototype.above = function() {
      return this.table.rows[this.index - 1];
    };

    return Row;

  })();

  Cell = (function() {
    function Cell(originalValue, row) {
      var styleName;
      this.originalValue = originalValue;
      this.row = row;
      this.id = "" + this.row.id + "-" + this.row.cells.length;
      this.address = [this.row.id, this.row.cells.length];
      this.index = this.row.cells.length;
      this.table = this.row.table;
      this.col = this.table.cols[this.index];
      this.type = this.col.type;
      this.meta = this.col;
      this.editable = this.col.editable !== false;
      this.element = document.createElement('td');
      if (this.col.cellClass) {
        this.element.classList.add(this.col.cellClass);
      }
      this.valueKey = this.col.valueKey;
      this.source = this.table.config.rows[this.address[0]];
      this.initCallbacks();
      if (this.col.style) {
        for (styleName in this.col.style) {
          this.element.style[styleName] = this.col.style[styleName];
        }
      }
      switch (this.type) {
        case 'string':
          this.cellTypeObject = new StringCell(this);
          break;
        case 'number':
          this.cellTypeObject = new NumberCell(this);
          break;
        case 'date':
          this.cellTypeObject = new DateCell(this);
          break;
        case 'html':
          this.cellTypeObject = new HTMLCell(this);
          break;
        case 'select':
          this.cellTypeObject = new SelectCell(this);
      }
      this.events(this);
    }

    Cell.prototype.initCallbacks = function() {
      if (this.table.config.beforeEdit) {
        this.beforeEdit = this.table.config.beforeEdit;
      }
      if (this.table.config.afterEdit) {
        this.afterEdit = this.table.config.afterEdit;
      }
      if (this.table.config.beforeCellActivate) {
        this.beforeActivate = this.table.config.beforeCellActivate;
      }
      if (this.table.config.afterCellActivate) {
        this.afterActivate = this.table.config.afterCellActivate;
      }
      if (this.table.config.beforeControlInit) {
        this.beforeControlInit = this.table.config.beforeControlInit;
      }
      if (this.table.config.afterControlInit) {
        this.afterControlInit = this.table.config.afterControlInit;
      }
      if (this.table.config.beforeControlHide) {
        this.beforeControlHide = this.table.config.beforeControlHide;
      }
      if (this.table.config.afterControlHide) {
        this.afterControlHide = this.table.config.afterControlHide;
      }
      if (this.table.config.onCellClick) {
        this.onClick = this.table.config.onCellClick;
      }
      if (this.table.config.beforeCellNavigateTo) {
        return this.beforeNavigateTo = this.table.config.beforeCellNavigateTo;
      }
    };

    Cell.prototype.value = function(newValue, addToStack) {
      var oldValue;
      if (newValue == null) {
        newValue = null;
      }
      if (addToStack == null) {
        addToStack = true;
      }
      if (newValue !== null && newValue !== this.element.textContent) {
        newValue = this.cellTypeObject.formatValue(newValue);
        oldValue = this.value();
        if (this.beforeEdit) {
          this.beforeEdit(this, oldValue, newValue);
        }
        if (addToStack) {
          this.table.addToStack({
            type: 'cell-edit',
            oldValue: oldValue,
            newValue: newValue,
            address: this.address
          });
        }
        this.element.textContent = newValue;
        this.cellTypeObject.setValue(newValue);
        Utilities.prototype.setStyles(this.control, this.position());
        if (this.afterEdit) {
          this.afterEdit(this, oldValue, newValue, this.table.contextMenu.getTargetPasteCell());
        }
        return newValue;
      } else {
        return this.cellTypeObject.render();
      }
    };

    Cell.prototype.makeActive = function() {
      var beforeActivateReturnVal;
      if (this.beforeActivate) {
        beforeActivateReturnVal = this.beforeActivate(this);
      }
      if (this.beforeActivate && beforeActivateReturnVal !== false || !this.beforeActivate) {
        Utilities.prototype.clearActiveCells(this.table);
        this.showActive();
        this.table.activeCells.push(this);
        this.table.selectionStart = this;
        if (this.table.openCell) {
          this.table.openCell.edit(this.table.openCell.control.value);
        }
        if (this.afterActivate) {
          return this.afterActivate(this);
        }
      }
    };

    Cell.prototype.makeInactive = function() {
      return this.showInactive();
    };

    Cell.prototype.addToSelection = function() {
      this.showActive();
      return this.table.activeCells.push(this);
    };

    Cell.prototype.isActive = function() {
      return this.table.activeCells.indexOf(this) !== -1;
    };

    Cell.prototype.removeFromSelection = function() {
      return this.showInactive();
    };

    Cell.prototype.showActive = function() {
      var cssText;
      cssText = this.element.style.cssText;
      this.oldCssText = cssText;
      return this.element.style.cssText = cssText + ' ' + ("background-color: " + this.table.cellStyles.activeColor + ";");
    };

    Cell.prototype.showInactive = function() {
      return this.element.style.cssText = this.oldCssText;
    };

    Cell.prototype.showRed = function() {
      this.element.style.cssText = "background-color: " + this.table.cellStyles.uneditableColor + ";";
      return this.table.redCells.push(this);
    };

    Cell.prototype.showControl = function(value) {
      var beforeControlInitReturnVal, control;
      if (value == null) {
        value = null;
      }
      if (this.table.copiedCellMatrix) {
        this.table.contextMenu.hideBorders();
      }
      if (!this.editable) {
        return this.showRed();
      } else {
        if (this.beforeControlInit) {
          beforeControlInitReturnVal = this.beforeControlInit(this);
        }
        if (this.beforeControlInit && beforeControlInitReturnVal !== false || !this.beforeControlInit) {
          if (value !== null) {
            this.control.value = value;
            control = this.control;
            setTimeout(function() {
              return control.focus();
            }, 0);
          } else {
            this.cellTypeObject.initControl();
          }
          this.control.style.position = "fixed";
          Utilities.prototype.setStyles(this.control, this.position());
          this.table.element.appendChild(this.control);
          this.table.openCell = this;
          if (this.afterControlInit) {
            return this.afterControlInit(this);
          }
        }
      }
    };

    Cell.prototype.hideControl = function() {
      var beforeControlHideReturnVal;
      if (this.table.openCell !== null) {
        if (this.beforeControlHide) {
          beforeControlHideReturnVal = this.beforeControlHide(this);
        }
        if (this.beforeControlHide && beforeControlHideReturnVal !== false || !this.beforeControlHide) {
          if (this.isControlInDocument()) {
            this.control.remove();
          }
          this.table.openCell = null;
          if (this.afterControlHide) {
            return this.afterControlHide(this);
          }
        }
      }
    };

    Cell.prototype.edit = function(newValue) {
      if (newValue == null) {
        newValue = null;
      }
      if (!this.editable) {
        return this.showRed();
      } else {
        if (newValue !== null) {
          this.value(newValue);
          if (this.isBeingEdited()) {
            return this.hideControl();
          } else {
            return this.edit();
          }
        } else {
          this.showControl();
          this.control.focus();
          return this.cellTypeObject.select();
        }
      }
    };

    Cell.prototype.position = function() {
      return this.element.getBoundingClientRect();
    };

    Cell.prototype.isVisible = function() {
      var position;
      position = this.position();
      return (position.top >= this.table.topOffset) && (position.bottom <= window.innerHeight);
    };

    Cell.prototype.isControlInDocument = function() {
      return this.control.parentNode !== null;
    };

    Cell.prototype.reposition = function() {
      return Utilities.prototype.setStyles(this.control, this.position());
    };

    Cell.prototype.next = function() {
      var _ref;
      return this.row.cells[this.index + 1] || ((_ref = this.row.below()) != null ? _ref.cells[0] : void 0);
    };

    Cell.prototype.previous = function() {
      var _ref;
      return this.row.cells[this.index - 1] || ((_ref = this.row.above()) != null ? _ref.cells[this.row.cells.length - 1] : void 0);
    };

    Cell.prototype.above = function() {
      var _ref;
      return (_ref = this.row.above()) != null ? _ref.cells[this.index] : void 0;
    };

    Cell.prototype.below = function() {
      var _ref;
      return (_ref = this.row.below()) != null ? _ref.cells[this.index] : void 0;
    };

    Cell.prototype.isBefore = function(cell) {
      return cell.address[0] === this.address[0] && cell.address[1] > this.address[1];
    };

    Cell.prototype.isAfter = function(cell) {
      return cell.address[0] === this.address[0] && cell.address[1] < this.address[1];
    };

    Cell.prototype.isAbove = function(cell) {
      return cell.address[0] > this.address[0] && cell.address[1] === this.address[1];
    };

    Cell.prototype.isBelow = function(cell) {
      return cell.address[0] < this.address[0] && cell.address[1] === this.address[1];
    };

    Cell.prototype.addClass = function(newClass) {
      return this.element.classList.add(newClass);
    };

    Cell.prototype.removeClass = function(classToRemove) {
      return this.element.classList.remove(classToRemove);
    };

    Cell.prototype.isBeingEdited = function() {
      return this.control.parentNode != null;
    };

    Cell.prototype.events = function(cell) {
      var activeCells, redCells, startY, table;
      table = cell.table;
      redCells = table.redCells;
      activeCells = table.activeCells;
      this.element.onclick = function(e) {
        var onClickReturnVal;
        if (cell.onClick) {
          onClickReturnVal = cell.onClick(cell, e);
        }
        if (onClickReturnVal === false) {
          return false;
        }
      };
      this.element.ondblclick = function() {
        return cell.edit();
      };
      this.element.onmousedown = function(e) {
        if (e.which === 3) {
          table.contextMenu.show(e.x, e.y, cell);
          return;
        }
        table.state = "selecting";
        cell.makeActive();
        return false;
      };
      this.element.onmouseover = function(e) {
        if (table.state === 'selecting') {
          table.selectionEnd = cell;
          return table.setSelection();
        }
      };
      this.element.onmouseup = function(e) {
        if (e.which !== 3) {
          table.selectionEnd = cell;
          table.setSelection();
          return table.state = "ready";
        }
      };
      this.control.onkeydown = function(e) {
        var key, _ref;
        key = e.which;
        switch (key) {
          case 13:
            cell.edit(this.value);
            return (_ref = cell.below()) != null ? _ref.makeActive() : void 0;
          case 9:
            cell.edit(this.value);
            return moveTo(table.nextCell());
        }
      };
      this.cellTypeObject.addControlEvents(cell);
      if (table.mobile) {
        startY = null;
        this.element.ontouchstart = function(e) {
          startY = e.changedTouches[0].clientY;
          Utilities.prototype.clearActiveCells(table);
          if (table.openCell) {
            return table.openCell.hideControl();
          }
        };
        return this.element.ontouchend = function(e) {
          var y;
          y = e.changedTouches[0].clientY;
          if (e.changedTouches.length < 2 && (y === startY)) {
            e.preventDefault();
            return cell.edit();
          }
        };
      }
    };

    return Cell;

  })();


  /*
  
  Context Menu
  -----------------------------------------------------------------------------------------
   */

  ContextMenu = (function() {
    function ContextMenu(userDefinedActions, table) {
      var action, actionName, ctrlOrCmd, _ref, _ref1;
      this.userDefinedActions = userDefinedActions;
      this.table = table;
      ctrlOrCmd = /Mac/.test(navigator.platform) ? 'Cmd' : 'Ctrl';
      this.actionNodes = {};
      this.actionCallbacks = {
        byName: {},
        byControl: {}
      };
      this.borderedCells = [];
      this.defaultActions = {
        cut: {
          name: 'Cut',
          shortCut: ctrlOrCmd + '+X',
          callback: this.cut
        },
        copy: {
          name: 'Copy',
          shortCut: ctrlOrCmd + '+C',
          callback: this.copy
        },
        paste: {
          name: 'Paste',
          shortCut: ctrlOrCmd + '+V',
          callback: this.paste
        },
        undo: {
          name: 'Undo',
          shortCut: ctrlOrCmd + '+Z',
          callback: this.undo
        },
        redo: {
          name: 'Redo',
          shortCut: ctrlOrCmd + '+Y',
          callback: this.redo
        },
        fill: {
          name: 'Fill',
          shortCut: '',
          hasDivider: true,
          callback: this.fill
        }
      };
      this.element = document.createElement('div');
      this.element.style.position = 'fixed';
      this.menu = document.createElement('ul');
      Utilities.prototype.setAttributes(this.menu, {
        "class": 'dropdown-menu',
        role: 'menu',
        'aria-labelledby': 'aria-labelledby',
        style: 'display:block;position:static;margin-bottom:5px;'
      });
      _ref = this.defaultActions;
      for (actionName in _ref) {
        action = _ref[actionName];
        if (this.userDefinedActions[actionName] || this.userDefinedActions[actionName] === false) {
          continue;
        }
        this.addAction(action);
      }
      _ref1 = this.userDefinedActions;
      for (actionName in _ref1) {
        action = _ref1[actionName];
        this.addAction(action);
      }
      this.element.appendChild(this.menu);
      this.events(this);
    }

    ContextMenu.prototype.addDivider = function() {
      var divider;
      divider = document.createElement('li');
      Utilities.prototype.setAttributes(divider, {
        "class": 'divider'
      });
      return this.menu.appendChild(divider);
    };

    ContextMenu.prototype.addAction = function(action) {
      var a, code, div, key, li, shortCut, span;
      li = document.createElement('li');
      div = document.createElement('div');
      span = document.createElement('span');
      span.textContent = action.shortCut;
      span.setAttribute('name', action.name);
      Utilities.prototype.setAttributes(span, {
        style: "float: right !important;"
      });
      a = document.createElement('a');
      a.textContent = action.name;
      a.setAttribute('name', action.name);
      Utilities.prototype.setAttributes(a, {
        "class": 'enabled',
        tabIndex: '-1'
      });
      if (action.hasDivider) {
        this.addDivider();
      }
      a.appendChild(span);
      li.appendChild(a);
      this.actionNodes[action.name] = li;
      this.actionCallbacks.byName[action.name] = action.callback;
      shortCut = action.shortCut;
      if (shortCut) {
        if (/(ctrl|cmd)/i.test(shortCut)) {
          key = shortCut.split('+')[1];
          code = key.charCodeAt(0);
          this.actionCallbacks.byControl[code] = action.callback;
        }
      }
      return this.menu.appendChild(li);
    };

    ContextMenu.prototype.show = function(x, y, cell) {
      this.cell = cell;
      if (!cell.isActive()) {
        cell.makeActive();
      }
      this.cells = cell.table.activeCells;
      Utilities.prototype.setStyles(this.element, {
        left: x,
        top: y
      });
      return this.table.tableEl.appendChild(this.element);
    };

    ContextMenu.prototype.hide = function() {
      if (this.isVisible()) {
        return this.table.tableEl.removeChild(this.element);
      }
    };

    ContextMenu.prototype.isVisible = function() {
      return this.element.parentNode != null;
    };

    ContextMenu.prototype.getTargetPasteCell = function() {
      return this.table.activeCells.sort(this.sortFunc)[0];
    };

    ContextMenu.prototype.sortFunc = function(a, b) {
      return a.address[0] - b.address[0];
    };

    ContextMenu.prototype.displayBorders = function() {
      if (this.table.copiedCellMatrix) {
        return this.table.copiedCellMatrix.displayBorders();
      }
    };

    ContextMenu.prototype.hideBorders = function() {
      if (this.table.copiedCellMatrix) {
        return this.table.copiedCellMatrix.removeBorders();
      }
    };

    ContextMenu.prototype.cut = function(e, table) {
      var cell, cellMatrix, menu, _i, _len, _ref;
      menu = table.contextMenu;
      cellMatrix = new CellMatrix(table.activeCells);
      table.copiedCellMatrix = cellMatrix;
      table.addToStack({
        type: 'cut',
        oldMatrix: cellMatrix.values,
        address: [cellMatrix.lowRow, cellMatrix.lowCol]
      });
      _ref = table.activeCells;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cell = _ref[_i];
        cell.value('', false);
      }
      menu.displayBorders();
      return menu.hide();
    };

    ContextMenu.prototype.copy = function(e, table) {
      var menu;
      menu = table.contextMenu;
      table.copiedCellMatrix = new CellMatrix(table.activeCells);
      menu.displayBorders();
      return menu.hide();
    };

    ContextMenu.prototype.paste = function(e, table) {
      var cell, colIndex, currentCell, matrix, menu, row, rowIndex, value, _i, _j, _len, _len1, _ref;
      menu = table.contextMenu;
      cell = menu.getTargetPasteCell();
      if (cell.editable) {
        matrix = [];
        rowIndex = cell.address[0] - 1;
        _ref = table.copiedCellMatrix.values;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          rowIndex++;
          colIndex = cell.address[1];
          matrix[rowIndex] = [];
          for (_j = 0, _len1 = row.length; _j < _len1; _j++) {
            value = row[_j];
            currentCell = table.getCell(rowIndex, colIndex);
            if (currentCell && currentCell.editable) {
              matrix[rowIndex].push(currentCell.value());
              currentCell.value(value, false);
            }
            colIndex++;
          }
        }
        menu.hideBorders();
        table.addToStack({
          type: 'paste',
          oldMatrix: matrix,
          matrix: table.copiedCellMatrix.values,
          address: cell.address
        });
      }
      return menu.hide();
    };

    ContextMenu.prototype.undo = function(e, table) {
      console.log('start undo');
      return table.undo();
    };

    ContextMenu.prototype.redo = function(e, table) {
      console.log('start redo');
      return table.redo();
    };

    ContextMenu.prototype.fill = function(e, table) {
      var cell, cellMatrix, colIndex, currentCell, fillValue, matrix, menu, row, rowIndex, value, _i, _j, _len, _len1, _ref;
      menu = table.contextMenu;
      cell = menu.getTargetPasteCell();
      fillValue = cell.value();
      cellMatrix = new CellMatrix(table.activeCells);
      table.copiedCellMatrix = cellMatrix;
      if (cell.editable) {
        matrix = [];
        rowIndex = cellMatrix.lowRow - 1;
        _ref = cellMatrix.values;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          rowIndex++;
          colIndex = cellMatrix.lowCol;
          matrix[rowIndex] = [];
          for (_j = 0, _len1 = row.length; _j < _len1; _j++) {
            value = row[_j];
            currentCell = table.getCell(rowIndex, colIndex);
            if (currentCell && currentCell.editable) {
              matrix[rowIndex].push(currentCell.value());
              currentCell.value(fillValue, false);
            }
            colIndex++;
          }
        }
        table.addToStack({
          type: 'fill',
          oldMatrix: matrix,
          fillValue: fillValue,
          address: [cellMatrix.lowRow, cellMatrix.lowCol]
        });
      }
      return menu.hide();
    };

    ContextMenu.prototype.toggle = function(action) {
      var classes;
      classes = this.actionNodes[action].classList;
      classes.toggle('enabled');
      return classes.toggle('disabled');
    };

    ContextMenu.prototype.events = function(menu) {
      return this.element.onclick = function(e) {
        var actionName;
        actionName = e.target.getAttribute('name');
        return menu.actionCallbacks.byName[actionName](e, menu.table);
      };
    };

    return ContextMenu;

  })();


  /*
  
    Cell Type Behavior
    -----------------------------------------------------------------------------------------
    generic behavior will be in GenericCell class
    type specific behavior will be in the associated <type>Cell class
   */

  GenericCell = (function() {
    function GenericCell(cell) {
      var node;
      this.cell = cell;
      node = document.createTextNode(this.cell.originalValue);
      this.cell.control = document.createElement('input');
      this.cell.element.appendChild(node);
    }

    GenericCell.prototype.initControl = function() {
      return this.cell.control.value = this.cell.value();
    };

    GenericCell.prototype.formatValue = function(newValue) {
      return newValue;
    };

    GenericCell.prototype.setValue = function(newValue) {
      return this.cell.source[this.cell.valueKey] = newValue;
    };

    GenericCell.prototype.addControlEvents = function(cell) {};

    GenericCell.prototype.value = function() {
      return this.cell.value();
    };

    GenericCell.prototype.render = function() {
      return this.cell.element.textContent;
    };

    GenericCell.prototype.select = function() {
      return this.cell.control.select();
    };

    return GenericCell;

  })();

  StringCell = (function(_super) {
    __extends(StringCell, _super);

    function StringCell() {
      return StringCell.__super__.constructor.apply(this, arguments);
    }

    return StringCell;

  })(GenericCell);

  NumberCell = (function(_super) {
    __extends(NumberCell, _super);

    function NumberCell() {
      return NumberCell.__super__.constructor.apply(this, arguments);
    }

    NumberCell.prototype.formatValue = function(newValue) {
      return Number(newValue);
    };

    NumberCell.prototype.setValue = function(newValue) {
      return this.cell.source[this.cell.valueKey] = Number(newValue);
    };

    return NumberCell;

  })(GenericCell);

  DateCell = (function(_super) {
    __extends(DateCell, _super);

    function DateCell(cell) {
      var node;
      this.cell = cell;
      node = document.createTextNode(this.toDateString(this.cell.originalValue));
      this.cell.control = this.toDate();
      if (this.cell.originalValue) {
        this.cell.control.valueAsDate = new Date(this.cell.originalValue);
      }
      this.cell.element.appendChild(node);
    }

    DateCell.prototype.formatValue = function(newValue) {
      if (newValue.length > 0) {
        return this.toDateString(Date.parse(newValue));
      } else if (newValue instanceof Date) {
        return this.toDateString(newValue);
      } else if (newValue.length === 0) {
        this.cell.control.valueAsDate = null;
        return '';
      }
    };

    DateCell.prototype.setValue = function(newValue) {
      this.cell.source[this.cell.valueKey] = new Date(newValue);
      return this.cell.control.valueAsDate = new Date(newValue);
    };

    DateCell.prototype.initControl = function() {
      DateCell.__super__.initControl.call(this);
      return this.cell.control.value = this.toDateInputString(this.cell.value());
    };

    DateCell.prototype.addControlEvents = function(cell) {
      return this.cell.control.onchange = function(e) {
        return cell.edit(e.target.value);
      };
    };

    DateCell.prototype.value = function() {
      return this.cell.control.valueAsDate;
    };

    DateCell.prototype.toDateString = function(passedDate) {
      var date;
      if (passedDate == null) {
        passedDate = null;
      }
      if (passedDate && passedDate !== '') {
        date = new Date(passedDate);
      } else {
        if (this.value()) {
          date = new Date(this.value());
        } else {
          null;
        }
      }
      if (date instanceof Date) {
        return ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2) + '-' + date.getFullYear();
      } else {
        return '';
      }
    };

    DateCell.prototype.toDate = function() {
      var input;
      input = document.createElement('input');
      input.type = 'date';
      input.value = this.toDateString();
      return input;
    };

    DateCell.prototype.toDateInputString = function(passedDate) {
      var date;
      if (passedDate == null) {
        passedDate = null;
      }
      if (passedDate && passedDate !== '') {
        date = new Date(passedDate);
      } else {
        if (this.value()) {
          date = new Date(this.value());
        } else {
          null;
        }
      }
      if (date instanceof Date) {
        return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
      } else {
        return '';
      }
    };

    return DateCell;

  })(GenericCell);

  HTMLCell = (function(_super) {
    __extends(HTMLCell, _super);

    function HTMLCell(cell) {
      var node;
      this.cell = cell;
      this.cell.htmlContent = this.cell.originalValue;
      node = this.toFragment();
      this.cell.control = document.createElement('input');
      this.cell.element.appendChild(node);
    }

    HTMLCell.prototype.setValue = function(newValue) {
      var node;
      this.cell.htmlContent = newValue;
      node = this.toFragment();
      this.cell.element.innerHTML = "";
      return this.cell.element.appendChild(node);
    };

    HTMLCell.prototype.toFragment = function() {
      var element, fragment;
      element = document.createElement("div");
      fragment = document.createDocumentFragment();
      element.innerHTML = this.cell.htmlContent;
      fragment.appendChild(element.firstChild || document.createTextNode(''));
      return fragment;
    };

    HTMLCell.prototype.render = function() {
      return this.htmlContent;
    };

    return HTMLCell;

  })(GenericCell);

  SelectCell = (function(_super) {
    __extends(SelectCell, _super);

    function SelectCell(cell) {
      var node;
      this.cell = cell;
      node = document.createTextNode(this.cell.originalValue || '');
      this.cell.control = this.initControl;
      this.cell.element.appendChild(node);
    }

    SelectCell.prototype.initControl = function() {
      var choice, index, option, select, subchoice, _i, _j, _len, _len1, _ref;
      select = document.createElement("select");
      if (!this.cell.meta.choices) {
        console.log("There is not a 'choices' key in cell " + this.cell.address + " and you specified that it was of type 'select'");
      }
      _ref = this.cell.meta.choices;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        choice = _ref[_i];
        option = document.createElement("option");
        if (choice instanceof Array) {
          for (index = _j = 0, _len1 = choice.length; _j < _len1; index = ++_j) {
            subchoice = choice[index];
            if (index === 0) {
              option.value = subchoice;
            }
            if (index === 1) {
              option.text = subchoice;
            }
          }
        } else {
          option.value = option.text = choice;
        }
        if (this.cell.value() === choice) {
          option.selected = true;
        }
        select.add(option);
      }
      select.classList.add('form-control');
      this.cell.control = select;
      return this.cell.control.onchange = function(e) {
        return this.cell.edit(e.target.value);
      };
    };

    SelectCell.prototype.addControlEvents = function(cell) {
      return this.cell.control.onchange = function(e) {
        return cell.edit(e.target.value);
      };
    };

    SelectCell.prototype.select = function() {};


    /*
    
      Cell Matrix
      -----------------------------------------------------------------------------------------
     */

    return SelectCell;

  })(GenericCell);

  CellMatrix = (function() {
    function CellMatrix(cells) {
      var a, cell, col, colIndex, cols, m, matrix, row, rowIndex, rows, _i, _j, _k, _len, _len1, _len2, _ref;
      this.cells = cells;
      rows = [];
      matrix = {};
      _ref = this.cells;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cell = _ref[_i];
        rowIndex = cell.address[0];
        colIndex = cell.address[1];
        if (matrix[rowIndex]) {
          matrix[rowIndex][colIndex] = cell.value();
        } else {
          rows.push(rowIndex);
          matrix[rowIndex] = {};
          matrix[rowIndex][colIndex] = cell.value();
        }
      }
      this.matrix = matrix;
      this.rowCount = rows.length;
      rows.sort(function(a, b) {
        return Number(a) > Number(b);
      });
      this.lowRow = rows[0];
      this.highRow = rows[rows.length - 1];
      cols = Object.keys(this.matrix[this.lowRow]);
      this.colCount = cols.length;
      cols.sort(function(a, b) {
        return Number(a) > Number(b);
      });
      this.lowCol = cols[0];
      this.highCol = cols[this.colCount - 1];
      m = [];
      for (_j = 0, _len1 = rows.length; _j < _len1; _j++) {
        row = rows[_j];
        a = [];
        for (_k = 0, _len2 = cols.length; _k < _len2; _k++) {
          col = cols[_k];
          a.push(this.matrix[row][col]);
        }
        m.push(a);
      }
      this.values = m;
    }

    CellMatrix.prototype.displayBorders = function() {
      var cell, _i, _len, _ref, _results;
      _ref = this.cells;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cell = _ref[_i];
        _results.push(this.addBorder(cell));
      }
      return _results;
    };

    CellMatrix.prototype.removeBorders = function() {
      var cell, _i, _len, _ref, _results;
      _ref = this.cells;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cell = _ref[_i];
        _results.push(cell.element.style.border = "");
      }
      return _results;
    };

    CellMatrix.prototype.addBorder = function(cell) {
      var colIndex, rowIndex;
      rowIndex = cell.address[0];
      colIndex = cell.address[1];
      if (this.lowRow === this.highRow) {
        cell.element.style.borderTop = "2px dashed blue";
        cell.element.style.borderBottom = "2px dashed blue";
      } else {
        if (rowIndex < this.highRow) {
          cell.element.style.borderTop = "2px dashed blue";
          cell.element.style.borderBottom = "2px dashed blue";
        } else {
          cell.element.style.borderBottom = "2px dashed blue";
        }
      }
      if (this.lowCol === this.highCol) {
        cell.element.style.borderLeft = "2px dashed blue";
        return cell.element.style.borderRight = "2px dashed blue";
      } else {
        if (colIndex < this.highCol) {
          cell.element.style.borderLeft = "2px dashed blue";
          return cell.element.style.borderRight = "2px dashed blue";
        } else {
          return cell.element.style.borderRight = "2px dashed blue";
        }
      }
    };

    return CellMatrix;

  })();


  /*
  
  	ActionStack
  	-----------------------------------------------------------------------------------------
    used for undo/redo functionality
   */

  ActionStack = (function() {
    function ActionStack(table) {
      this.table = table;
      this.index = -1;
      this.actions = [];
    }

    ActionStack.prototype.getCell = function(action) {
      return this.table.getCell(action.address[0], action.address[1]);
    };

    ActionStack.prototype.addAction = function(actionObject) {
      console.log(this.index);
      if (this.index > -1 && this.index < this.actions.length - 1) {
        this.actions = this.actions.splice(0, this.index + 1);
      }
      this.actions.push(actionObject);
      return this.index++;
    };

    ActionStack.prototype.undo = function() {
      var action, cell;
      if (this.index > -1) {
        this.index--;
        action = this.actions[this.index + 1];
        switch (action.type) {
          case 'cell-edit':
            cell = this.getCell(action);
            return cell.value(action.oldValue, false);
          case 'cut':
            return this.updateMatrix(action, 'oldMatrix');
          case 'paste':
            return this.updateMatrix(action, 'oldMatrix');
          case 'fill':
            return this.updateMatrix(action, 'oldMatrix');
        }
      }
    };

    ActionStack.prototype.redo = function() {
      var action, cell, colIndex, currentCell, row, rowIndex, value, _i, _len, _ref, _results;
      if (this.index < this.actions.length - 1) {
        this.index++;
        action = this.actions[this.index];
        switch (action.type) {
          case 'cell-edit':
            cell = this.table.getCell(action.address[0], action.address[1]);
            return cell.value(action.newValue, false);
          case 'cut':
            return this.updateMatrix(action, 'matrix');
          case 'paste':
            return this.updateMatrix(action, 'oldMatrix');
          case 'fill':
            rowIndex = action.address[0] - 1;
            _ref = action.oldMatrix;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              row = _ref[_i];
              rowIndex++;
              colIndex = action.address[1];
              _results.push((function() {
                var _j, _len1, _results1;
                _results1 = [];
                for (_j = 0, _len1 = row.length; _j < _len1; _j++) {
                  value = row[_j];
                  currentCell = this.table.getCell(rowIndex, colIndex);
                  currentCell.value(action.fillValue, false);
                  _results1.push(colIndex++);
                }
                return _results1;
              }).call(this));
            }
            return _results;
        }
      }
    };

    ActionStack.prototype.updateMatrix = function(action, matrixKey) {
      var colIndex, currentCell, row, rowIndex, value, _i, _len, _ref, _results;
      rowIndex = action.address[0] - 1;
      _ref = action[matrixKey];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        row = _ref[_i];
        rowIndex++;
        colIndex = action.address[1];
        _results.push((function() {
          var _j, _len1, _results1;
          _results1 = [];
          for (_j = 0, _len1 = row.length; _j < _len1; _j++) {
            value = row[_j];
            currentCell = this.table.getCell(rowIndex, colIndex);
            currentCell.value(value, false);
            _results1.push(colIndex++);
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    return ActionStack;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : window;

  root.GridEdit = GridEdit;

}).call(this);
