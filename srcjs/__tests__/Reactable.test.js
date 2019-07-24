import React from 'react'
import reactR from 'reactR'
import Reactable from '../Reactable'
import { render, fireEvent, cleanup } from 'react-testing-library'
import 'jest-dom/extend-expect'

jest.mock('reactR')
reactR.hydrate = (components, tag) => tag

afterEach(cleanup)

test('basic table rendering', () => {
  const { getAllByText } = render(
    <Reactable
      data={{
        a: [123, 246, -369],
        b: ['aa', 'bb', 'cc'],
        c: [true, false, null],
        d: ['2019-03-04', '1955-12-12', '2000-01-30']
      }}
      columns={[
        { Header: 'num', accessor: 'a', type: 'numeric' },
        { Header: 'str', accessor: 'b', type: 'character' },
        { Header: 'bool', accessor: 'c', type: 'logical' },
        { Header: 'date', accessor: 'd', type: 'date' }
      ]}
    />
  )
  const cellContent = [
    '123',
    '246',
    '-369',
    'aa',
    'bb',
    'cc',
    'true',
    'false',
    '2019-03-04',
    '1955-12-12',
    '2000-01-30'
  ]
  cellContent.forEach(content => {
    expect(getAllByText(content)).toHaveLength(1)
  })
})

describe('sorting', () => {
  it('sets aria-sort attributes', () => {
    const { container } = render(
      <Reactable
        data={{ a: [1, 2], b: ['aa', 'bb'], c: [true, false] }}
        columns={[
          { Header: 'colA', accessor: 'a' },
          { Header: 'colB', accessor: 'b' },
          { Header: 'colC', accessor: 'c', sortable: false }
        ]}
      />
    )
    const headers = container.querySelectorAll('[aria-sort]')
    expect(headers.length).toEqual(2)
    expect(headers[0]).toHaveAttribute('aria-sort', 'none')
    expect(headers[1]).toHaveAttribute('aria-sort', 'none')
    expect(headers[0]).toHaveTextContent('colA')
    expect(headers[1]).toHaveTextContent('colB')

    fireEvent.click(headers[1])
    expect(headers[1]).toHaveAttribute('aria-sort', 'ascending')

    fireEvent.click(headers[1])
    expect(headers[1]).toHaveAttribute('aria-sort', 'descending')
  })

  it('shows sort indicators', () => {
    const { container } = render(
      <Reactable
        data={{ a: [1, 2], b: ['aa', 'bb'], c: [true, false] }}
        columns={[
          { Header: 'colA', accessor: 'a', type: 'numeric' },
          { Header: 'colB', accessor: 'b' }
        ]}
      />
    )
    const numericSortIndicator = container.querySelectorAll('.rt-th .-sort-left')
    expect(numericSortIndicator).toHaveLength(1)
    const defaultSortIndicator = container.querySelectorAll('.rt-th .-sort-right')
    expect(defaultSortIndicator).toHaveLength(1)
  })

  it('sorts NAs to the bottom', () => {
    const { container } = render(
      <Reactable
        data={{ a: [2, 'NA', 1, 3], b: ['aa', null, null, 'BB'] }}
        columns={[
          {
            Header: 'colA',
            accessor: 'a',
            type: 'numeric',
            sortMethod: 'naLast',
            className: 'col-a'
          },
          { Header: 'colB', accessor: 'b', sortMethod: 'naLast', className: 'col-b' }
        ]}
        minRows={4}
      />
    )
    const headers = container.querySelectorAll('[aria-sort]')
    expect(headers.length).toEqual(2)

    fireEvent.click(headers[0])
    const colA = container.querySelectorAll('.col-a')
    expect([...colA].map(el => el.textContent)).toEqual(['1', '2', '3', ''])
    fireEvent.click(headers[0])
    expect([...colA].map(el => el.textContent)).toEqual(['3', '2', '1', ''])

    fireEvent.click(headers[1])
    const colB = container.querySelectorAll('.col-b')
    expect([...colB].map(el => el.textContent)).toEqual(['aa', 'BB', '', ''])
    fireEvent.click(headers[1])
    expect([...colB].map(el => el.textContent)).toEqual(['BB', 'aa', '', ''])
  })
})

describe('filtering', () => {
  it('enables filtering', () => {
    const props = {
      data: { a: [1, 2], b: ['a', 'b'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }]
    }
    const { container, rerender } = render(<Reactable {...props} />)
    let filters = container.querySelectorAll('.rt-thead.-filters input')
    expect(filters).toHaveLength(0)
    rerender(<Reactable {...props} filterable />)
    filters = container.querySelectorAll('.rt-thead.-filters input')
    expect(filters).toHaveLength(2)
  })

  it('filters numeric columns', () => {
    const { container, getByText } = render(
      <Reactable
        data={{ a: [111, 115, 32.11] }}
        columns={[{ Header: 'a', accessor: 'a', type: 'numeric' }]}
        filterable
        minRows={1}
      />
    )
    const filter = container.querySelector('.rt-thead.-filters input')

    fireEvent.change(filter, { target: { value: '11' } })
    let rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(2)
    expect(getByText('111')).toBeTruthy()
    expect(getByText('115')).toBeTruthy()

    // No matches
    fireEvent.change(filter, { target: { value: '5' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(1)
    expect(getByText('No rows found')).toBeTruthy()

    // Clear filter
    fireEvent.change(filter, { target: { value: '' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(3)
  })

  it('filters string columns', () => {
    const { container, getByText } = render(
      <Reactable
        data={{ a: ['aaac', 'bbb', 'CCC'], b: ['ááád', 'bAb', 'CC'] }}
        columns={[
          { Header: 'a', accessor: 'a', type: 'factor' },
          { Header: 'b', accessor: 'b', type: 'character' }
        ]}
        filterable
        minRows={1}
      />
    )
    const filters = container.querySelectorAll('.rt-thead.-filters input')

    // Case-insensitive
    fireEvent.change(filters[0], { target: { value: 'Bb' } })
    let rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(1)
    expect(getByText('bbb')).toBeTruthy()

    // Substring matches
    fireEvent.change(filters[0], { target: { value: 'c' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(2)
    expect(getByText('aaac')).toBeTruthy()
    expect(getByText('CCC')).toBeTruthy()

    // No matches
    fireEvent.change(filters[0], { target: { value: 'cccc' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(1)
    expect(getByText('No rows found')).toBeTruthy()

    // Clear filter
    fireEvent.change(filters[0], { target: { value: '' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(3)

    // Locale-sensitive
    fireEvent.change(filters[1], { target: { value: 'a' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(2)
    expect(getByText('ááád')).toBeTruthy()
    expect(getByText('bAb')).toBeTruthy()
  })

  it('filters other columns', () => {
    const { container, getByText } = render(
      <Reactable
        data={{ a: ['ááád', '123', 'acCC', '2018-03-05'] }}
        columns={[{ Header: 'a', accessor: 'a' }]}
        filterable
        minRows={1}
      />
    )
    const filter = container.querySelector('.rt-thead.-filters input')

    // Case-insensitive
    fireEvent.change(filter, { target: { value: 'acc' } })
    let rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(1)
    expect(getByText('acCC')).toBeTruthy()

    // Substring matches
    fireEvent.change(filter, { target: { value: '03-05' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(1)
    expect(getByText('2018-03-05')).toBeTruthy()

    // Not locale-sensitive
    fireEvent.change(filter, { target: { value: 'aaa' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(1)
    expect(getByText('No rows found')).toBeTruthy()

    // Clear filter
    fireEvent.change(filter, { target: { value: '' } })
    rows = container.querySelectorAll('.rt-tr-group')
    expect(rows).toHaveLength(4)
  })
})

test('table styles', () => {
  const props = { data: { a: [1, 2] }, columns: [{ Header: 'a', accessor: 'a' }] }
  const { container, rerender } = render(<Reactable {...props} />)
  const table = container.querySelector('.ReactTable')
  expect(table).not.toHaveClass(
    '-outlined',
    '-bordered',
    '-borderless',
    '-striped',
    '-highlight',
    '-compact',
    '-inline'
  )

  rerender(<Reactable {...props} outlined />)
  expect(table).toHaveClass('-outlined')

  rerender(<Reactable {...props} bordered />)
  expect(table).toHaveClass('-bordered')

  rerender(<Reactable {...props} borderless />)
  expect(table).toHaveClass('-borderless')

  rerender(<Reactable {...props} striped />)
  expect(table).toHaveClass('-striped')

  rerender(<Reactable {...props} highlight />)
  expect(table).toHaveClass('-highlight')

  rerender(<Reactable {...props} compact />)
  expect(table).toHaveClass('-compact')

  rerender(<Reactable {...props} inline />)
  expect(table).toHaveClass('-inline')

  rerender(<Reactable {...props} outlined bordered borderless striped highlight inline />)
  expect(table).toHaveClass('-outlined -bordered -borderless -striped -highlight -inline')
})

describe('row selection', () => {
  beforeEach(() => {
    window.Shiny = { onInputChange: jest.fn() }
  })

  afterEach(() => {
    delete window.Shiny
  })

  const props = {
    data: { a: [1, 2] },
    columns: [{ Header: 'a', accessor: 'a' }]
  }

  it('not selectable by default', () => {
    const { container } = render(<Reactable {...props} />)
    expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
    expect(container.querySelectorAll('input[type=radio]')).toHaveLength(0)
  })

  it('multiple select', () => {
    const { container, getByLabelText } = render(
      <Reactable {...props} selection="multiple" selectionId="selected" />
    )
    expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(3)
    const selectAllCheckbox = getByLabelText('Select all rows')
    const selectRow1Checkbox = getByLabelText('Select row 1')
    const selectRow2Checkbox = getByLabelText('Select row 2')

    fireEvent.click(selectAllCheckbox)
    expect(selectAllCheckbox.checked).toEqual(true)
    expect(selectRow1Checkbox.checked).toEqual(true)
    expect(selectRow2Checkbox.checked).toEqual(true)
    expect(window.Shiny.onInputChange).toHaveBeenLastCalledWith('selected', [1, 2])

    fireEvent.click(selectAllCheckbox)
    expect(selectAllCheckbox.checked).toEqual(false)
    expect(selectRow1Checkbox.checked).toEqual(false)
    expect(selectRow2Checkbox.checked).toEqual(false)
    expect(window.Shiny.onInputChange).toHaveBeenLastCalledWith('selected', [])
  })

  it('single select', () => {
    const { container, getByLabelText } = render(
      <Reactable {...props} selection="single" selectionId="selected" />
    )
    expect(container.querySelectorAll('input[type=radio]')).toHaveLength(2)
    const selectRow1Radio = getByLabelText('Select row 1')
    const selectRow2Radio = getByLabelText('Select row 2')

    fireEvent.click(selectRow1Radio)
    expect(selectRow1Radio.checked).toEqual(true)
    expect(selectRow2Radio.checked).toEqual(false)
    expect(window.Shiny.onInputChange).toHaveBeenLastCalledWith('selected', [1])

    fireEvent.click(selectRow2Radio)
    expect(selectRow1Radio.checked).toEqual(false)
    expect(selectRow2Radio.checked).toEqual(true)
    expect(window.Shiny.onInputChange).toHaveBeenLastCalledWith('selected', [2])

    fireEvent.click(selectRow2Radio)
    expect(selectRow1Radio.checked).toEqual(false)
    expect(selectRow2Radio.checked).toEqual(false)
    expect(window.Shiny.onInputChange).toHaveBeenLastCalledWith('selected', [])
  })

  it('works without Shiny', () => {
    delete window.Shiny
    const { container, getByLabelText } = render(
      <Reactable {...props} selection="multiple" selectionId="selected" />
    )
    expect(container.querySelectorAll('input[type=checkbox]')).toHaveLength(3)
    const selectAllCheckbox = getByLabelText('Select all rows')
    const selectRow1Checkbox = getByLabelText('Select row 1')
    const selectRow2Checkbox = getByLabelText('Select row 2')

    fireEvent.click(selectAllCheckbox)
    expect(selectAllCheckbox.checked).toEqual(true)
    expect(selectRow1Checkbox.checked).toEqual(true)
    expect(selectRow2Checkbox.checked).toEqual(true)
  })
})

describe('row details', () => {
  const getExpanders = container => container.querySelectorAll('.rt-expander')
  const props = {
    data: { a: [1, 2], b: ['a', 'b'] }
  }

  it('render function', () => {
    const columns = [
      { Header: 'a', accessor: 'a' },
      { Header: 'b', accessor: 'b', details: rowInfo => `row details: ${rowInfo.row.a}` }
    ]
    const { container, getByText, queryByText } = render(<Reactable {...props} columns={columns} />)
    const expanders = getExpanders(container)
    expect(expanders).toHaveLength(2)

    expect(queryByText('row details: 1')).toEqual(null)
    fireEvent.click(expanders[0])
    expect(getByText('row details: 1')).toBeTruthy()

    expect(queryByText('row details: 2')).toEqual(null)
    fireEvent.click(expanders[1])
    expect(getByText('row details: 2')).toBeTruthy()
  })

  it('render function to html', () => {
    const columns = [
      { Header: 'a', accessor: 'a' },
      {
        Header: 'b',
        accessor: 'b',
        html: true,
        details: rowInfo => `<span class="row-details">row details: ${rowInfo.row.a}</span>`
      }
    ]
    const { container } = render(<Reactable {...props} columns={columns} />)
    const expanders = getExpanders(container)
    fireEvent.click(expanders[0])
    fireEvent.click(expanders[1])
    const content = container.querySelectorAll('span.row-details')
    expect(content).toHaveLength(2)
    expect(content[0].innerHTML).toEqual('row details: 1')
    expect(content[1].innerHTML).toEqual('row details: 2')
  })

  it('render content to html', () => {
    const columns = [
      { Header: 'a', accessor: 'a' },
      {
        Header: 'b',
        accessor: 'b',
        html: true,
        details: [
          '<span class="row-details">row details: 1</span>',
          '<span class="row-details">row details: 2</span>'
        ]
      }
    ]
    const { container } = render(<Reactable {...props} columns={columns} />)
    const expanders = getExpanders(container)
    fireEvent.click(expanders[0])
    fireEvent.click(expanders[1])
    const content = container.querySelectorAll('span.row-details')
    expect(content).toHaveLength(2)
    expect(content[0].innerHTML).toEqual('row details: 1')
    expect(content[1].innerHTML).toEqual('row details: 2')
  })

  it('render content with conditional expanders', () => {
    const columns = [
      { Header: 'a', accessor: 'a' },
      { Header: 'b', accessor: 'b', details: ['row details: 1', null] }
    ]
    const { container, getByText, queryByText } = render(<Reactable {...props} columns={columns} />)
    const expanders = getExpanders(container)
    expect(expanders).toHaveLength(1)

    expect(queryByText('row details: 1')).toEqual(null)
    fireEvent.click(expanders[0])
    expect(getByText('row details: 1')).toBeTruthy()
  })

  it('renders empty row details', () => {
    const columns = [
      { Header: 'a', accessor: 'a' },
      { Header: 'b', accessor: 'b', details: ['', ''] }
    ]
    const { container } = render(<Reactable {...props} columns={columns} />)
    const expanders = getExpanders(container)
    expect(expanders).toHaveLength(2)
    fireEvent.click(expanders[0])
    fireEvent.click(expanders[1])
  })

  it('renders multiple row details', () => {
    const columns = [
      { Header: 'a', accessor: 'a', details: ['detail-a1', 'detail-a2'] },
      { Header: 'b', accessor: 'b', details: ['detail-b1', 'detail-b2'] }
    ]
    const { container, getByText, queryByText } = render(<Reactable {...props} columns={columns} />)
    const expanders = getExpanders(container)
    expect(expanders).toHaveLength(4)

    fireEvent.click(expanders[0])
    expect(getByText('detail-a1')).toBeTruthy()
    expect(queryByText('detail-b1')).toEqual(null)

    // Row 1, col b
    fireEvent.click(expanders[1])
    expect(getByText('detail-b1')).toBeTruthy()
    expect(queryByText('detail-a1')).toEqual(null)

    // Row 2, col a
    fireEvent.click(expanders[2])
    expect(getByText('detail-a2')).toBeTruthy()
    expect(queryByText('detail-b2')).toEqual(null)

    // Row 2, col b
    fireEvent.click(expanders[3])
    expect(getByText('detail-b2')).toBeTruthy()
    expect(queryByText('detail-a2')).toEqual(null)
  })

  it('handles Shiny elements in content', () => {
    window.Shiny = { bindAll: jest.fn(), unbindAll: jest.fn() }
    const columns = [
      { Header: 'a', accessor: 'a', details: ['row details: a'] },
      { Header: 'b', accessor: 'b', details: ['row details: b'] }
    ]
    const { container } = render(<Reactable {...props} columns={columns} />)
    const expanders = getExpanders(container)
    expect(expanders).toHaveLength(2)
    fireEvent.click(expanders[0])
    expect(window.Shiny.bindAll).toHaveBeenCalledTimes(1)
    expect(window.Shiny.unbindAll).toHaveBeenCalledTimes(0)
    fireEvent.click(expanders[0])
    expect(window.Shiny.bindAll).toHaveBeenCalledTimes(1)
    expect(window.Shiny.unbindAll).toHaveBeenCalledTimes(1)

    // Content should update properly when expanding another column while one
    // column is already expanded.
    fireEvent.click(expanders[0])
    expect(window.Shiny.bindAll).toHaveBeenCalledTimes(2)
    expect(window.Shiny.unbindAll).toHaveBeenCalledTimes(1)
    fireEvent.click(expanders[1])
    expect(window.Shiny.bindAll).toHaveBeenCalledTimes(3)
    expect(window.Shiny.unbindAll).toHaveBeenCalledTimes(2)
    fireEvent.click(expanders[0])
    expect(window.Shiny.bindAll).toHaveBeenCalledTimes(4)
    expect(window.Shiny.unbindAll).toHaveBeenCalledTimes(3)

    delete window.Shiny
  })

  it('details are collapsed on pagination, sorting, and filtering', () => {
    const columns = [
      { Header: 'col-a', accessor: 'a', filterable: true, details: ['row-details', 'row-details'] },
      { Header: 'col-b', accessor: 'b' }
    ]
    const { container, getByText, queryByText } = render(
      <Reactable {...props} columns={columns} defaultPageSize={1} />
    )
    let expanders = getExpanders(container)
    expect(expanders).toHaveLength(1)

    // Pagination
    fireEvent.click(expanders[0])
    expect(getByText('row-details')).toBeTruthy()
    fireEvent.click(container.querySelector('.rt-next-button'))
    expect(queryByText('row-details')).toEqual(null)

    // Sorting
    expanders = getExpanders(container)
    fireEvent.click(expanders[0])
    expect(getByText('row-details')).toBeTruthy()
    fireEvent.click(getByText('col-b'))
    expect(queryByText('row-details')).toEqual(null)

    // Filtering
    expanders = getExpanders(container)
    fireEvent.click(expanders[0])
    expect(getByText('row-details')).toBeTruthy()
    const filter = container.querySelector('.rt-thead.-filters input')
    fireEvent.change(filter, { target: { value: '1' } })
    expect(queryByText('row-details')).toEqual(null)
    expect(getExpanders(container)).toHaveLength(1)
  })

  it('pivoting still works with custom expanders', () => {
    const getRows = container => container.querySelectorAll('.rt-tbody .rt-tr')
    const columns = [{ Header: 'col-a', accessor: 'a' }, { Header: 'col-b', accessor: 'b' }]
    const { container } = render(
      <Reactable {...props} columns={columns} pivotBy={['b']} defaultPageSize={2} />
    )
    let expanders = getExpanders(container)
    expect(expanders).toHaveLength(2)
    expect(getRows(container)).toHaveLength(2)

    // Expand pivoted cell
    fireEvent.click(expanders[0])
    expect(getRows(container)).toHaveLength(3)
  })

  it('pivoting works with row details', () => {
    const getRows = container => container.querySelectorAll('.rt-tbody .rt-tr')
    const getCells = container => container.querySelectorAll('.rt-td')
    const columns = [
      { Header: 'col-a', accessor: 'a', details: ['row-details', 'row-details'] },
      { Header: 'col-b', accessor: 'b' }
    ]
    const { container, getByText } = render(
      <Reactable {...props} columns={columns} pivotBy={['b']} defaultPageSize={2} />
    )
    let expanders = getExpanders(container)
    expect(expanders).toHaveLength(2)
    expect(getRows(container)).toHaveLength(2)

    // Expand pivoted cell
    fireEvent.click(expanders[0])
    expect(getRows(container)).toHaveLength(3)

    // Expand details
    expanders = getExpanders(container)
    expect(expanders).toHaveLength(3)
    fireEvent.click(expanders[1])
    expect(getByText('row-details')).toBeTruthy()

    // Empty cells under pivoted cells should not be clickable
    const cells = getCells(container)
    const pivotedChildCell = cells[2]
    expect(pivotedChildCell).toHaveTextContent('')
    expect(pivotedChildCell).toHaveClass('rt-expand-disabled')
    fireEvent.click(pivotedChildCell)
    expect(getByText('row-details')).toBeTruthy()
  })
})

describe('footer rendering', () => {
  const data = { a: [1, 2] }

  it('renders a basic footer', () => {
    const columns = [
      {
        Header: 'a',
        accessor: 'a',
        footer: 'my-footer',
        footerClassName: 'my-footer',
        footerStyle: { color: 'red' }
      }
    ]
    const props = { data, columns }
    const { getByText } = render(<Reactable {...props} />)
    const footer = getByText('my-footer')
    expect(footer).toHaveClass('my-footer')
    expect(footer).toHaveStyle('color: red;')
  })

  it('render function', () => {
    const columns = [
      {
        Header: 'a',
        accessor: 'a',
        footer: colInfo => `rows: ${colInfo.data.length}`
      }
    ]
    const props = { data, columns }
    const { getByText } = render(<Reactable {...props} />)
    const footer = getByText('rows: 2')
    expect(footer).toBeTruthy()
  })

  it('does not apply cell classes and styles to footers', () => {
    const columns = [
      {
        Header: 'a',
        accessor: 'a',
        footer: 'my-footer',
        className: 'cell',
        style: { color: 'red' }
      }
    ]
    const props = { data, columns }
    const { getByText } = render(<Reactable {...props} />)
    const footer = getByText('my-footer')
    expect(footer).not.toHaveClass('cell')
    expect(footer).not.toHaveStyle('color: red;')
  })
})

describe('column classes and styles', () => {
  const data = { a: ['cellA', 'cellB'] }

  it('applies fixed classes and styles', () => {
    const columns = [
      {
        Header: 'a',
        accessor: 'a',
        className: 'my-cell',
        style: { backgroundColor: 'red' }
      }
    ]
    const props = { data, columns }
    const { getByText } = render(<Reactable {...props} />)
    const cell = getByText('cellA')
    expect(cell).toHaveClass('my-cell')
    expect(cell).toHaveStyle('background-color: red;')
  })

  it('applies conditional classes and styles from JS callbacks', () => {
    const columns = [
      {
        Header: 'a',
        accessor: 'a',
        className: (rowInfo, state) => {
          if (rowInfo.index === 0 && state.page === 0) {
            return 'my-cell'
          }
        },
        style: (rowInfo, state) => {
          if (rowInfo.index === 0 && state.page === 0) {
            return { backgroundColor: 'red' }
          }
        }
      }
    ]
    const props = { data, columns }
    const { getByText } = render(<Reactable {...props} />)
    const cellA = getByText('cellA')
    expect(cellA).toHaveClass('my-cell')
    expect(cellA).toHaveStyle('background-color: red;')
    const cellB = getByText('cellB')
    expect(cellB).not.toHaveClass('my-cell')
    expect(cellB).not.toHaveStyle('background-color: red;')
  })

  it('applies conditional classes and styles from R callbacks', () => {
    const columns = [
      {
        Header: 'a',
        accessor: 'a',
        className: ['my-cell', null],
        style: [{ backgroundColor: 'red' }, null]
      }
    ]
    const props = { data, columns }
    const { getByText } = render(<Reactable {...props} />)
    const cellA = getByText('cellA')
    expect(cellA).toHaveClass('my-cell')
    expect(cellA).toHaveStyle('background-color: red;')
    const cellB = getByText('cellB')
    expect(cellB).not.toHaveClass('my-cell')
    expect(cellB).not.toHaveStyle('background-color: red;')
  })
})

describe('row classes and styles', () => {
  const getRows = container => container.querySelectorAll('.rt-tbody .rt-tr')

  it('applies fixed classes and styles', () => {
    const props = {
      data: { a: [1, 2, 3], b: ['a', 'b', 'c'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      rowClassName: 'my-row',
      rowStyle: { backgroundColor: 'red' }
    }
    const { container } = render(<Reactable {...props} />)
    const rows = getRows(container)
    rows.forEach(row => {
      expect(row).toHaveClass('my-row')
      expect(row).toHaveStyle('background-color: red;')
    })
  })

  it('applies conditional classes and styles from JS callbacks', () => {
    const props = {
      data: { a: [1, 2, 3], b: ['a', 'b', 'c'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      minRows: 5,
      rowClassName: (rowInfo, state) => {
        if (!rowInfo) {
          return 'pad-row'
        }
        if (rowInfo.index === 0 && state.page === 0) {
          return 'my-row'
        }
      },
      rowStyle: (rowInfo, state) => {
        if (!rowInfo) {
          return { backgroundColor: 'black' }
        }
        if (rowInfo.index === 0 && state.page === 0) {
          return { backgroundColor: 'red' }
        }
      }
    }
    const { container } = render(<Reactable {...props} />)
    const rows = getRows(container)
    rows.forEach((row, i) => {
      if (i === 0) {
        expect(row).toHaveClass('my-row')
        expect(row).toHaveStyle('background-color: red;')
      } else if (i < 3) {
        expect(row).not.toHaveClass('my-row')
        expect(row).not.toHaveStyle('background-color: red;')
      } else {
        // Padding rows
        expect(row).toHaveClass('pad-row')
        expect(row).toHaveStyle('background-color: black;')
      }
    })
  })

  it('applies conditional classes and styles from R callbacks', () => {
    const props = {
      data: { a: [1, 2, 3], b: ['a', 'b', 'c'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      minRows: 5,
      rowClassName: ['row1', 'row2', null],
      rowStyle: [{ backgroundColor: 'red' }, { backgroundColor: 'black' }, null]
    }
    const { container } = render(<Reactable {...props} />)
    const rows = getRows(container)
    rows.forEach((row, i) => {
      if (i === 0) {
        expect(row).toHaveClass('row1')
        expect(row).toHaveStyle('background-color: red;')
      } else if (i === 1) {
        expect(row).toHaveClass('row2')
        expect(row).toHaveStyle('background-color: black;')
      } else {
        // Unstyled row and padding rows (ignored)
        expect(row).not.toHaveClass('row1')
        expect(row).not.toHaveClass('row2')
        expect(row).not.toHaveStyle('background-color: red;')
        expect(row).not.toHaveStyle('background-color: black;')
      }
    })
  })
})

describe('pagination', () => {
  const getRows = container => container.querySelectorAll('.rt-tbody .rt-tr')
  const getPagination = container => container.querySelector('.rt-pagination')
  const getPageInfo = container => container.querySelector('.rt-page-info')
  const getPageSizeOptions = container => container.querySelector('.rt-page-size')
  const getPrevButton = container => container.querySelector('.rt-prev-button')
  const getNextButton = container => container.querySelector('.rt-next-button')
  const getPageNumbers = container => container.querySelector('.rt-page-numbers')
  const getPageButtons = container => container.querySelectorAll('.rt-page-button')
  const getPageJump = container => container.querySelector('.rt-page-jump')

  it('default page size', () => {
    const props = {
      data: { a: [1, 2, 3, 4, 5, 6, 7] },
      columns: [{ Header: 'a', accessor: 'a' }],
      defaultPageSize: 2
    }
    const { container, rerender } = render(<Reactable {...props} />)
    expect(getRows(container)).toHaveLength(2)

    // Should rerender if default page size changes
    rerender(<Reactable {...props} defaultPageSize={3} />)
    expect(getRows(container)).toHaveLength(3)
    rerender(<Reactable {...props} defaultPageSize={7} />)
    expect(getRows(container)).toHaveLength(7)
  })

  it('shows or hides pagination', () => {
    const props = {
      data: { a: [1, 2], b: ['a', 'b'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }]
    }

    // Auto hidden if table always fits on one page
    const { container, rerender } = render(<Reactable {...props} defaultPageSize={2} />)
    let pagination = getPagination(container)
    expect(pagination).toEqual(null)

    // Auto shown if default page size causes paging
    rerender(<Reactable {...props} defaultPageSize={1} pageSizeOptions={[10, 20]} />)
    pagination = getPagination(container)
    expect(pagination).toBeTruthy()

    // Auto shown if page size option causes paging
    rerender(<Reactable {...props} defaultPageSize={20} pageSizeOptions={[1, 20]} />)
    pagination = getPagination(container)
    expect(pagination).toBeTruthy()

    // Force show pagination
    rerender(<Reactable {...props} showPagination defaultPageSize={2} pageSizeOptions={[2]} />)
    pagination = getPagination(container)
    expect(pagination).toBeTruthy()

    // Force hide pagination
    rerender(<Reactable {...props} defaultPageSize={1} pageSizeOptions={[10, 20]} />)
    pagination = getPagination(container)
    expect(pagination).toBeTruthy()
  })

  it('page info', () => {
    const props = {
      data: { a: [1, 2, 3, 4, 5], b: ['a', 'b', 'c', 'd', 'e'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      defaultPageSize: 2
    }
    const { container, rerender } = render(<Reactable {...props} />)
    let pageInfo = getPageInfo(container)
    expect(pageInfo).toHaveTextContent('1-2 of 5 rows')

    const nextButton = getNextButton(container)
    fireEvent.click(nextButton)
    expect(pageInfo).toHaveTextContent('3-4 of 5 rows')
    fireEvent.click(nextButton)
    expect(pageInfo).toHaveTextContent('5-5 of 5 rows')

    // Updates on filtering
    rerender(<Reactable {...props} filterable />)
    const filter = container.querySelector('.rt-thead.-filters input')
    fireEvent.change(filter, { target: { value: '11' } })
    expect(pageInfo).toHaveTextContent('0-0 of 0 rows')

    // Hide page info
    rerender(<Reactable {...props} showPageInfo={false} />)
    pageInfo = getPageInfo(container)
    expect(pageInfo).toEqual(null)
  })

  it('page size options', () => {
    const props = {
      data: { a: [1, 2, 3, 4, 5], b: ['_a1', '_b2', '_c3', '_d4', '_e5'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      defaultPageSize: 2,
      pageSizeOptions: [2, 4, 6]
    }
    const { container, rerender } = render(<Reactable {...props} />)
    const pageSizeOptions = getPageSizeOptions(container)
    expect(pageSizeOptions).toHaveTextContent(/^Show 246$/)

    // Options
    const pageSizeSelect = pageSizeOptions.querySelector('select')
    const options = pageSizeSelect.querySelectorAll('option')
    expect(options).toHaveLength(3)
    options.forEach((option, i) => expect(option).toHaveTextContent(props.pageSizeOptions[i]))

    // Change page size
    fireEvent.change(pageSizeSelect, { target: { value: 4 } })
    expect(getRows(container)).toHaveLength(4)
    expect(getPageInfo(container)).toHaveTextContent('1-4 of 5 rows')

    // Hide page size options
    rerender(<Reactable {...props} showPageSizeOptions={false} />)
    expect(getPageSizeOptions(container)).toEqual(null)

    // No page info shown
    rerender(<Reactable {...props} showPageInfo={false} />)
    expect(getPageSizeOptions(container)).toHaveTextContent(/^Show 246 rows$/)
  })

  it('simple page navigation', () => {
    const props = {
      data: { a: [1, 2, 3, 4, 5], b: ['_a1', '_b2', '_c3', '_d4', '_e5'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      defaultPageSize: 2,
      paginationType: 'simple'
    }
    const { container, queryByText } = render(<Reactable {...props} />)
    const pageNumbers = getPageNumbers(container)
    const prevButton = getPrevButton(container)
    const nextButton = getNextButton(container)
    expect(pageNumbers).toHaveTextContent('1 of 3')
    expect(queryByText('_e5')).toEqual(null)

    // First page: previous button should be disabled
    expect(prevButton).toHaveAttribute('disabled')
    expect(prevButton).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(prevButton)
    expect(pageNumbers).toHaveTextContent('1 of 3')

    fireEvent.click(nextButton)
    expect(pageNumbers).toHaveTextContent('2 of 3')
    expect(prevButton).not.toHaveAttribute('disabled')
    expect(prevButton).not.toHaveAttribute('aria-disabled')
    expect(nextButton).not.toHaveAttribute('aria-disabled')

    fireEvent.click(nextButton)
    expect(pageNumbers).toHaveTextContent('3 of 3')
    expect(queryByText('_e5')).toBeTruthy()

    // Last page: next button should be disabled
    fireEvent.click(nextButton)
    expect(pageNumbers).toHaveTextContent('3 of 3')
    expect(nextButton).toHaveAttribute('disabled')
    expect(nextButton).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(prevButton)
    expect(pageNumbers).toHaveTextContent('2 of 3')
  })

  it('page number buttons', () => {
    const props = {
      data: { a: [1, 2, 3, 4, 5], b: ['_a1', '_b2', '_c3', '_d4', '_e5'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      defaultPageSize: 1,
      paginationType: 'numbers'
    }
    const { container, rerender, queryAllByText } = render(<Reactable {...props} />)
    let pageButtons = [...getPageButtons(container)]
    const pageNumberBtns = pageButtons.slice(1, pageButtons.length - 1)
    expect(pageNumberBtns).toHaveLength(5)
    pageNumberBtns.forEach((btn, i) => {
      const page = i + 1
      expect(btn).toHaveTextContent(page)
      if (page === 1) {
        expect(btn).toHaveAttribute('aria-label', `Page 1, current page`)
      } else {
        expect(btn).toHaveAttribute('aria-label', `Page ${page}`)
      }
    })

    fireEvent.click(pageNumberBtns[1])
    const pageInfo = getPageInfo(container)
    expect(pageInfo).toHaveTextContent('2-2 of 5 rows')
    expect(pageNumberBtns[0]).not.toHaveClass('rt-page-button-active')
    expect(pageNumberBtns[1]).toHaveClass('rt-page-button-active')
    expect(pageNumberBtns[1]).toHaveAttribute('aria-current', 'page')

    // Changing to the same page should be a no-op
    fireEvent.click(pageNumberBtns[1])
    expect(pageInfo).toHaveTextContent('2-2 of 5 rows')
    expect(pageNumberBtns[1]).toHaveClass('rt-page-button-active')

    fireEvent.click(pageNumberBtns[4])
    expect(pageInfo).toHaveTextContent('5-5 of 5 rows')

    // Should update on external page changes
    const prevButton = getPrevButton(container)
    fireEvent.click(prevButton)
    expect(pageNumberBtns[3]).toHaveClass('rt-page-button-active')

    // Pages with ellipses
    const data = { a: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
    rerender(<Reactable {...props} data={data} />)
    let ellipses = queryAllByText('...')
    expect(ellipses).toHaveLength(1)
    pageButtons = [...getPageButtons(container)]
    fireEvent.click(pageButtons[5]) // page 5
    ellipses = queryAllByText('...')
    expect(ellipses).toHaveLength(2)
  })

  it('page jump', () => {
    const props = {
      data: { a: [1, 2, 3, 4, 5], b: ['_a1', '_b2', '_c3', '_d4', '_e5'] },
      columns: [{ Header: 'a', accessor: 'a' }, { Header: 'b', accessor: 'b' }],
      defaultPageSize: 2,
      paginationType: 'jump'
    }
    const { container } = render(<Reactable {...props} />)
    const pageJump = getPageJump(container)
    const pageNumbers = getPageNumbers(container)
    expect(pageJump).toHaveAttribute('value', '1')
    expect(pageNumbers).toHaveTextContent('of 3')

    const pageInfo = getPageInfo(container)
    fireEvent.change(pageJump, { target: { value: 2 } })
    // Shouldn't change page yet
    expect(pageInfo).toHaveTextContent('1-2 of 5 rows')
    // Should change page on unfocus
    fireEvent.blur(pageJump)
    expect(pageInfo).toHaveTextContent('3-4 of 5 rows')
    fireEvent.change(pageJump, { target: { value: 1 } })
    // Should change page on enter keypress
    fireEvent.keyPress(pageJump, { key: 'Enter', code: 13, charCode: 13 })
    expect(pageInfo).toHaveTextContent('1-2 of 5 rows')

    // Should update on external page changes
    const nextButton = getNextButton(container)
    fireEvent.click(nextButton)
    expect(pageJump).toHaveAttribute('value', '2')

    // Values out of range should be reset to nearest valid value
    fireEvent.change(pageJump, { target: { value: '9' } })
    fireEvent.blur(pageJump)
    expect(pageJump).toHaveAttribute('value', '3')
    fireEvent.change(pageJump, { target: { value: '0' } })
    fireEvent.blur(pageJump)
    expect(pageJump).toHaveAttribute('value', '1')

    // Invalid and blank values should be reset to last value
    fireEvent.change(pageJump, { target: { value: '2' } })
    fireEvent.blur(pageJump)
    fireEvent.change(pageJump, { target: { value: '' } })
    fireEvent.blur(pageJump)
    expect(pageJump).toHaveAttribute('value', '2')
    fireEvent.change(pageJump, { target: { value: 'asdf' } })
    fireEvent.blur(pageJump)
    expect(pageJump).toHaveAttribute('value', '2')
  })
})
