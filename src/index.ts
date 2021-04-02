import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import nodemailer from "nodemailer";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, __prod__ } from "./constants";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { MyContext } from "./types";

const main = async () => {
	await createConnection({
		type: 'postgres',
		database: 'redditclone',
		username: 'postgres',
		password: 'DivineHD1',
		logging: true,
		synchronize: !__prod__,
		entities: [Post, User]
	})

	const mailer = await createMailerClient();

	const app = express();

	const RedisStore = connectRedis(session);
	const redisClient = new Redis();
	app.use(
		cors({
			origin: "http://localhost:3000",
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
			resolvers: [PostResolver, UserResolver],
			validate: false,
		}),
		context: ({ req, res }): MyContext => ({ req, res, mailer, redisClient }),
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
