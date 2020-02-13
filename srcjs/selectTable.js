// selectTable HOC adapted from
// https://github.com/tannerlinsley/react-table/blob/v6/src/hoc/selectTable/index.js

import React from 'react'
import PropTypes from 'prop-types'

import { defaultLanguage } from './language'

const DefaultSelectInputComponent = props => {
  const { selectType, checked, label, rows, row, onClick } = props
  return (
    <input
      type={selectType || 'checkbox'}
      aria-label={label}
      checked={checked}
      onClick={e => {
        e.stopPropagation()
        if (rows) {
          // Select all
          const indices = rows.map(row => row._index)
          onClick(indices, !checked)
        } else if (row) {
          // Select single
          const index = row._index
          onClick(index)
        }
      }}
      onChange={() => {}}
    />
  )
}

DefaultSelectInputComponent.propTypes = {
  selectType: PropTypes.oneOf(['checkbox', 'radio']),
  checked: PropTypes.bool,
  label: PropTypes.string,
  onClick: PropTypes.func,
  row: PropTypes.object,
  rows: PropTypes.arrayOf(PropTypes.object)
}

export default (Component, options) => {
  class RTSelectTable extends React.Component {
    constructor(props) {
      super(props)
    }

    rowSelector(cellInfo) {
      const { isSelected, toggleSelection, selectType, SelectInputComponent, language } = this.props
      const checked = isSelected(cellInfo.index)
      const inputProps = {
        checked,
        onClick: toggleSelection,
        selectType,
        row: cellInfo.row,
        label: checked ? language.deselectRowLabel : language.selectRowLabel
      }
      return React.createElement(SelectInputComponent, inputProps)
    }

    subRowSelector(cellInfo) {
      const { isSelected, toggleAll, selectType, SelectInputComponent, language } = this.props
      if (selectType === 'radio') return null
      const rows = cellInfo.subRows
      // Don't support selecting aggregated cells for now
      if (!rows || rows.some(row => row._aggregated)) {
        return null
      }
      const checked = rows.every(row => isSelected(row._index))
      const inputProps = {
        checked,
        onClick: toggleAll,
        selectType,
        rows,
        label: checked ? language.deselectAllSubRowsLabel : language.selectAllSubRowsLabel
      }
      return React.createElement(SelectInputComponent, inputProps)
    }

    headSelector(cellInfo) {
      const { isSelected, selectType, toggleAll, SelectAllInputComponent, language } = this.props
      if (selectType === 'radio') return null
      const rows = cellInfo.data
      // Don't support selecting aggregated cells for now
      if (rows.length === 0 || rows.some(row => row._aggregated)) {
        return null
      }
      const checked = rows.every(row => isSelected(row._index))
      const inputProps = {
        checked,
        onClick: toggleAll,
        selectType,
        rows,
        label: checked ? language.deselectAllRowsLabel : language.selectAllRowsLabel
      }
      return React.createElement(SelectAllInputComponent, inputProps)
    }

    render() {
      const { columns: originalCols, selectWidth, forwardedRef, ...rest } = this.props
      const select = {
        id: '_selector',
        accessor: () => '', // this value is not important
        Header: cellInfo => {
          return <label className="rt-select-label">{this.headSelector.bind(this)(cellInfo)}</label>
        },
        Cell: cellInfo => {
          return <label className="rt-select-label">{this.rowSelector.bind(this)(cellInfo)}</label>
        },
        Aggregated: cellInfo => {
          return (
            <label className="rt-select-label">{this.subRowSelector.bind(this)(cellInfo)}</label>
          )
        },
        selectable: true,
        filterable: false,
        sortable: false,
        resizable: false,
        className: 'rt-select',
        headerClassName: 'rt-select',
        width: selectWidth || 30,
        style: { textAlign: 'center' }
      }

      const columns =
        options !== undefined && options.floatingLeft === true
          ? [...originalCols, select]
          : [select, ...originalCols]
      const extra = {
        columns
      }

      return <Component ref={forwardedRef} {...rest} {...extra} />
    }
  }

  RTSelectTable.displayName = 'RTSelectTable'
  RTSelectTable.propTypes = {
    selectType: PropTypes.oneOf(['checkbox', 'radio']).isRequired,
    SelectInputComponent: PropTypes.func.isRequired,
    SelectAllInputComponent: PropTypes.func.isRequired,
    isSelected: PropTypes.func.isRequired,
    toggleSelection: PropTypes.func.isRequired,
    toggleAll: PropTypes.func.isRequired,
    selectWidth: PropTypes.number,
    columns: PropTypes.array.isRequired,
    language: PropTypes.shape({
      selectAllRowsLabel: PropTypes.string,
      deselectAllRowsLabel: PropTypes.string,
      selectAllSubRowsLabel: PropTypes.string,
      deselectAllSubRowsLabel: PropTypes.string,
      selectRowLabel: PropTypes.string,
      deselectRowLabel: PropTypes.string
    }),
    forwardedRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })])
  }
  RTSelectTable.defaultProps = {
    selectType: 'checkbox',
    SelectInputComponent: DefaultSelectInputComponent,
    SelectAllInputComponent: DefaultSelectInputComponent,
    language: defaultLanguage
  }

  return React.forwardRef((props, ref) => {
    return <RTSelectTable {...props} forwardedRef={ref} />
  })
}
