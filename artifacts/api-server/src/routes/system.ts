import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);
const router = Router();

async function checkAppleScript(): Promise<boolean> {
  try {
    await execAsync("which osascript", { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function checkMessagesApp(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "System Events" to (name of processes) contains "Messages"'`,
      { timeout: 5000 },
    );
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

// GET /api/system/status
router.get("/system/status", async (req, res) => {
  const platform = os.platform();
  const isMac = platform === "darwin";

  const recommendations: string[] = [];

  if (!isMac) {
    recommendations.push(
      "This dashboard requires macOS to send iMessages. Run the API server on a Mac.",
    );
    res.json({
      platform,
      isMac,
      messagesAppAvailable: false,
      appleScriptAvailable: false,
      recommendations,
    });
    return;
  }

  const [appleScriptAvailable, messagesAppAvailable] = await Promise.all([
    checkAppleScript(),
    checkMessagesApp(),
  ]);

  if (!appleScriptAvailable) {
    recommendations.push(
      "osascript is not available. Ensure you are running on macOS with Xcode Command Line Tools installed.",
    );
  }

  if (!messagesAppAvailable) {
    recommendations.push(
      "Messages.app is not currently running. Open Messages.app on your Mac.",
    );
    recommendations.push(
      "Sign in to Messages with your Apple ID (Messages > Settings > iMessage).",
    );
    recommendations.push(
      "Enable text message forwarding on your iPhone: Settings > Messages > Text Message Forwarding, then enable your Mac.",
    );
  }

  if (isMac && appleScriptAvailable && messagesAppAvailable) {
    recommendations.push(
      "Everything looks good! You can now send messages from the Compose screen.",
    );
  }

  res.json({
    platform,
    isMac,
    messagesAppAvailable,
    appleScriptAvailable,
    recommendations,
  });
});

export default router;
