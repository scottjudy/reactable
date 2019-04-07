# reactable

[![Build Status](https://travis-ci.com/glin/reactable.svg?branch=master)](https://travis-ci.com/glin/reactable)
[![codecov](https://codecov.io/gh/glin/reactable/branch/master/graph/badge.svg)](https://codecov.io/gh/glin/reactable)

R interface to the [React Table](https://github.com/tannerlinsley/react-table) library,
made with [reactR](https://github.com/react-R/reactR).

## Installation

```r
# install.packages("devtools")
devtools::install_github("glin/reactable")
```

## Examples

### Filtering
https://glin.github.io/reactable/inst/examples/filtering.html

```r
reactable(iris, filterable = TRUE)
```

### Grouping
https://glin.github.io/reactable/inst/examples/grouping.html

```r
reactable(
  iris,
  groupBy = "Species",
  columns = list(
    Sepal.Width = colDef(aggregate = "mean"),
    Petal.Length = colDef(aggregate = "sum"),
    Petal.Width = colDef(aggregate = "count")
  )
)
```

### Sorting
https://glin.github.io/reactable/inst/examples/sorting.html

```r
reactable(
  iris, 
  defaultSortOrder = "desc",
  defaultSorted = list(Sepal.Length = "asc", Petal.Length = "desc"),
  columns = list(
    Species = colDef(defaultSortOrder = "asc")
  )
)
```

### Shiny
https://glin.shinyapps.io/reactable/

```r
library(shiny)
library(reactable)

ui <- fluidPage(
  titlePanel("reactable example"),
  reactableOutput("table")
)

server <- function(input, output, session) {
  output$table <- renderReactable({
    reactable(iris)
  })
}

shinyApp(ui, server)
```

## Usage
```r
reactable(
  data,                      # Data frame or matrix
  rownames = FALSE,          # Show row names?
  colnames = NULL,           # Named list of column names
  sortable = TRUE,           # Enable sorting?
  resizable = TRUE,          # Enable column resizing?
  filterable = FALSE,        # Enable column filtering?
  defaultSortOrder = "asc",  # Default sort order, either "asc" or "desc"
  defaultSorted = NULL,      # Named list of default sorted columns with "asc" or "desc" order
  defaultPageSize = 10,      # Default page size
  pageSizeOptions =          # Page size options
    c(10, 25, 50, 100), 
  minRows = 1,               # Minimum number of rows to show
  groupBy = NULL,            # Vector of column names to group by
  columns = NULL,            # Named list of column definitions
  striped = TRUE,            # Zebra-stripe rows?
  highlight = TRUE,          # Highlight rows on hover?
  class = NULL,              # Additional CSS classes to apply to the table
  style = NULL               # Named list of inline styles to apply to the table
)
```
