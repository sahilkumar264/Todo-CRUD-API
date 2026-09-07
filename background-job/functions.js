import { inngest } from "./inngest.js";
import { reports, reportSummary } from "./store.js";

export const sayHello = inngest.createFunction(
  { id: "say-hello" },
  { event: "test/hello" },
  async ({ step }) => {
    await step.sleep("wait-five-seconds", "5s");
    return "Hello from the background!";
  }
);

export const makeReport = inngest.createFunction(
  { id: "make-report", retries: 2 },
  { event: "report/requested" },
  async ({ event, step }) => {
    const { id, topic } = event.data;
    try {
      await step.sleep("do-the-slow-work", "8s");
      const result = await step.run("build-report", () => {
        if (topic === "fail") throw new Error("The report oven is broken!");
        return `Your background report about ${topic} is ready.`;
      });
      const report = reports.get(id);
      if (report) reports.set(id, { ...report, status: "done", result, completed_at: new Date().toISOString() });
      return { id, result };
    } catch (error) {
      const report = reports.get(id);
      if (report) reports.set(id, { ...report, status: "failed", error: error.message, failed_at: new Date().toISOString() });
      throw error;
    }
  }
);

export const heartbeat = inngest.createFunction(
  { id: "heartbeat" },
  { cron: "* * * * *" },
  async () => {
    const summary = reportSummary();
    console.log(JSON.stringify({ event: "heartbeat", at: new Date().toISOString(), ...summary }));
    return summary;
  }
);

export const functions = [sayHello, makeReport, heartbeat];
