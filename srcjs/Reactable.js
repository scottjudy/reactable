import React, { Fragment } from 'react'
import ReactTable from '@glin/react-table'
import { ReactTableDefaults } from '@glin/react-table'
import PropTypes from 'prop-types'
import { hydrate } from 'reactR'

import Pagination from './Pagination'
import selectTableHOC from './selectTable'
import WidgetContainer from './WidgetContainer'
import fixedReactTablePropTypes from './propTypes'
import { columnsToRows, buildColumnDefs } from './columns'
import { createTheme, css } from './theme'
import { defaultLanguage, renderTemplate } from './language'
import { classNames, getFirstDefined, get, set } from './utils'

import './react-table.css'
import './reactable.css'

const getTableProps = state => {
  let props = {
    role: 'table',
    className: css(state.theme.tableStyle)
  }
  return props
}

const getTheadThProps = (state, rowInfo, column) => {
  let props = {}
  // Assign cell role to selectable column headers to prevent input labels
  // from being read as column names ("select all rows column").
  props.role = column.selectable ? 'cell' : 'columnheader'
  props.className = css(state.theme.headerStyle)
  const isSortable = getFirstDefined(column.sortable, state.sortable)
  if (isSortable) {
    const sort = state.sorted.find(d => d.id === column.id)
    const currentSortOrder = sort ? (sort.desc ? 'descending' : 'ascending') : 'none'
    const defaultSortDesc = getFirstDefined(column.defaultSortDesc, state.defaultSortDesc)
    const defaultSortOrder = defaultSortDesc ? 'descending' : 'ascending'
    const isResizing = state.currentlyResizing && state.currentlyResizing.id === column.id
    props = {
      ...props,
      'aria-label': renderTemplate(state.language.sortLabel, { name: column.name }),
      'aria-sort': currentSortOrder,
      defaultSortOrder,
      isSortable,
      isSorted: sort ? true : false,
      isResizing
    }
  }
  return props
}

const getTheadGroupThProps = (state, rowInfo, column) => {
  let props = {}
  // When ungrouped columns or columns in different groups are pivoted,
  // the group header is hardcoded to <strong>Pivoted</strong> and not easily
  // configurable. Work around this by overriding the default ThComponent to
  // render a custom HeaderPivoted element instead.
  if (column.columns.some(col => col.pivoted)) {
    const pivotColumns = column.columns
    const pivotParentColumn = pivotColumns.reduce(
      (prev, current) => prev && prev === current.parentColumn && current.parentColumn,
      pivotColumns[0].parentColumn
    )
    if (!pivotParentColumn.Header) {
      props.HeaderPivoted = state.language.defaultGroupHeader
    }
  }

  // Add attributes to actual column group headers
  if (column.Header) {
    props = {
      ...props,
      'aria-colspan': column.columns.length,
      role: 'columnheader',
      // Add class for custom bottom border
      className: classNames('rt-th-group', column.className, css(state.theme.groupHeaderStyle))
    }
  } else {
    // Ungrouped column groups. These still take theme styles for, e.g., border theming.
    props.className = classNames('rt-th-group-none', css(state.theme.groupHeaderStyle))
  }

  return props
}

const getTheadGroupTrProps = () => {
  return { role: 'row' }
}

const getTheadTrProps = () => {
  return { role: 'row' }
}

const getTheadFilterTrProps = state => {
  return {
    role: 'row',
    className: classNames(css(state.theme.rowStyle))
  }
}

const getTheadFilterThProps = state => {
  // Treat filter cells as table cells, rather than headers
  return {
    role: 'cell',
    className: classNames('rt-td-filter', css(state.theme.filterCellStyle))
  }
}

const getTrGroupProps = (state, rowInfo) => {
  let props = {}
  props.className = css(state.theme.rowGroupStyle)
  // Hide padding rows (consisting of empty "space" cells) from screen readers
  if (!rowInfo) {
    props['aria-hidden'] = 'true'
  }
  return props
}

const getTrProps = (state, rowInfo) => {
  let props = {}
  props.className = css(state.theme.rowStyle)
  // Ignore padding rows, although they don't receive custom props
  if (!rowInfo) {
    return props
  }
  props.role = 'row'
  return props
}

const getTdProps = (state, rowInfo) => {
  let props = {}
  props.className = css(state.theme.cellStyle)
  // Ignore padding rows
  if (!rowInfo) {
    return props
  }
  props.role = 'cell'
  return props
}

const getTfootTrProps = () => {
  return { role: 'row' }
}

const getTfootTdProps = state => {
  return {
    role: 'cell',
    className: classNames('rt-tfoot-td', css(state.theme.footerStyle))
  }
}

// Add ARIA roles to table headers and table foot
const DefaultTheadComponent = ReactTableDefaults.TheadComponent
const DefaultTfootComponent = ReactTableDefaults.TfootComponent
Object.assign(ReactTableDefaults, {
  TheadComponent(props) {
    return <DefaultTheadComponent role="rowgroup" {...props} />
  },
  TfootComponent(props) {
    return <DefaultTfootComponent role="rowgroup" {...props} />
  }
})

// ThComponent that can render a custom HeaderPivoted element and be navigated
// using a keyboard, with sorting toggleable through the enter or space key.
const DefaultThComponent = ReactTableDefaults.ThComponent
class ThComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      showFocus: false,
      clicked: false
    }
  }

  render() {
    let { HeaderPivoted, defaultSortOrder, isSortable, isSorted, isResizing, ...props } = this.props

    if (HeaderPivoted) {
      props.children = HeaderPivoted
    }

    // Show focus indicators (sort order hint) when navigating using keyboard only
    if (isSortable) {
      const originalToggleSort = props.toggleSort
      const toggleSort = e => {
        originalToggleSort && originalToggleSort(e)
        // Don't show focus while sorting
        this.setState({ showFocus: false })
      }
      props = {
        ...props,
        toggleSort,
        onKeyPress: e => {
          const keyCode = e.which || e.keyCode
          if (keyCode === 13 || keyCode === 32) {
            toggleSort(e)
          }
        },
        onMouseDown: e => {
          // Prevent text selection when sorting (double clicks or shift clicks)
          if (e.detail > 1 || e.shiftKey) {
            e.preventDefault()
          }
          this.setState({ clicked: true })
        },
        onFocus: () => {
          // The resizer component doesn't propagate mousedown events, so we use
          // the resizing state to tell when focus comes from clicking the resizer.
          if (!this.state.clicked && !isSorted && !isResizing) {
            this.setState({ showFocus: true })
          }
        },
        onBlur: () => {
          this.setState({ showFocus: false, clicked: false })
        },
        tabIndex: '0',
        'data-sort-hint': this.state.showFocus ? defaultSortOrder : undefined
      }
    }

    return DefaultThComponent(props)
  }
}

ThComponent.propTypes = {
  HeaderPivoted: PropTypes.node,
  defaultSortOrder: PropTypes.string,
  isSortable: PropTypes.bool,
  isSorted: PropTypes.bool,
  isResizing: PropTypes.bool
}

Object.assign(ReactTableDefaults, {
  ThComponent
})

// Add ARIA role to table body.
// Render no data component in table body rather than the entire table
// so it doesn't overlap with headers/filters.
const getTbodyProps = state => ({ state })
const DefaultTbodyComponent = ReactTableDefaults.TbodyComponent
const DefaultNoDataComponent = ReactTableDefaults.NoDataComponent
Object.assign(ReactTableDefaults, {
  TbodyComponent({ state, className, children, ...rest }) {
    const { pageRows, theme, language } = state
    const noData = !pageRows.length && (
      <DefaultNoDataComponent>{language.noData}</DefaultNoDataComponent>
    )
    // Hide cell borders when table has no data
    className = noData ? classNames(className, 'rt-tbody-noData') : className
    className = classNames(className, css(theme.tableBodyStyle))
    return (
      <DefaultTbodyComponent role="rowgroup" className={className} {...rest}>
        {children}
        {noData}
      </DefaultTbodyComponent>
    )
  },
  NoDataComponent() {
    return null
  }
})

// Add className and aria-label to filter inputs
Object.assign(ReactTableDefaults, {
  FilterComponent({ column, filter, onChange }) {
    const { name, theme, language } = column
    return (
      <input
        type="text"
        className={classNames('rt-filter', css(theme.filterInputStyle))}
        style={{ width: '100%' }}
        value={filter ? filter.value : ''}
        onChange={event => onChange(event.target.value)}
        placeholder={language.filterPlaceholder}
        aria-label={renderTemplate(language.filterLabel, { name })}
      />
    )
  }
})

// Enable keyboard navigation and add aria-label to expanders
Object.assign(ReactTableDefaults, {
  ExpanderComponent({ isExpanded, column }) {
    const { theme, language } = column
    const label = isExpanded ? language.detailsCollapseLabel : language.detailsExpandLabel
    return (
      <button className="rt-expander-button" aria-label={label}>
        <span
          className={classNames('rt-expander', isExpanded && '-open', css(theme.expanderStyle))}
          tabIndex="-1"
          aria-hidden="true"
        >
          &bull;
        </span>
      </button>
    )
  }
})

// By default, the loading text is always present and read by screen readers, even
// when hidden. Hide the loading text completely to prevent it from being read.
const DefaultLoadingComponent = ReactTableDefaults.LoadingComponent
Object.assign(ReactTableDefaults, {
  LoadingComponent({ loading, ...rest }) {
    return loading ? DefaultLoadingComponent({ loading, ...rest }) : null
  }
})

ReactTable.propTypes = fixedReactTablePropTypes

// Prevent unnecessary data updates on table rerenders by doing a deep comparison
// of data props rather than a === comparison. Kind of ugly, but significantly
// increases performance when selecting or expanding rows in a very large table.
ReactTable.prototype.oldComponentWillReceiveProps =
  ReactTable.prototype.UNSAFE_componentWillReceiveProps
ReactTable.prototype.UNSAFE_componentWillReceiveProps = function (newProps, newState) {
  newProps = { ...newProps }
  if (this.props.dataKey && this.props.dataKey === newProps.dataKey) {
    newProps.data = this.props.data
    newProps.columns = this.props.columns
  }
  const dataUpdateProps = ['pivotBy', 'sorted', 'filtered']
  dataUpdateProps.forEach(name => {
    if (JSON.stringify(this.props[name]) === JSON.stringify(newProps[name])) {
      newProps[name] = this.props[name]
    }
  })
  // Reset search value if searchable changes
  if (this.props.searchable !== newProps.searchable) {
    newProps.filtered = this.state.filtered.filter(filter => filter.id !== this.props.searchKey)
  }
  return this.oldComponentWillReceiveProps(newProps, newState)
}

// Add global table searching. react-table doesn't support a global filter,
// so we use a dummy column to efficiently filter all columns. Because filters
// are only applied for visible (show = true) columns, we pass the dummy column
// directly to filterData to avoid having to hide the column.
ReactTable.prototype.oldFilterData = ReactTable.prototype.filterData
ReactTable.prototype.filterData = function (
  data,
  filtered,
  defaultFilterMethod,
  allVisibleColumns
) {
  let filterColumns = allVisibleColumns
  if (this.props.searchable) {
    // Exclude unfilterable columns (e.g. selection columns)
    const searchableColumns = allVisibleColumns.filter(col => col.createMatcher)
    const searchColumn = {
      id: this.props.searchKey,
      filterAll: true,
      filterable: true,
      filterMethod: (filter, rows) => {
        if (!filter.value) {
          return rows
        }

        const matchers = searchableColumns.reduce((obj, col) => {
          obj[col.id] = col.createMatcher(filter.value)
          return obj
        }, {})

        rows = rows.filter(row => {
          // Don't filter on aggregated rows
          if (row._subRows) {
            return true
          }
          for (let col of searchableColumns) {
            let value = row._original[col.id]
            if (matchers[col.id](value)) {
              return true
            }
          }
        })
        return rows
      }
    }
    filterColumns = filterColumns.concat(searchColumn)
  }

  if (this.props.crosstalkGroup) {
    const ctColumn = {
      id: this.props.crosstalkId,
      filterAll: true,
      filterable: true,
      filterMethod: (filter, rows) => {
        if (!filter.value) {
          return rows
        }
        rows = rows.filter(row => {
          // Don't filter on aggregated rows
          if (row._subRows) {
            return true
          }
          if (filter.value.includes(row._index)) {
            return true
          }
        })
        return rows
      }
    }
    filterColumns = filterColumns.concat(ctColumn)
  }

  return this.oldFilterData(data, filtered, defaultFilterMethod, filterColumns)
}

// Table component with a search input
const SearchTableComponent = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  searchClassName,
  ...rest
}) => {
  const searchInput = (
    <input
      type="text"
      value={searchValue}
      onChange={onSearchChange}
      className={classNames('rt-search', searchClassName)}
      placeholder={searchPlaceholder}
      aria-label={searchLabel}
    />
  )
  return (
    <Fragment>
      {searchInput}
      <ReactTableDefaults.TableComponent {...rest} />
    </Fragment>
  )
}

SearchTableComponent.propTypes = {
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string,
  searchLabel: PropTypes.string,
  searchClassName: PropTypes.string
}

const SelectTable = selectTableHOC(ReactTable)

class RowDetails extends React.Component {
  componentDidMount() {
    if (window.Shiny) {
      window.Shiny.bindAll(this.el)
    }
  }

  componentWillUnmount() {
    if (window.Shiny) {
      window.Shiny.unbindAll(this.el)
    }
  }

  render() {
    const { children, html } = this.props
    let props = { ref: el => (this.el = el) }
    if (html) {
      props = { ...props, dangerouslySetInnerHTML: { __html: html } }
    } else {
      props = { ...props, children }
    }
    return <div {...props} />
  }
}

RowDetails.propTypes = {
  children: PropTypes.node,
  html: PropTypes.string
}

class Reactable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selected: new Set(props.defaultSelected),
      expanded: props.defaultExpanded || {},
      data: null,
      dataKey: null
    }
    this.isSelected = this.isSelected.bind(this)
    this.toggleSelection = this.toggleSelection.bind(this)
    this.toggleSelectionAll = this.toggleSelectionAll.bind(this)
    this.setSelection = this.setSelection.bind(this)
    this.toggleExpand = this.toggleExpand.bind(this)
    this.toggleExpandAll = this.toggleExpandAll.bind(this)
    this.toggleCollapseAll = this.toggleCollapseAll.bind(this)
    this.isExpanded = this.isExpanded.bind(this)
    this.tableInstance = React.createRef()
    this.tableElement = React.createRef()
  }

  isSelected(index) {
    return this.state.selected.has(index)
  }

  toggleSelection(index) {
    const selected = new Set(this.state.selected)
    if (this.state.selected.has(index)) {
      selected.delete(index)
    } else {
      if (this.props.selection === 'single') {
        selected.clear()
      }
      selected.add(index)
    }
    this.setState({ selected }, this.onSelectedChange)
  }

  toggleSelectionAll(indices, checked) {
    const selected = new Set(this.state.selected)
    if (checked) {
      indices.forEach(i => selected.add(i))
    } else {
      indices.forEach(i => selected.delete(i))
    }
    this.setState({ selected }, this.onSelectedChange)
  }

  setSelection(indices, updateCrosstalk = true) {
    this.setState({ selected: new Set(indices) }, () => this.onSelectedChange(updateCrosstalk))
  }

  onSelectedChange(updateCrosstalk = true) {
    const { selection, selectionId } = this.props
    if (selection && selectionId && window.Shiny) {
      // Convert to R's 1-based indices
      const selected = [...this.state.selected].map(i => i + 1)
      window.Shiny.onInputChange(selectionId, selected)
    }

    if (updateCrosstalk) {
      this.updateCrosstalkSelection()
    }
  }

  updateCrosstalkSelection() {
    if (this.ctSelection) {
      const selected = [...this.state.selected].map(i => this.props.crosstalkKey[i])
      this.ctSelection.set(selected)
    }
  }

  toggleExpand(rowInfo, column) {
    let expanded = { ...this.state.expanded }
    if (column) {
      // Expand row details
      const expandedId = get(expanded, rowInfo.nestingPath)
      if (expandedId && expandedId === column.id) {
        expanded = set(expanded, rowInfo.nestingPath, undefined)
      } else {
        expanded = set(expanded, rowInfo.nestingPath, column.id)
      }
    } else {
      // Expand a pivot row
      const isExpanded = get(expanded, rowInfo.nestingPath)
      if (isExpanded) {
        expanded = set(expanded, rowInfo.nestingPath, undefined)
      } else {
        expanded = set(expanded, rowInfo.nestingPath, {})
      }
    }
    this.setState({ expanded })
  }

  isExpanded(cellInfo) {
    const expandedId = get(this.state.expanded, cellInfo.nestingPath)
    return expandedId && expandedId === cellInfo.column.id
  }

  toggleExpandAll() {
    // Convert the possibly grouped and/or sorted data to an expanded state object
    const { columns, sortedData } = this.tableInstance.current.state
    const firstDetailsColumn = columns.find(col => col.details)
    const dataToExpandedObj = arr => {
      return arr.reduce((obj, item, index) => {
        if (item._subRows) {
          obj[index] = dataToExpandedObj(item._subRows)
        } else {
          obj[index] = firstDetailsColumn ? firstDetailsColumn.id : {}
        }
        return obj
      }, {})
    }
    const expanded = dataToExpandedObj(sortedData)
    this.setState({ expanded })
  }

  toggleCollapseAll() {
    this.setState({ expanded: {} })
  }

  getRowInfo(rowInfo) {
    // Ignore padding rows
    if (!rowInfo) {
      return rowInfo
    }
    // Add selection state to rowInfo
    if (this.props.selection) {
      let selected
      if (rowInfo.subRows && this.props.selection === 'multiple') {
        selected = rowInfo.subRows.every(row => this.isSelected(row._index))
      } else {
        selected = this.isSelected(rowInfo.index)
      }
      return { selected, ...rowInfo }
    }
    return rowInfo
  }

  onTableUpdate() {
    // Send reactable state to Shiny for getReactableState()
    if (window.Shiny && window.Shiny.onInputChange && !this.props.nested) {
      const element = this.tableElement.current
      const instance = this.tableInstance.current
      if (!element || !instance) {
        return
      }
      const outputId = element.parentElement.getAttribute('data-reactable-output')
      if (!outputId) {
        return
      }
      const state = {
        // Convert to R's 1-based indices
        page: instance.state.page + 1,
        pageSize: instance.state.pageSize,
        pages: instance.state.pages,
        selected: [...this.state.selected].map(i => i + 1)
      }
      Object.keys(state).forEach(prop => {
        // NOTE: input IDs must always come first to work with Shiny modules
        window.Shiny.onInputChange(`${outputId}__reactable__${prop}`, state[prop])
      })
    }
  }

  componentDidMount() {
    if (this.state.selected.size > 0) {
      this.onSelectedChange()
    }
    if (this.state.expanded === true) {
      this.toggleExpandAll()
    }

    // Add Shiny message handler for updateReactable()
    if (window.Shiny && !this.props.nested) {
      const outputId = this.tableElement.current.parentElement.getAttribute('data-reactable-output')
      if (outputId) {
        const updateState = state => {
          if (state.data != null) {
            this.setState({ data: state.data, dataKey: state.dataKey })
          }
          if (state.selected != null) {
            this.setSelection(state.selected)
          }
          if (state.page != null) {
            // Don't use controlled page state here because react-table can recalculate
            // its internal page without calling onPageChange (e.g. when filtering).
            this.tableInstance.current.onPageChange(state.page)
          }
          // Expanded state updates must come last since expanded rows are collapsed
          // on page/sort changes.
          if (state.expanded != null) {
            state.expanded ? this.toggleExpandAll() : this.toggleCollapseAll()
          }
        }
        window.Shiny.addCustomMessageHandler(`__reactable__${outputId}`, updateState)
      }
    }

    // Send initial reactable state to Shiny
    this.onTableUpdate()

    const crosstalkGroup = this.props.crosstalkGroup
    if (crosstalkGroup && window.crosstalk) {
      this.ctSelection = new window.crosstalk.SelectionHandle(crosstalkGroup)
      this.ctFilter = new window.crosstalk.FilterHandle(crosstalkGroup)
      // Keep track of selected and filtered state updated by other widgets.
      // SelectionHandle and FilterHandle also track state, but will include changes
      // coming from the table as well.
      this.ctSelected = this.ctSelection.value
      this.ctFiltered = this.ctFilter.filteredKeys

      const crosstalkKey = this.props.crosstalkKey || []
      const rowByKey = crosstalkKey.reduce((obj, key, index) => {
        obj[key] = index
        return obj
      }, {})
      const instance = this.tableInstance.current
      const column = { id: instance.props.crosstalkId }
      const applyCrosstalkFilter = () => {
        // Selection value is an array of keys, or null or empty array if empty
        // Filter value is an an array of keys, or null if empty
        const selectedKeys = this.ctSelected && this.ctSelected.length > 0 ? this.ctSelected : null
        const filteredKeys = this.ctFiltered
        let keys
        if (!selectedKeys && !filteredKeys) {
          keys = null
        } else if (!selectedKeys) {
          keys = filteredKeys
        } else if (!filteredKeys) {
          keys = selectedKeys
        } else {
          keys = selectedKeys.filter(key => filteredKeys.includes(key))
        }
        const filteredRows = keys ? keys.map(key => rowByKey[key]) : null
        instance.filterColumn(column, filteredRows)
      }

      const setCrosstalkSelection = value => {
        if (this.ctSelected !== value) {
          this.ctSelected = value
          applyCrosstalkFilter()
        }
      }

      const setCrosstalkFilter = value => {
        if (this.ctFiltered !== value) {
          this.ctFiltered = value
          applyCrosstalkFilter()
        }
      }

      this.ctSelection.on('change', e => {
        if (e.sender !== this.ctSelection) {
          setCrosstalkSelection(e.value)
          // Selections from other widgets should clear table selection state
          this.setSelection([], false)
        } else {
          // Selections from table should clear selections from other widgets
          setCrosstalkSelection(null)
        }
      })

      this.ctFilter.on('change', e => {
        if (e.sender !== this.ctFilter) {
          setCrosstalkFilter(e.value)
        }
      })

      // Apply initial filter/selection for dynamically rendered tables (e.g., nested tables)
      applyCrosstalkFilter()

      // Send initial Crosstalk state (just selection state for now)
      if (this.props.defaultSelected) {
        this.updateCrosstalkSelection()
      }
    }
  }

  componentDidUpdate(prevProps) {
    const { defaultSelected, defaultExpanded } = this.props
    if (prevProps.defaultSelected !== defaultSelected) {
      this.setSelection(defaultSelected)
    }
    if (prevProps.defaultExpanded !== defaultExpanded) {
      if (defaultExpanded === true) {
        this.toggleExpandAll()
      } else {
        const expanded = defaultExpanded || {}
        this.setState({ expanded })
      }
    }
  }

  componentWillUnmount() {
    if (this.ctSelection) {
      this.ctSelection.close()
    }
    if (this.ctFilter) {
      this.ctFilter.close()
    }
  }

  render() {
    let {
      data,
      columns,
      columnGroups,
      pivotBy,
      sortable,
      resizable,
      filterable,
      searchable,
      defaultSortDesc,
      defaultSorted,
      defaultPageSize,
      pageSizeOptions,
      paginationType,
      showPagination,
      showPageSizeOptions,
      showPageInfo,
      minRows,
      selection,
      onClick,
      outlined,
      bordered,
      borderless,
      striped,
      highlight,
      compact,
      nowrap,
      showSortIcon,
      showSortable,
      className,
      style,
      rowClassName,
      rowStyle,
      inline,
      width,
      height,
      language,
      crosstalkGroup,
      crosstalkKey,
      dataKey,
      theme
    } = this.props

    theme = createTheme(theme) || {}
    className = classNames(className, css(theme.style))

    language = { ...defaultLanguage, ...language }
    for (let key in language) {
      language[key] = language[key] || null
    }

    data = columnsToRows(this.state.data || data)
    columns = buildColumnDefs(columns, columnGroups, {
      sortable,
      showSortIcon,
      showSortable,
      isExpanded: this.isExpanded,
      onExpanderClick: this.toggleExpand,
      theme,
      language
    })

    // Leave at least one row to show the no data message properly
    if (minRows != null) {
      minRows = Math.max(minRows, 1)
    }

    className = classNames(
      className,
      outlined ? 'rt-outlined' : '',
      bordered ? 'rt-bordered' : '',
      borderless ? 'rt-borderless' : '',
      compact ? 'rt-compact' : '',
      inline ? ' rt-inline' : '',
      nowrap ? 'rt-nowrap' : ''
    )

    style = { width, height, ...style }

    let Table = ReactTable
    let selectProps = {}
    if (selection) {
      Table = SelectTable
      selectProps = {
        isSelected: this.isSelected,
        toggleSelection: this.toggleSelection,
        toggleAll: this.toggleSelectionAll,
        selectType: selection === 'multiple' ? 'checkbox' : 'radio'
      }
    }

    const autoHidePagination = showPagination == null

    let newGetTrProps = getTrProps
    if (striped || highlight || selection || rowClassName || rowStyle) {
      newGetTrProps = (state, rowInfo) => {
        rowInfo = this.getRowInfo(rowInfo)
        let props = getTrProps(state, rowInfo)
        // Add row stripe and highlight styles to prevent bleed-through to nested tables
        if (striped && rowInfo) {
          props.className = classNames(
            props.className,
            rowInfo.viewIndex % 2 ? null : 'rt-tr-striped'
          )
        }
        if (highlight && rowInfo) {
          props.className = classNames(props.className, 'rt-tr-highlight')
        }
        if (rowInfo && rowInfo.selected) {
          props.className = classNames(props.className, 'rt-tr-selected')
        }
        if (rowClassName) {
          let rowCls
          if (typeof rowClassName === 'function') {
            rowCls = rowClassName(rowInfo, state)
          } else if (rowClassName instanceof Array) {
            // Ignore padding rows
            rowCls = rowInfo && rowClassName[rowInfo.index]
          } else {
            rowCls = rowClassName
          }
          props.className = classNames(props.className, rowCls)
        }
        if (rowStyle) {
          if (typeof rowStyle === 'function') {
            props.style = rowStyle(rowInfo, state)
          } else if (rowStyle instanceof Array) {
            // Ignore padding rows
            props.style = rowInfo && rowStyle[rowInfo.index]
          } else {
            props.style = rowStyle
          }
        }
        return props
      }
    }

    const dataColumns = columns.reduce((cols, col) => {
      return cols.concat(col.columns ? col.columns : col)
    }, [])

    // Row details
    let SubComponent
    if (dataColumns.some(col => col.details)) {
      SubComponent = rowInfo => {
        const expandedId = get(this.state.expanded, rowInfo.nestingPath)
        const column = dataColumns.find(col => col.id === expandedId)
        if (!column) {
          // When adding or removing pivot columns, expanded state persists as
          // a convenience. However, this can result in mixups between expanded
          // row details and pivot rows. Ensure that this is an expanded details row,
          // not a pivot row, before rendering row details.
          return null
        }
        const { details, html } = column
        let props = {}
        if (typeof details === 'function') {
          let content = details(this.getRowInfo(rowInfo))
          if (html) {
            props.html = content
          }
          props.children = content
        } else if (details instanceof Array) {
          let content = details[rowInfo.index]
          if (content == null) {
            // No content to render, although we should never get here since
            // the expander isn't rendered for this row.
            return null
          }
          if (html) {
            props.html = content
          }
          props.children = hydrate({ Reactable, Fragment, WidgetContainer }, content)
        }
        // Set key to force updates when expanding a different column.
        // And also to unmount properly when changing page. Since expanded state
        // is controlled, we only collapse rows via onPageChange AFTER the page
        // has changed.
        return <RowDetails key={`${expandedId}-${rowInfo.index}`} {...props} />
      }

      // Add a dummy expander column to prevent react-table from adding one
      // automatically, which won't work with our custom expanders.
      columns = [{ expander: true, show: false }, ...columns]
    } else {
      // SubComponent must have a value (not undefined) to properly update on rerenders
      SubComponent = null
    }

    // Expanded state is controlled, so we have to handle expanding of pivoted cells
    const onExpandedChange = newExpanded => {
      this.setState({ expanded: newExpanded })
    }
    // And also handle collapsing on page and sorting (but not filtering) change
    const collapseExpanded = () => {
      if (Object.keys(this.state.expanded).length > 0) {
        this.setState({ expanded: {} })
      }
    }

    let newGetTdProps = getTdProps
    if (onClick) {
      if (onClick === 'select') {
        onClick = (rowInfo, column) => {
          // Ignore padding rows
          if (!rowInfo) {
            return
          }
          // Ignore expandable pivoted cells
          if (column.pivoted && rowInfo.aggregated) {
            return
          }
          if (rowInfo.aggregated) {
            if (selection === 'single') return
            const rows = rowInfo.subRows
            // Don't support selecting aggregated cells for now
            if (!rows || rows.some(row => row._aggregated)) {
              return null
            }
            const indices = rows.map(row => row._index)
            const checked = indices.every(index => this.isSelected(index))
            this.toggleSelectionAll(indices, !checked)
          } else {
            this.toggleSelection(rowInfo.index)
          }
        }
      } else if (onClick === 'expand') {
        onClick = (rowInfo, column) => {
          // Ignore padding rows
          if (!rowInfo) {
            return
          }
          const firstDetailsCol = dataColumns.find(col => col.details)
          if (rowInfo.aggregated) {
            // Pivoted columns already expand on click
            if (!column.pivoted) {
              this.toggleExpand(rowInfo)
            }
          } else if (firstDetailsCol) {
            const details = firstDetailsCol.details
            if (details instanceof Array && details[rowInfo.index] == null) {
              // Ignore rows without content
              return
            }
            this.toggleExpand(rowInfo, firstDetailsCol)
          }
        }
      }

      newGetTdProps = (state, rowInfo, column) => {
        return {
          ...getTdProps(state, rowInfo),
          onClick: (e, handleOriginal) => {
            onClick(rowInfo, column, state)
            if (handleOriginal) {
              handleOriginal()
            }
          }
        }
      }
    }

    let TableComponent
    let newGetTableProps = getTableProps
    if (searchable) {
      TableComponent = SearchTableComponent
      newGetTableProps = (state, rowInfo, column, instance) => {
        const filter = state.filtered.find(filter => filter.id === state.searchKey)
        const searchValue = filter ? filter.value : ''
        const onSearchChange = event => {
          instance.filterColumn({ id: state.searchKey }, event.target.value)
        }
        return {
          ...getTableProps(state, rowInfo),
          searchValue,
          onSearchChange,
          searchPlaceholder: state.language.searchPlaceholder,
          searchLabel: state.language.searchLabel,
          searchClassName: css(state.theme.searchInputStyle)
        }
      }
    }

    return (
      <Table
        data={data}
        columns={columns}
        pivotBy={pivotBy || []}
        sortable={sortable}
        resizable={resizable}
        filterable={filterable}
        searchable={searchable}
        searchKey="__search__"
        defaultSortDesc={defaultSortDesc}
        defaultSorted={defaultSorted}
        defaultPageSize={defaultPageSize}
        pageSizeOptions={pageSizeOptions}
        showPagination={showPagination}
        showPageSizeOptions={showPageSizeOptions}
        PaginationComponent={Pagination}
        paginationType={paginationType}
        autoHidePagination={autoHidePagination}
        showPageInfo={showPageInfo}
        minRows={minRows}
        collapseOnSortingChange={true}
        collapseOnPageChange={true}
        collapseOnDataChange={false}
        className={className}
        style={style}
        expanded={this.state.expanded}
        onExpandedChange={onExpandedChange}
        onPageChange={collapseExpanded}
        onSortedChange={collapseExpanded}
        getTableProps={newGetTableProps}
        getTheadGroupTrProps={getTheadGroupTrProps}
        getTheadGroupThProps={getTheadGroupThProps}
        getTheadTrProps={getTheadTrProps}
        getTheadThProps={getTheadThProps}
        getTheadFilterTrProps={getTheadFilterTrProps}
        getTheadFilterThProps={getTheadFilterThProps}
        getTbodyProps={getTbodyProps}
        getTrGroupProps={getTrGroupProps}
        getTrProps={newGetTrProps}
        getTdProps={newGetTdProps}
        getTfootTrProps={getTfootTrProps}
        getTfootTdProps={getTfootTdProps}
        TableComponent={TableComponent}
        SubComponent={SubComponent}
        {...selectProps}
        theme={theme}
        language={language}
        crosstalkGroup={crosstalkGroup}
        crosstalkKey={crosstalkKey}
        crosstalkId="__crosstalk__"
        // Force ReactTable to rerender when default page size changes
        key={`${defaultPageSize}`}
        // Used to deep compare data and/or columns props
        dataKey={this.state.dataKey || dataKey}
        ref={this.tableInstance}
        getProps={() => {
          // Send reactable state to Shiny on ReactTable state changes
          this.onTableUpdate()
          return {
            // Get the table's DOM element
            ref: this.tableElement,
            // Add keyboard-only focus styles
            onMouseDown: () => {
              this.tableElement.current.classList.remove('rt-keyboard-active')
            },
            onKeyDown: () => {
              this.tableElement.current.classList.add('rt-keyboard-active')
            },
            onKeyUp: e => {
              // Detect keyboard use when tabbing into the table
              const keyCode = e.which || e.keyCode
              if (keyCode === 9) {
                this.tableElement.current.classList.add('rt-keyboard-active')
              }
            }
          }
        }}
      />
    )
  }
}

Reactable.propTypes = {
  data: PropTypes.objectOf(PropTypes.array).isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  columnGroups: PropTypes.arrayOf(PropTypes.object),
  pivotBy: PropTypes.arrayOf(PropTypes.string),
  sortable: PropTypes.bool,
  resizable: PropTypes.bool,
  filterable: PropTypes.bool,
  searchable: PropTypes.bool,
  defaultSortDesc: PropTypes.bool,
  defaultSorted: PropTypes.arrayOf(PropTypes.object),
  defaultPageSize: PropTypes.number,
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  paginationType: PropTypes.oneOf(['numbers', 'jump', 'simple']),
  showPagination: PropTypes.bool,
  showPageSizeOptions: PropTypes.bool,
  showPageInfo: Pagination.propTypes.showPageInfo,
  minRows: PropTypes.number,
  defaultExpanded: PropTypes.bool,
  selection: PropTypes.oneOf(['multiple', 'single']),
  selectionId: PropTypes.string,
  defaultSelected: PropTypes.arrayOf(PropTypes.number),
  onClick: PropTypes.oneOfType([PropTypes.oneOf(['expand', 'select']), PropTypes.func]),
  outlined: PropTypes.bool,
  bordered: PropTypes.bool,
  borderless: PropTypes.bool,
  striped: PropTypes.bool,
  highlight: PropTypes.bool,
  compact: PropTypes.bool,
  nowrap: PropTypes.bool,
  showSortIcon: PropTypes.bool,
  showSortable: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  rowClassName: PropTypes.oneOfType([PropTypes.string, PropTypes.func, PropTypes.array]),
  rowStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.func, PropTypes.array]),
  inline: PropTypes.bool,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  theme: PropTypes.object,
  language: PropTypes.object,
  crosstalkKey: PropTypes.array,
  crosstalkGroup: PropTypes.string,
  dataKey: PropTypes.string,
  nested: PropTypes.bool
}

Reactable.defaultProps = {
  sortable: true,
  resizable: false,
  showPageSizeOptions: false,
  showSortIcon: true
}

export default Reactable
