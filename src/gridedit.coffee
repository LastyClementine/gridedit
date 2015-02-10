class GridEdit
  constructor: (@config, @actionStack) ->
    @element = document.querySelectorAll(@config.element || '#gridedit')[0]
    @contextMenu = new GridEdit.ContextMenu @
    @themeName = @config.themeName
    @customTheme = @config.themeTemplate

    @theme = new GridEdit.Theme @themeName, @customTheme
    @draggingRow = null # the row being dragged
    @lastDragOver = null # the last row that was the row being dragged was over
    @lastDragOverIsBeforeFirstRow = false # special flag for dragging a row to index 0
    @lastClickCell = null # used for double click events
    @headers = []
    @rows = []
    @subtotalRows = []
    @cols = []
    @source = @config.rows
    @redCells = []
    @activeCells = []
    @copiedCells = null
    @selectionStart = null
    @selectionEnd = null
    @selectedCol = null
    @openCell = null
    @state = "ready"
    @mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    @topOffset = if not @config.topOffset then 0 else @config.topOffset
    if @config.custom
      @set key, value for key, value of @config.custom when key of @config.custom
      delete @config.custom
    do @init if @config.initialize
    @copiedCellMatrix = null
    @actionStack = new GridEdit.ActionStack(@) unless @actionStack
    if @config.selectedCell
      cell = @getCell(@config.selectedCell[0], @config.selectedCell[1])
      cell.makeActive() if cell
      @config.selectedCell = undefined # don't let this propagate to next rebuild

  init: ->
    do @config.beforeInit if @config.beforeInit
    do @build
    do @events
    do @render
    do @removeBrowserHighlighting
    do @config.afterInit if @config.afterInit
    return

  removeBrowserHighlighting: ->
    stylesToSet = [
      '-webkit-touch-callout',
      '-webkit-user-select',
      '-khtml-user-select',
      '-moz-user-select',
      '-ms-user-select',
      'user-select'
    ]

    for styleToSet in stylesToSet
      @tableEl.style[styleToSet] = 'none'

  build: ->
    # Build Table Header
    tr = document.createElement 'tr'
    if @config.includeRowHandles
      handleHeader = document.createElement 'th'
      tr.appendChild handleHeader
    for colAttributes, i in @config.cols
      col = new GridEdit.Column(colAttributes, @)
      @cols.push col
      tr.appendChild col.element
    thead = document.createElement 'thead'
    ge = @
    thead.ondragenter = () ->
      ge.lastDragOverIsBeforeFirstRow = true
      prevRow = ge.lastDragOver
      prevRow.element.style.borderBottom = prevRow.oldBorderBottom
      prevRow.element.style.borderTop = ge.theme.borders.dragBorderStyle
    thead.ondragleave = () ->
      firstRow = ge.rows[0]
      firstRow.element.style.borderTop = firstRow.oldBorderTop
    thead.appendChild tr
    tbody = document.createElement 'tbody'
    for rowAttributes, i in @source
      switch rowAttributes.gridEditRowType
        when 'static'
          row = new GridEdit.StaticRow(rowAttributes, @)
        when 'subtotal'
          row = new GridEdit.SubTotalRow(rowAttributes, @)
        when 'heading'
          row = new GridEdit.HeaderRow(rowAttributes, @)
        when 'custom'
          rowType = rowAttributes.customClassName || 'GenericRow'
          row = new GridEdit[rowType](rowAttributes, @)
        else
          row = new GridEdit.GenericRow(rowAttributes, @)
      @rows.push row
      tbody.appendChild row.element
    table = document.createElement 'table'
    GridEdit.Utilities::setAttributes table, {id: 'editable-grid', class: @config.tableClass}
    table.appendChild thead
    table.appendChild tbody
    @tableEl = table

  rebuild: (newConfig = null) ->
    config = Object.create @config
    if newConfig isnt null
      for optionKey, optionValue of newConfig
        config[optionKey] = newConfig[optionKey]
    actionStack = @actionStack
    do @destroy
    @constructor(config, actionStack)

  hideControl: -> @openCell.edit @openCell.control.value if @openCell

  events: ->
    table = @
    document.onkeydown = (e) ->
      if table.activeCell()
        key = e.keyCode
        shift = e.shiftKey
        ctrl = e.ctrlKey
        cmd = e.metaKey

        if cmd or ctrl
          if key && key != 91 && key != 92
            action = table.contextMenu.actionCallbacks.byControl[key]
            if action
              e.preventDefault();
              table.contextMenu.execute action, e
        else
          switch key
            when 8 # backspace
              unless table.openCell
                e.preventDefault()
                table.delete()
              break
            when 9 # tab
              e.preventDefault()
              if shift then table.moveTo table.previousCell() else table.moveTo table.nextCell()
            when 13 # enter
              table.activeCell().onReturnKeyPress()
              break
            when 16 # shift
              break
            when 32 # space
              table.activeCell().onSpaceKeyPress() unless table.openCell
              break
            when 37 # left arrow
              table.moveTo table.previousCell()
              break
            when 38 # up arrow
              table.moveTo table.aboveCell()
              break
            when 39 # right arrow
              table.moveTo table.nextCell() unless table.activeCell().isBeingEdited()
              break
            when 40 # down arrow
              table.moveTo table.belowCell()
              break
            when 46 # delete
              unless table.openCell
                e.preventDefault()
                table.delete()
                break
            else
              key = key - 48 if key in [96..111] # for numpad
              table.openCellAndPopulateInitialValue(shift, key)

    window.onresize = -> GridEdit.Utilities::setStyles table.openCell.control, table.openCell.position() if table.openCell
    window.onscroll = -> table.openCell.reposition() if table.openCell
    @tableEl.oncontextmenu = (e) -> false
    document.onclick = (e) ->
      activeCell = table.firstActiveCell()
      unless table.isDescendant e.target or table.contextMenu.isVisible()
        unless e.target is activeCell?.control
          activeCell?.edit(activeCell?.control.value) if activeCell?.isBeingEdited()
          GridEdit.Utilities::clearActiveCells table
      table.contextMenu.hide()

  render: ->
    @element = document.querySelectorAll(@config.element || '#gridedit')[0] if @element.hasChildNodes()
    @element.appendChild @tableEl

  getCell: (x, y) ->
    try
      @rows[x].cells[y]
    catch e
      # out of range

  set: (key, value) -> @config[key] = value if key isnt undefined
  activeCell: -> if @activeCells.length > 1 then @activeCells else @activeCells[0]
  firstActiveCell: -> @activeCells[0]
  nextCell: -> @firstActiveCell()?.next()
  previousCell: -> @firstActiveCell()?.previous()
  aboveCell: -> @firstActiveCell()?.above()
  belowCell: -> @firstActiveCell()?.below()

  moveTo: (toCell, fromCell) ->
    if toCell
      fromCell = toCell.table.firstActiveCell() if fromCell is undefined
      direction = toCell.table.getDirection(fromCell, toCell)
      beforeCellNavigateReturnVal = toCell.beforeNavigateTo(toCell, fromCell, direction) if toCell.beforeNavigateTo
      if beforeCellNavigateReturnVal isnt false
        if not toCell.isVisible()
          oldY = toCell.table.activeCell().address[0]
          newY = toCell.address[0]
          directionModifier = 1
          if newY < oldY # Then going up - This is because you need -1 for scrolling up to work properly
            directionModifier = -1
          window.scrollBy(0, toCell?.position().height * directionModifier)
        do toCell.makeActive
    false

  getDirection: (fromCell, toCell) ->
    fromAddressY = fromCell.address[0]
    toAddressY = toCell.address[0]
    fromAddressX = fromCell.address[1]
    toAddressX = toCell.address[1]
    if fromAddressY is toAddressY # Going right or left
      if fromAddressX > toAddressX # Going Left
        direction = "left"
      else if fromAddressX < toAddressX # Going Right
        direction = "right"
      else
        console.log("Cannot calculate direction going from cell #{fromCell.address} to cell #{toCell.address}")
    else if fromAddressY > toAddressY # Going Up
      direction = "up"
    else if fromAddressY < toAddressY # Going Down
      direction = "down"
    else
      console.log("Cannot calculate direction going from cell #{fromCell.address} to cell #{toCell.address}")
    direction

  edit: (cell, newValue = null) ->
    if newValue isnt null
      cell?.cellTypeObject.edit newValue
    else
      cell.cellTypeObject.edit()
      false

  delete: ->
    for cell in @activeCells
      cell.value('')

  clearActiveCells: -> GridEdit.Utilities::clearActiveCells @

  setSelection: ->
    if @selectionStart and @selectionEnd and @selectionStart isnt @selectionEnd
      do cell.showInactive for cell in @activeCells
      @activeCells = []
      rowRange = [@selectionStart.address[0]..@selectionEnd.address[0]]
      colRange = [@selectionStart.address[1]..@selectionEnd.address[1]]
      for row in rowRange
        @rows[row].cells[col].addToSelection() for col in colRange
      return

  data: ->
    data = []
    for row in @rows
      rowData = []
      for cell in row.cells
        rowData.push cell.cellTypeObject.value()
      data.push rowData
    data

  repopulate: ->
    for row in @rows
      for cell in row.cells
        cell.value(cell.source[cell.valueKey])

  destroy: ->
    @element.removeChild @tableEl
    for key of @
      delete @[key]

  isDescendant: (child) ->
    node = child.parentNode
    while node?
      return true if node is @tableEl
      node = node.parentNode
    false

  addToStack: (action) ->
    @actionStack.addAction(action)

  undo: ->
    @actionStack.undo()

  redo: ->
    @actionStack.redo()

  moveRow: (rowToMoveIndex, newIndex, addToStack=true) ->
    row = @source[rowToMoveIndex];
    @source.splice(rowToMoveIndex, 1)
    @source.splice(newIndex, 0, row)
    @addToStack({ type: 'move-row', oldIndex: rowToMoveIndex, newIndex: newIndex }) if addToStack
    @rebuild({ rows: @source, initialize: true, selectedCell: [newIndex, 0] })

  addRow: (index, addToStack=true, rowObject=false) ->
    if rowObject
      row = rowObject
    else
      row = {}
      for c in @cols
        row[c.valueKey] = c.defaultValue || ''
    if index or index == 0
      @source.splice(index, 0, row)
    else
      index = @source.length - 1
      @source.push(row)

    @addToStack({ type: 'add-row', index: index, rowObject: rowObject }) if addToStack
    @rebuild({ rows: @source, initialize: true, selectedCell: [index, 0] })

  addRows: (index, addToStack=true, rowObjects=[]) ->
    for rowObject, i in rowObjects
      myIndex = index + i
      if rowObject
        row = rowObject
      else
        row = {}
        for c in @cols
          row[c.valueKey] = c.defaultValue || ''
      if myIndex or myIndex == 0
        @source.splice(myIndex, 0, row)
      else
        myIndex = @source.length - 1
        @source.push(row)

    @addToStack({ type: 'add-rows', index: index, rowObjects: rowObjects }) if addToStack
    @rebuild({ rows: @source, initialize: true, selectedCell: [index, 0] })

  insertBelow: ->
    cell = @contextMenu.getTargetPasteCell()
    @addRow(cell.address[0] + 1)

  insertAbove: ->
    cell = @contextMenu.getTargetPasteCell()
    @addRow(cell.address[0])

  removeRow: (index, addToStack=true) ->
    rowObject = @source[index]
    row = @rows[index]
    rows = @source.splice(index, 1)
    @addToStack({ type: 'remove-row', index: index, rowObject: rowObject }) if addToStack
    @rebuild({ rows: @source, initialize: true, selectedCell: [ index, 0 ] })

  removeRows: (index, addToStack=true, numRows) ->
    rowObjects = []
    for i in [0..numRows - 1]
      rowObject = @source[index + i]
      rowObjects.push(rowObject)
    @source.splice(index, numRows)
    @addToStack({ type: 'remove-rows', index: index, rowObjects: rowObjects }) if addToStack
    @rebuild({ rows: @source, initialize: true, selectedCell: [ index, 0 ] })

  selectRow: (e, index) ->
    if @activeCell() and e
      currentRowIndex = @activeCells[0].address[0]
      shift = e.shiftKey
      ctrl = e.ctrlKey
      cmd = e.metaKey

      if !(ctrl or cmd)
        GridEdit.Utilities::clearActiveCells(@)

      if shift
        diff = currentRowIndex - index
        if diff < 0
          for row in @rows[currentRowIndex..index]
            row.select()
        else
          for row in @rows[index..currentRowIndex]
            row.select()
      else
        row = @rows[index]
        row.select()
    else
      row = @rows[index]
      row.select()

  calculateSubtotals: () ->
    for row in @subtotalRows
      row.calculate()

  openCellAndPopulateInitialValue: (shift, key) ->
    @activeCell().onKeyPress(GridEdit.Utilities::valueFromKey key, shift) unless @openCell

root = exports ? window
root.GridEdit = GridEdit
