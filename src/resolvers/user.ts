import argon2 from "argon2";
import { MyContext } from "src/types";
import {
	Arg,
	Ctx,
	FieldResolver,
	Int,
	Mutation,
	Query,
	Resolver,
	Root,
} from "type-graphql";
import {
	COOKIE_NAME,
	RECOMMENDER_API_BASE_URL,
} from "../constants";

// @ts-ignore
import fetch from "node-fetch";
import { Rating } from "../entities/Ratings";
import { getConnection } from "typeorm";
import { typeAnimeResponse } from "../utils/typeRecommendationResponse";
import { User } from "../entities/User";
import { RegisterInput } from "../typeorm-types/input-types/RegisterInput";
import { UsernamePasswordInput } from "../typeorm-types/input-types/UsernamePasswordInput";
import { BoolWithMessageResponse } from "../typeorm-types/object-types/BoolWithMessageResponse";
import { RecommendationFetchResponse } from "../typeorm-types/object-types/RecommendationFetchResponse";
import { UserResponse } from "../typeorm-types/object-types/UserResponse";
import { validateRegister } from "../utils/validateRegister";

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
		const currentUserId = req.session.userId;
		if (!currentUserId) {
			return {
				errors: [{ message: "no userID found in session" }],
			};
		}

		const currentUser = await getConnection().query(
			`SELECT * FROM "user" WHERE "userId" = ${currentUserId}`
		);

		return currentUser
			? { user: currentUser[0] }
			: { errors: [{ message: "error fetching current user" }] };
	}

	@Query(() => RecommendationFetchResponse)
	async recommend(
		@Arg("verbose", { nullable: true }) verbose: boolean,
		@Arg("recommendationCount", () => Int, { nullable: true }) recommendationCount: number,
		@Ctx() { req }: MyContext
	): Promise<RecommendationFetchResponse> {
		const userId = req.session.userId;

		if (!userId) {
			return { errors: ["no user logged in."], animes: [] };
		}

		let endpoint = `${RECOMMENDER_API_BASE_URL}hybrid-recommender/${userId}?`;

		if (verbose) {
			endpoint += `verbose=${verbose}`;
		}

		if (recommendationCount) {
			endpoint += `&recommendationCount=${recommendationCount}`;
		}
		console.log("Fetching Data... from " + endpoint)
		const recommendationsResp = await fetch(endpoint);
		console.log("Data Fetched")
		console.log(recommendationsResp)
		const recommendationsJson = await recommendationsResp.json();
		if (recommendationsJson.error) {
			return {errors: [recommendationsJson.error], animes: []}
		}
		const typedRecommendations = typeAnimeResponse(recommendationsJson.recommendations);
		return {errors: [], animes: typedRecommendations};
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
				errors: [{ message: "error logging in" }],
			};
		}
		const passwordIsValid = await argon2.verify(
			requestedUser.password,
			options.password
		);
		if (!passwordIsValid) {
			return {
				errors: [{ message: "error logging in" }],
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
}

