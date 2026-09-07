export const reports = new Map();

export function reportSummary() {
  const values = [...reports.values()];
  return {
    pending: values.filter((report) => report.status === "pending").length,
    done: values.filter((report) => report.status === "done").length,
    failed: values.filter((report) => report.status === "failed").length
  };
}
