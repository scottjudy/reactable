# reactable

[![CRAN Status](https://www.r-pkg.org/badges/version/reactable)](https://cran.r-project.org/package=reactable)
[![Build Status](https://travis-ci.com/glin/reactable.svg?branch=master)](https://travis-ci.com/glin/reactable)
[![codecov](https://codecov.io/gh/glin/reactable/branch/master/graph/badge.svg)](https://codecov.io/gh/glin/reactable)
[![lifecycle](https://img.shields.io/badge/lifecycle-experimental-orange.svg)](https://www.tidyverse.org/lifecycle/#experimental)

Interactive data tables for R, based on the
[React Table](https://github.com/tannerlinsley/react-table) library and made with
[reactR](https://github.com/react-R/reactR).

## Features
- Sorting, filtering, pagination
- Grouping and aggregation
- Built-in column formatting
- Custom rendering via R or JavaScript — use Shiny HTML tags and HTML widgets in tables
- Expandable rows and nested tables
- Conditional styling
- Works seamlessly within R Markdown documents and Shiny apps

## Demos
- [Twitter Followers](https://glin.github.io/reactable/articles/twitter-followers/twitter-followers.html)
- [Women's World Cup Predictions](https://glin.github.io/reactable/articles/womens-world-cup/womens-world-cup.html)
- [NBA Box Score](https://glin.github.io/reactable/articles/nba-box-score/nba-box-score.html)
- [CRAN Packages](https://glin.github.io/reactable/articles/cran-packages/cran-packages.html)
- [Demo Cookbook](https://glin.github.io/reactable/articles/cookbook/cookbook.html)
- [100k Rows](https://glin.github.io/reactable/articles/100k-rows.html)
- [Shiny Demo](https://glin.github.io/reactable/articles/shiny-demo.html)

## Installation
You can install reactable from CRAN with:
```r
install.packages("reactable")
```

Or install the development version from GitHub with:
```r
# install.packages("devtools")
devtools::install_github("glin/reactable")
```

## Usage
To create a table, use `reactable()` on a data frame or matrix:
```r
library(reactable)

reactable(iris)
```

<!-- pkgdown:example -->
[![reactable example using the iris dataset](man/figures/iris.png)](https://glin.github.io/reactable/articles/examples.html)

You can embed tables in **R Markdown** documents:
````
```{r}
library(reactable)

reactable(iris)
```
````

Or use them in **Shiny** applications:
```r
library(shiny)
library(reactable)

ui <- fluidPage(
  reactableOutput("table")
)

server <- function(input, output) {
  output$table <- renderReactable({
    reactable(iris)
  })
}

shinyApp(ui, server)
```

To learn more about using reactable, check out the examples below.

## Examples
- [Basic Usage](https://glin.github.io/reactable/articles/examples.html#basic-usage)
- [Sorting](https://glin.github.io/reactable/articles/examples.html#sorting)
- [Filtering](https://glin.github.io/reactable/articles/examples.html#filtering)
- [Searching](https://glin.github.io/reactable/articles/examples.html#searching)
- [Pagination](https://glin.github.io/reactable/articles/examples.html#pagination)
- [Grouping and Aggregation](https://glin.github.io/reactable/articles/examples.html#grouping-and-aggregation)
- [Column Formatting](https://glin.github.io/reactable/articles/examples.html#column-formatting)
- [Custom Rendering](https://glin.github.io/reactable/articles/examples.html#custom-rendering)
- [Embedding HTML Widgets](https://glin.github.io/reactable/articles/examples.html#embedding-html-widgets)
- [Footers and Total Rows](https://glin.github.io/reactable/articles/examples.html#footers)
- [Expandable Rows and Nested Tables](https://glin.github.io/reactable/articles/examples.html#expandable-row-details)
- [Conditional Styling](https://glin.github.io/reactable/articles/examples.html#conditional-styling)
- [Table Styling](https://glin.github.io/reactable/articles/examples.html#table-styling)
- [Column Groups](https://glin.github.io/reactable/articles/examples.html#column-groups)
- [Column Resizing](https://glin.github.io/reactable/articles/examples.html#column-resizing)
- [Row Names](https://glin.github.io/reactable/articles/examples.html#row-names)
- [Cell Click Actions](https://glin.github.io/reactable/articles/examples.html#cell-click-actions)
- [Language Options](https://glin.github.io/reactable/articles/examples.html#language-options)
- [Shiny](https://glin.github.io/reactable/articles/examples.html#shiny)

## Browser Support
| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="IE / Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>IE / Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Firefox | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Chrome | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Safari | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/opera/opera_48x48.png" alt="Opera" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br>Opera |
| --------- | --------- | --------- | --------- | --------- |
| IE11, Edge | last 2 versions | last 2 versions | last 2 versions | last 2 versions |

## License
MIT
