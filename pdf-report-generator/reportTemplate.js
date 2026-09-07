function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function buildReportHtml(data) {
  const bookRows = data.books.map((book) => `<tr><td>${escapeHtml(book.title)}</td><td>£${book.price.toFixed(2)}</td><td>${book.rating} / 5</td></tr>`).join("");
  const topRows = data.mostExpensive.map((book, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(book.title)}</td><td>£${book.price.toFixed(2)}</td><td>${book.rating} / 5</td></tr>`).join("");
  const ratingRows = data.ratingBreakdown.map((item) => `<tr><td>${item.rating} stars</td><td>${item.count}</td></tr>`).join("");
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(data.generatedAt));

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 16mm 14mm 18mm; }
    * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #172033; font-size: 10px; line-height: 1.4; }
    header { border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; } h1 { margin: 0; color: #0f172a; font-size: 25px; } .subtitle { margin: 4px 0 0; color: #475569; font-size: 11px; }
    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px; } .card { background: #ecfeff; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px; } .card span { display: block; color: #0f766e; font-weight: bold; font-size: 9px; text-transform: uppercase; } .card strong { display: block; font-size: 24px; margin-top: 4px; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #0f172a; } table { width: 100%; border-collapse: collapse; margin-bottom: 12px; } thead { display: table-header-group; } tr { break-inside: avoid; } th { text-align: left; background: #0f766e; color: white; padding: 7px; font-size: 9px; } td { padding: 6px 7px; border-bottom: 1px solid #dbe4ed; vertical-align: top; } tbody tr:nth-child(even) { background: #f8fafc; } .footer { color: #64748b; font-size: 8px; text-align: center; border-top: 1px solid #dbe4ed; margin-top: 16px; padding-top: 8px; }
  </style></head><body>
    <header><h1>Bookstore catalogue report</h1><p class="subtitle">Generated ${date} from the Week 5 Books to Scrape dataset</p></header>
    <section class="cards"><div class="card"><span>Total books</span><strong>${data.totals.total_books}</strong></div><div class="card"><span>Average price</span><strong>£${data.totals.average_price.toFixed(2)}</strong></div></section>
    <h2>Five most expensive books</h2><table><thead><tr><th>#</th><th>Title</th><th>Price</th><th>Rating</th></tr></thead><tbody>${topRows}</tbody></table>
    <h2>Books by rating</h2><table><thead><tr><th>Rating</th><th>Books</th></tr></thead><tbody>${ratingRows}</tbody></table>
    <h2>Complete catalogue</h2><table><thead><tr><th>Title</th><th>Price</th><th>Rating</th></tr></thead><tbody>${bookRows}</tbody></table>
    <div class="footer">PDF report generator - store and link, never embed report bytes in JSON</div>
  </body></html>`;
}
