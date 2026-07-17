import { createApp } from "./app.js";
import { scheduleDailyRefresh } from "./jobs/refreshCache.js";
import { ensureDefaultThresholds } from "./services/thresholdService.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

await ensureDefaultThresholds();
scheduleDailyRefresh();

app.listen(port, () => {
  console.log(`EOL Tracker backend listening on http://localhost:${port}`);
});
