import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import nodemailer from "nodemailer";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, FRONT_END_URL, __prod__ } from "./constants";
import { User } from "./entities/User";
import { UserResolver } from "./resolvers/user";
import { MyContext } from "./types";
import path from "path";
import { createUserLoader } from "./utils/UserLoader";
import { Anime } from "./entities/Anime";
import { AnimeResolver } from "./resolvers/anime";

const main = async () => {
	const conn = await createConnection({
		type: "postgres",
		database: "filmrecommenderdb",
		username: "postgres",
		password: "DivineHD1",
		logging: true,
		synchronize: !__prod__,
		migrations: [path.join(__dirname, "./migrations/*")],
		entities: [User, Anime],
	});
	conn.runMigrations();

	const mailer = await createMailerClient();

	const app = express();

	const RedisStore = connectRedis(session);
	const redisClient = new Redis();
	app.use(
		cors({
			origin: FRONT_END_URL,
			credentials: true,
		})
	);
	app.use(
		session({
			name: COOKIE_NAME,
			store: new RedisStore({
				client: redisClient,
				disableTouch: true,
			}),
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
				httpOnly: true,
				sameSite: "lax",
				secure: __prod__, // cookie only works in https
			},
			secret: "fywsofgfoysydhljafwroiqrgladsqwerhfkjamn",
			saveUninitialized: true,
			resave: false,
		})
	);

	const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [UserResolver, AnimeResolver],
			validate: false,
		}),
		context: ({ req, res }): MyContext => ({
			req,
			res,
			mailer,
			redisClient,
			userLoader: createUserLoader(),
		}),
	});

	apolloServer.applyMiddleware({ app, cors: false });

	app.listen(5000, () => {
		console.log("server started on localhost:5000");
	});
};

main().catch((err) => console.log(err));
async function createMailerClient() {
	const testAccount = await nodemailer.createTestAccount();
	const transporter = nodemailer.createTransport({
		host: "smtp.ethereal.email",
		port: 587,
		secure: false,
		auth: {
			user: testAccount.user,
			pass: testAccount.pass,
		},
	});
	return transporter;
}
