import { Response } from "express";
import { Session } from "express-session";
import { Redis } from "ioredis";

export type MyContext = {
	req: any & { session: Session };
	res: Response;
	redisClient: Redis
};
