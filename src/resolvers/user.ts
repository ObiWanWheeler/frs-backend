import { User } from "../entities/User";
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
import argon2 from "argon2";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX, FRONT_END_URL } from "../constants";
import nodemailer from "nodemailer";
import { validateRegister } from "../utils/validateRegister";
import { v4 } from "uuid";
import { RegisterInput, UsernamePasswordInput } from "../typeorm-types/input-types";
import { UserResponse, BoolWithMessageResponse, ChangePasswordResponse } from "../typeorm-types/object-types";

@Resolver(User)
export class UserResolver {
	@FieldResolver(() => String)
	email(@Root() root: User, @Ctx() {req}: MyContext) {
		if (req.session.userId === root.id) {
			return root.email
		}
		else {
			return "";
		}
	}

	@Query(() => UserResponse)
	async me(@Ctx() { req }: MyContext): Promise<UserResponse> {
		if (!req.session.userId) {
			return {
				errors: [{ message: "no userID found in session" }],
			};
		}

		const user = await User.findOne(req.session.userId);
		return user
			? { user: user }
			: { errors: [{ message: "error fetching user" }] };
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("options") options: RegisterInput,
		@Ctx() { req }: MyContext
	): Promise<UserResponse> {
		const invalidFields = validateRegister(options);
		if (invalidFields.length != 0) {
			return {
				errors: invalidFields,
			};
		}

		try {
			const hashedPassword = await argon2.hash(options.password);

			const user = await User.create({
				username: options.username,
				email: options.email,
				password: hashedPassword,
			}).save();

			req.session.userId = user.id; //set cookie

			return {
				user,
			};

		} catch (err) {
			// user already registered
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
		const requestedUser = await User.findOne(
			options.username.includes("@")
				? {
						where: {
							email: options.username,
						},
				  }
				: {
						where: {
							username: options.username,
						},
				  }
		);
		if (!requestedUser?.id) {
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
		req.session.userId = requestedUser.id; // set cookie

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
		const user = await User.findOne({ where: { email: email } });
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
			user.id,
			"ex",
			1000 * 60 * 60
		); // expires after 1 hour

		let mailInfo: any;
		try {
			mailInfo = await mailer.sendMail({
				from:
					'"RedditClone" Team <redditclone.forgotpass@redditclone.com>',
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

		const user = await User.findOne({ id: userId });
		if (!user) {
			return {
				success: false,
				message: "This user no longer exists!",
			};
		}

		// unexpectedly this actually produces fewer SQL statements overall than updating 'user' then flushing
		await User.update(
			{ id: userId },
			{ password: await argon2.hash(newPassword) }
		);

		return {
			success: true,
			message: "Password changed",
		};
	}
}
