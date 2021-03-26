import { User } from "../entities/User";
import { MyContext } from "src/types";
import {
	Arg,
	Ctx,
	Field,
	InputType,
	Mutation,
	ObjectType,
	Query,
	Resolver,
} from "type-graphql";
import argon2 from "argon2";
import { COOKIE_NAME } from "../constants";
import nodemailer from "nodemailer";

@InputType()
class UsernamePasswordInput {
	@Field()
	username!: string;

	@Field()
	password!: string;
}

@InputType()
class RegisterInput extends UsernamePasswordInput {
	@Field()
	email!: string;
}

@ObjectType()
class FieldError {
	@Field(() => String, { nullable: true })
	field?: "username" | "password" | "email";
	@Field()
	message: string;
}

@ObjectType()
class UserResponse {
	@Field(() => [FieldError], { nullable: true })
	errors?: FieldError[];

	@Field(() => User, { nullable: true })
	user?: User;
}

@ObjectType()
class BoolWithMessageResponse {
	@Field(() => Boolean)
	success: boolean;

	@Field(() => String)
	message: string;
}

@Resolver()
export class UserResolver {
	@Query(() => UserResponse)
	async me(@Ctx() { em, req }: MyContext): Promise<UserResponse> {
		if (!req.session.userId) {
			return {
				errors: [{ message: "no user logged in" }],
			};
		}

		const user = await em.findOne(User, req.session.userId);
		return user
			? { user: user }
			: { errors: [{ message: "error fetching user" }] };
	}

	@Mutation(() => UserResponse)
	async register(
		@Arg("options") options: RegisterInput,
		@Ctx() { em, req }: MyContext
	): Promise<UserResponse> {
		if (!options.email) {
			return {
				errors: [{ field: "email", message: "invalid email" }],
			};
		}
		if (options.username.length <= 2) {
			return {
				errors: [{ field: "username", message: "username too short" }],
			};
		}
		if (options.password.length <= 3) {
			return {
				errors: [{ field: "password", message: "password too weak" }],
			};
		}

		try {
			const hashedPassword = await argon2.hash(options.password);
			const user = em.create(User, {
				username: options.username,
				email: options.email,
				password: hashedPassword,
			});

			await em.persistAndFlush(user);

			req.session.userId = user.id; //set cookie

			return {
				user: user,
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
		@Ctx() { em, req }: MyContext
	): Promise<UserResponse> {
		const requestedUser = await em.findOne(User, {
			username: options.username,
		});
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

		req.session.userId = requestedUser.id;

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
		@Ctx() { mailer, em }: MyContext
	): Promise<BoolWithMessageResponse> {
		const user = await em.findOne(User, { email: email });
		if (!user) {
			return {
				success: true,
				message:
					"if a user with this email exists, a password reset email has been sent to their inbox",
			};
		}

		let mailInfo: any;
		try {
			mailInfo = await mailer.sendMail({
				from:
					'"RedditClone" Team <redditclone.forgotpass@redditclone.com>',
				to: user.email,
				subject: "Password Reset",
				html:
					"<a href='google.com'>click here to reset your password</a>",
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
}
