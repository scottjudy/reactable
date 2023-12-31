mockSession <- function(namespace = NULL) {
  e <- new.env()
  e$input <- list()
  e$msgs <- list()
  e$sendCustomMessage <- function(type, message) {
    msg <- list(type = type, message = message)
    e$msgs[[length(e$msgs) + 1]] <- msg
    e$lastMsg <- msg
    msg
  }
  e$ns <- function(id) {
    shiny::NS(namespace, id)
  }
  e
}

test_that("updateReactable", {
  session <- mockSession()
  expect_error(updateReactable(123, session = session),
               "`outputId` must be a character string")
  expect_error(updateReactable("id", data = list(), session = session),
               "`data` must be a data frame or matrix")
  expect_error(updateReactable("id", selected = TRUE, session = session),
               "`selected` must be numeric")
  expect_error(updateReactable("id", expanded = 123, session = session),
               "`expanded` must be TRUE or FALSE")
  expect_error(updateReactable("id", page = TRUE, session = session),
               "`page` must be a single, positive integer")
  expect_error(updateReactable("id", page = c(1, 3), session = session),
               "`page` must be a single, positive integer")
  expect_error(updateReactable("id", page = 0, session = session),
               "`page` must be a single, positive integer")

  expect_null(updateReactable("id"))
  updateReactable("id", session = session)
  expect_null(session$lastMsg)

  # Update data
  updateReactable("mytbl", data = data.frame(x = 1), session = session)
  expected <- list(
    data = data.frame(x = 1),
    dataKey = digest::digest(data.frame(x = 1)),
    selected = list(),
    expanded = FALSE,
    page = 0
  )
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = expected))
  # Override state resets
  updateReactable("mytbl", data = matrix(4), selected = 3, expanded = TRUE,
                  page = 2, session = session)
  expected <- list(
    data = matrix(4),
    dataKey = digest::digest(matrix(4)),
    selected = list(2),
    expanded = TRUE,
    page = 1
  )
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = expected))

  # Update selected rows
  updateReactable("mytbl", selected = 1, session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(selected = list(0))))
  updateReactable("mytbl", selected = c(1, 3, 5), session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(selected = list(0, 2, 4))))
  updateReactable("mytbl", selected = integer(0), session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(selected = list())))
  updateReactable("mytbl", selected = NA, session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(selected = list())))
  updateReactable("mytbl", selected = NA_real_, session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(selected = list())))
  updateReactable("mytbl", selected = c(3, 5, NA), session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(selected = list(2, 4))))

  # Update expanded rows
  updateReactable("mytbl", expanded = TRUE, session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(expanded = TRUE)))
  updateReactable("mytbl", expanded = FALSE, session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(expanded = FALSE)))

  updateReactable("mytbl", selected = c(1, 3), expanded = FALSE, session = session)
  expect_equal(session$lastMsg, list(
    type = "__reactable__mytbl",
    message = list(selected = list(0, 2), expanded = FALSE)
  ))

  # Update current page
  updateReactable("mytbl", page = 2, session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mytbl", message = list(page = 1)))

  # Update meta
  expect_error(updateReactable("mytbl", meta = TRUE, session = session),
               "`meta` must be a named list or NA")

  updateReactable("mytbl", meta = list(custom = 123, fn = JS("n => n > 30")), session = session)
  expect_equal(session$lastMsg, list(
    type = "__reactable__mytbl",
    message = list(
      meta = list(custom = 123, fn = JS("n => n > 30")),
      jsEvals = I("meta.fn") # Should be wrapped in I() so length-1 arrays serialize as arrays
    )
  ))
  updateReactable("mytbl", meta = NA, session = session)
  expect_equal(session$lastMsg, list(
    type = "__reactable__mytbl",
    message = list(meta = NA)
  ))
  updateReactable("mytbl", meta = list(), page = 1, session = session)
  expect_equal(session$lastMsg, list(
    type = "__reactable__mytbl",
    message = list(page = 0)
  ))

  # JS evals should not include data
  updateReactable("mytbl", data = data.frame(x = I(list(fn = JS("() => {}")))), session = session)
  expect_equal(session$lastMsg$message$jsEvals, NULL)

  # Should work with Shiny modules
  session <- mockSession(namespace = "mod")
  updateReactable("mytbl", selected = 2, session = session)
  expect_equal(session$lastMsg, list(type = "__reactable__mod-mytbl", message = list(selected = list(1))))
})

test_that("getReactableState", {
  session <- mockSession()
  expect_error(getReactableState(123, session = session), "`outputId` must be a character string")
  expect_error(getReactableState("id", "x", session = session), '`name` values must be one of "page", "pageSize", "pages", "sorted", "selected"')

  expect_null(getReactableState("id"))
  updateReactable("id", session = session)

  expect_equal(getReactableState("mytbl", session = session), NULL)

  session$input[["mytbl__reactable__page"]] <- 3
  expect_equal(getReactableState("mytbl", "page", session = session), 3)

  session$input[["mytbl__reactable__pageSize"]] <- 2
  expect_equal(getReactableState("mytbl", "pageSize", session = session), 2)

  session$input[["mytbl__reactable__pages"]] <- 10
  expect_equal(getReactableState("mytbl", "pages", session = session), 10)

  session$input[["mytbl__reactable__sorted"]] <- list(a = "asc", b = "desc")
  expect_equal(getReactableState("mytbl", "sorted", session = session), list(a = "asc", b = "desc"))

  session$input[["mytbl__reactable__selected"]] <- c(1, 5, 7)
  expect_equal(getReactableState("mytbl", "selected", session = session), c(1, 5, 7))

  # Multiple values
  expect_equal(getReactableState("mytbl", c("page", "pageSize"), session = session), list(page = 3, pageSize = 2))

  # All values
  expect_equal(getReactableState("mytbl", session = session), list(
    page = 3,
    pageSize = 2,
    pages = 10,
    sorted = list(a = "asc", b = "desc"),
    selected = c(1, 5, 7)
  ))
})

test_that("resolvedData", {
  expect_error(resolvedData(123), "`data` must be a data frame")
  expect_error(resolvedData(data.frame(x = 1)), "`rowCount` must be provided and numeric")
  expect_error(resolvedData(data.frame(x = 1), rowCount = "4"), "`rowCount` must be provided and numeric")
  expect_error(resolvedData(data.frame(x = 1), rowCount = 4, maxRowCount = "x"), "`maxRowCount` must be numeric")
  result <- resolvedData(data.frame(x = 1), rowCount = 4, maxRowCount = 20)
  expect_equal(result$data, data.frame(x = 1))
  expect_equal(result$rowCount, 4)
  expect_equal(result$maxRowCount, 20)
})

test_that("reactableFilterFunc", {
  backend <- structure(list(), class = "test_backend")
  reactableServerData.test_backend <- function(pageIndex = NULL, pageSize = NULL, groupBy = NULL, ...) {
    resolvedData(data.frame(idx = pageIndex, size = pageSize, grp = groupBy), rowCount = 5)
  }
  registerS3method("reactableServerData", "test_backend", reactableServerData.test_backend)

  data <- list(
    backend = backend,
    pageIndex = -1,
    groupBy = list("a")
  )

  body <- '{"pageIndex":0,"pageSize":10}'
  req <- list(rook.input = list(read = function() {
    charToRaw(body)
  }))

  resp <- reactableFilterFunc(data, req)
  expected <- shiny::httpResponse(
    status = 200L,
    content_type = "application/json",
    content = toJSON(resolvedData(data.frame(idx = 0, size = 10, grp = list("a")), rowCount = 5))
  )
  expect_equal(resp, expected)

  reactableServerData.test_backend <- function(...) "not resolvedData"
  registerS3method("reactableServerData", "test_backend", reactableServerData.test_backend)
  expect_error(reactableFilterFunc(data, req), "reactable server backends must return a `resolvedData\\(\\)` object from `reactableServerData\\(\\)`")
})

test_that("parseParams", {
  # Empty arrays should be empty lists, empty objects should be empty named lists,
  # arrays of primitives should be lists
  json <- '{"filters":[],"sortBy":[],"expanded":{},"selectedRowIds":{},"pageIndex":0,"pageSize":10,"groupBy":["a"]}'
  expected <- list(
    filters = list(),
    sortBy = list(),
    expanded = namedList(),
    selectedRowIds = namedList(),
    pageIndex = 0,
    pageSize = 10,
    groupBy = list("a")
  )
  expect_equal(parseParams(json), expected)
  # Ensure that the deserialized results can be serialized back to the original JSON
  expect_equal(as.character(toJSON(expected)), json)

  # Multi-value arrays
  expect_equal(
    parseParams('{"filters":[],"groupBy":["a", "b"]}'),
    list(filters = list(), groupBy = list("a", "b"))
  )

  # Arrays of objects should be lists, not data frames
  json <- '{"sortBy":[{"id":"a"},{"id":"b","desc":true}]}'
  expected <- list(sortBy = list(list(id = "a"), list(id = "b", desc = TRUE)))
  expect_equal(parseParams(json), expected)
  expect_equal(as.character(toJSON(expected)), json)
})

test_that("getServerBackend", {
  expect_equal(getServerBackend("v8"), serverV8())
  expect_equal(getServerBackend(), serverV8())
  customBackend <- list(data = function() {})
  expect_equal(getServerBackend(customBackend), customBackend)
  expect_equal(getServerBackend("doesNotExist"), serverV8())
})
