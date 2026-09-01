/**
 * JSON-LD injection without the `</script>` escape hatch.
 *
 * JSON.stringify passes `<` through verbatim, so any title or description
 * containing `</script>` (typed by the admin today, by anyone tomorrow)
 * terminates the ld+json tag early and injects markup into the page. Escaping
 * `<` as `\u003c` is the standard one-line fix; the JSON payload is unchanged
 * for any parser, and the sequence can no longer close a script element.
 */
export function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
