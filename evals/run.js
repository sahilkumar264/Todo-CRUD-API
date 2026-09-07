const fs = require("node:fs/promises");
const path = require("node:path");

const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";

async function main() {
  const cases = JSON.parse(await fs.readFile(path.join(__dirname, "cases.json"), "utf8"));
  const results = [];
  for (const testCase of cases) {
    const response = await fetch(`${baseUrl}/triage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: testCase.input })
    });
    const body = await response.json();
    const passed = response.status === 200 && body.category === testCase.expected_category;
    results.push({ name: testCase.name, expected: testCase.expected_category, actual: body.category ?? body.error, passed });
  }
  const passed = results.filter((result) => result.passed).length;
  console.log(JSON.stringify({ passed, total: results.length, percent: (passed / results.length) * 100, failures: results.filter((result) => !result.passed) }, null, 2));
  process.exitCode = passed === results.length ? 0 : 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
