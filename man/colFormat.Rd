% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/columns.R
\name{colFormat}
\alias{colFormat}
\title{Column formatting options}
\usage{
colFormat(
  prefix = NULL,
  suffix = NULL,
  digits = NULL,
  separators = FALSE,
  percent = FALSE,
  currency = NULL,
  datetime = FALSE,
  date = FALSE,
  time = FALSE,
  hour12 = NULL,
  locales = NULL
)
}
\arguments{
\item{prefix}{Prefix string.}

\item{suffix}{Suffix string.}

\item{digits}{Number of decimal digits to use for numbers.}

\item{separators}{Whether to use grouping separators for numbers, such as
thousands separators or thousand/lakh/crore separators. The format is
locale-dependent.}

\item{percent}{Format number as a percentage? The format is locale-dependent.}

\item{currency}{Currency format. An ISO 4217 currency code such as \code{"USD"}
for the US dollar, \code{"EUR"} for the euro, or \code{"CNY"} for the Chinese RMB.
The format is locale-dependent.}

\item{datetime}{Format as a locale-dependent date-time?}

\item{date}{Format as a locale-dependent date?}

\item{time}{Format as a locale-dependent time?}

\item{hour12}{Whether to use 12-hour time (\code{TRUE}) or 24-hour time (\code{FALSE}).
The default time convention is locale-dependent.}

\item{locales}{Locales to use for number, date, time, and currency formatting.
A character vector of BCP 47 language tags, such as \code{"en-US"} for English
(United States), \code{"hi"} for Hindi, or \code{"sv-SE"} for Swedish (Sweden).
Defaults to the locale of the user's browser.

Multiple locales may be specified to provide a fallback language in case
a locale is unsupported. When multiple locales are specified, the first
supported locale will be used.

See a list of \href{https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/6c085406-a698-4e12-9d4d-c3b0ee3dbc4a}{common BCP 47 language tags}
for reference.}
}
\value{
A column format object that can be used to customize data formatting
in \code{colDef()}.
}
\description{
Use \code{colFormat()} to add data formatting to a column.
}
\examples{
data <- data.frame(
  price_USD = c(123456.56, 132, 5650.12),
  price_INR = c(350, 23208.552, 1773156.4),
  number_FR = c(123456.56, 132, 5650.12),
  temp = c(22, NA, 31),
  percent = c(0.9525556, 0.5, 0.112),
  date = as.Date(c("2019-01-02", "2019-03-15", "2019-09-22"))
)

reactable(data, columns = list(
  price_USD = colDef(format = colFormat(prefix = "$", separators = TRUE, digits = 2)),
  price_INR = colDef(format = colFormat(currency = "INR", separators = TRUE, locales = "hi-IN")),
  number_FR = colDef(format = colFormat(locales = "fr-FR")),
  temp = colDef(format = colFormat(suffix = " \u00b0C")),
  percent = colDef(format = colFormat(percent = TRUE, digits = 1)),
  date = colDef(format = colFormat(date = TRUE, locales = "en-GB"))
))

# Date formatting
datetimes <- as.POSIXct(c("2019-01-02 3:22:15", "2019-03-15 09:15:55", "2019-09-22 14:20:00"))
data <- data.frame(
  datetime = datetimes,
  date = datetimes,
  time = datetimes,
  time_24h = datetimes,
  datetime_pt_BR = datetimes
)

reactable(data, columns = list(
  datetime = colDef(format = colFormat(datetime = TRUE)),
  date = colDef(format = colFormat(date = TRUE)),
  time = colDef(format = colFormat(time = TRUE)),
  time_24h = colDef(format = colFormat(time = TRUE, hour12 = FALSE)),
  datetime_pt_BR = colDef(format = colFormat(datetime = TRUE, locales = "pt-BR"))
))

# Currency formatting
data <- data.frame(
  USD = c(12.12, 2141.213, 0.42, 1.55, 34414),
  EUR = c(10.68, 1884.27, 0.37, 1.36, 30284.32),
  INR = c(861.07, 152122.48, 29.84, 110, 2444942.63),
  JPY = c(1280, 226144, 44.36, 164, 3634634.61),
  MAD = c(115.78, 20453.94, 4.01, 15, 328739.73)
)

reactable(data, columns = list(
  USD = colDef(
    format = colFormat(currency = "USD", separators = TRUE, locales = "en-US")
  ),
  EUR = colDef(
    format = colFormat(currency = "EUR", separators = TRUE, locales = "de-DE")
  ),
  INR = colDef(
    format = colFormat(currency = "INR", separators = TRUE, locales = "hi-IN")
  ),
  JPY = colDef(
    format = colFormat(currency = "JPY", separators = TRUE, locales = "ja-JP")
  ),
  MAD = colDef(
    format = colFormat(currency = "MAD", separators = TRUE, locales = "ar-MA")
  )
))

# Formatting aggregated cells
data <- data.frame(
  States = state.name,
  Region = state.region,
  Area = state.area
)

reactable(
  data,
  groupBy = "Region",
  columns = list(
    States = colDef(
      aggregate = "count",
      format = list(
        aggregated = colFormat(suffix = " states")
      )
    ),
    Area = colDef(
      aggregate = "sum",
      format = colFormat(suffix = " mi\u00b2", separators = TRUE)
    )
  )
)

}
\seealso{
Custom cell rendering in \code{\link[=colDef]{colDef()}} to customize data formatting
beyond what the built-in formatters provide.
}
