import argon2 from "argon2";
import nodemailer from "nodemailer";
import { Anime } from "../entities/Anime";
import { MyContext } from "src/types";
import {
	Arg,
	Ctx,
	FieldResolver,
	Mutation,
	Query,
	Resolver,
	Root,
} from "type-graphql";
import { v4 } from "uuid";
import {
	COOKIE_NAME,
	FORGOT_PASSWORD_PREFIX,
	FRONT_END_URL,
	RECOMMENDER_API_BASE_URL,
} from "../constants";
import { User } from "../entities/User";
import {
	RegisterInput,
	UsernamePasswordInput,
} from "../typeorm-types/input-types";
import {
	BoolWithMessageResponse,
	ChangePasswordResponse,
	UserResponse,
} from "../typeorm-types/object-types";
import { validateRegister } from "../utils/validateRegister";
import fetch from "node-fetch";
import { plainToClass } from "class-transformer";
import { Rating } from "../entities/Ratings";
import { getConnection } from "typeorm";

@Resolver(User)
export class UserResolver {
	@FieldResolver(() => String)
	email(@Root() root: User, @Ctx() { req }: MyContext) {
		if (req.session!.userId === root.userId) {
			return root.email;
		} else {
			return "";
		}
	}

	@FieldResolver(() => [Rating])
	ratings(@Root() root: User) {
		return getConnection().query(
			`SELECT * FROM rating WHERE "userId" = ${root.userId}`
		);
	}

	@Query(() => UserResponse)
	async me(@Ctx() { req }: MyContext): Promise<UserResponse> {
		const userId = req.session.userId;

		if (!userId) {
			return {
				errors: [{ message: "no userID found in session" }],
			};
		}

		const user = await getConnection().query(
			`SELECT * FROM "user" WHERE "userId" = ${userId}`
		);

		return user
			? { user: user[0] }
			: { errors: [{ message: "error fetching user" }] };
	}

	@Query(() => [Anime])
	async recommend(
		@Arg("verbose", { nullable: true }) verbose: boolean,
		@Arg("topn", { nullable: true }) topn: number,
		@Ctx() { req }: MyContext
	): Promise<Anime[]> {
		const userId = req.session.userId;

		if (!userId) {
			return [];
		}

		let endpoint = `${RECOMMENDER_API_BASE_URL}hybrid-recommender/${userId}?`;

		if (verbose) {
			endpoint += `verbose=${verbose}`;
		}

		if (topn) {
			endpoint += `&topn=${topn}`;
		}

		console.log(endpoint);

		const recommendationsResp = await fetch(endpoint);

		const recommendationsJson = await recommendationsResp.json();
		console.log(recommendationsJson);

		const typedRecommendations: Anime[] = [];
		recommendationsJson.recommendations.forEach((anime: any) =>
			typedRecommendations.push(
				plainToClass(Anime, { animeId: anime.anime_id, ...anime })
			)
		);
		console.log(typedRecommendations);
		return typedRecommendations;
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("options") options: RegisterInput,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		if (
			(
				await getConnection().query(
					`SELECT * FROM "user" WHERE email = '${options.email}'`
				)
			)[0]
		) {
			// user already registered
			return {
				errors: [
					{
						field: "email",
						message:
							"user with this email already exists! Please try a different email.",
					},
				],
			};
		}

		if (
			(
				await getConnection().query(
					`SELECT * FROM "user" WHERE username = '${options.username}'`
				)
			)[0]
		) {
			return {
				errors: [
					{
						field: "username",
						message:
							"user with this name already exists! Please choose a different username.",
					},
				],
			};
		}

		const invalidFields = validateRegister(options);
		if (invalidFields.length != 0) {
			return {
				errors: invalidFields,
			};
		}

		try {
			const hashedPassword = await argon2.hash(options.password);
			const nextId =
				(
					await getConnection().query(
						`SELECT MAX("userId") FROM "user"`
					)
				)[0].max + 1;

			const user = (
				await getConnection().query(
					`INSERT INTO "user" ("userId", username, email, password) VALUES (${nextId},'${options.username}', '${options.email}', '${hashedPassword}') RETURNING *`
				)
			)[0] as User;

			req.session.userId = user.userId; //set cookie

			return {
				user,
			};
		} catch (err) {
			// for anything previous check missed
			if (err.code === "23505" || err.detail.includes("already exists")) {
				return {
					errors: [
						{
							field: "username",
							message:
								"user with this username or email already exists",
						},
					],
				};
			}
			return {
				errors: [{ field: "username", message: "unable to register" }],
			};
		}
	}

	@Mutation(() => UserResponse)
	async login(
		@Arg("options") options: UsernamePasswordInput,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		const requestedUser = (await getConnection().query(`SELECT * FROM "user" WHERE 
		${
			options.username.includes("@")
				? `email = '${options.username}'`
				: `username = '${options.username}'`
		}`))[0] as User;


		if (!requestedUser?.userId) {
			return {
				errors: [{ field: "username", message: "error logging in" }],
			};
		}
		const passwordIsValid = await argon2.verify(
			requestedUser.password,
			options.password
		);
		if (!passwordIsValid) {
			return {
				errors: [{ field: "username", message: "error logging in" }],
			};
		}
		req.session.userId = requestedUser.userId; // set cookie

		return {
			user: requestedUser,
		};
	}

	@Mutation(() => BoolWithMessageResponse)
	logout(@Ctx() { req, res }: MyContext): Promise<BoolWithMessageResponse> {
		return new Promise<BoolWithMessageResponse>((resolve) =>
			req.session.destroy((err: any) => {
				if (err) {
					console.log(err);
					resolve({ success: false, message: "unable to logout" });
				} else {
					res.clearCookie(COOKIE_NAME);
					resolve({
						success: true,
						message: "successfully logged out",
					});
				}
			})
		);
	}

	@Mutation(() => BoolWithMessageResponse)
	async forgotPassword(
		@Arg("email") email: string,
		@Ctx() { mailer, redisClient }: MyContext
	): Promise<BoolWithMessageResponse> {
		const user = (await getConnection().query(`SELECT * FROM "user" WHERE email = '${email}'`))[0];
		if (!user) {
			return {
				success: true,
				message:
					"if a user with this email exists, a password reset email has been sent to their inbox",
			};
		}

		const token = v4();
		await redisClient.set(
			FORGOT_PASSWORD_PREFIX + token,
			user.userId,
			"ex",
			1000 * 60 * 60
		); // expires after 1 hour

		let mailInfo: any;
		try {
			mailInfo = await mailer.sendMail({
				from: '"Dev-Chan" <Devchan@cool.com>',
				to: user.email,
				subject: "Password Reset",
				html: `<a href='${FRONT_END_URL}/change_password/${token}'>click here to reset your password</a>`,
			});
		} catch {
			return {
				success: false,
				message:
					"error sending password reset email, try again in a few minutes",
			};
		}

		console.log(
			"Message Preview: ",
			nodemailer.getTestMessageUrl(mailInfo)
		);

		return {
			success: true,
			message:
				"if a user with this email exists, a password reset email has been sent to their inbox",
		};
	}

	@Mutation(() => ChangePasswordResponse)
	async changePassword(
		@Arg("token") token: string,
		@Arg("newPassword") newPassword: string,
		@Ctx() { redisClient }: MyContext
	): Promise<ChangePasswordResponse> {
		if (newPassword.length < 8) {
			return {
				success: false,
				field: "password",
				message: "Password too weak",
			};
		}

		const userId = Number(
			await redisClient.get(FORGOT_PASSWORD_PREFIX + token)
		);

		if (!userId /*token has expired*/) {
			return {
				success: false,
				message:
					"This password reset token has expired!\n(Or maybe it just didn't exist in the first place)",
			};
		}

		redisClient.del(FORGOT_PASSWORD_PREFIX + token);

		const user = (await getConnection().query(`SELECT * FROM "user" WHERE "userId" = ${userId}`))[0];
		if (!user) {
			return {
				success: false,
				message: "This user no longer exists!",
			};
		}

		const hashedPassword = await argon2.hash(newPassword)
		await getConnection().query(`UPDATE "user" SET password = '${hashedPassword}' WHERE "userId" = ${userId}`)

		return {
			success: true,
			message: "Password changed",
		};
	}
}
