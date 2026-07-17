import { Router, type IRouter } from "express";
import healthRouter from "./health";
import messagesRouter from "./messages";
import contactsRouter from "./contacts";
import systemRouter from "./system";
import settingsRouter from "./settings";
import macAgentRouter from "./mac-agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(messagesRouter);
router.use(contactsRouter);
router.use(systemRouter);
router.use(settingsRouter);
router.use(macAgentRouter);

export default router;
