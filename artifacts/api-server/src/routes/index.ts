import { Router, type IRouter } from "express";
import healthRouter from "./health";
import messagesRouter from "./messages";
import agentsRouter from "./agents";
import macAgentRouter from "./mac-agent";
import devicesRouter from "./devices";
import logsRouter from "./logs";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(messagesRouter);
router.use(agentsRouter);
router.use(macAgentRouter);
router.use(devicesRouter);
router.use(logsRouter);
router.use(settingsRouter);
router.use(dashboardRouter);

export default router;
