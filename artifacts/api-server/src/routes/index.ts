import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadflowRouter from "./leadflow";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadflowRouter);

export default router;
