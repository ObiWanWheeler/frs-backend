import { MyContext } from "src/types";
import { Arg, Ctx, FieldResolver, Float, Int, Mutation, Resolver, Root, UseMiddleware } from "type-graphql";
import { Entity, getConnection } from "typeorm";
import { Rating } from "../entities/Ratings";
import { isAuth } from "../middleware/isAuth";
import { BoolWithMessageResponse } from "../typeorm-types/object-types/BoolWithMessageResponse";

@Entity()
@Resolver(Rating)
export class RatingResolver {
	@FieldResolver()
	async anime(@Root() root: Rating) {
		const response = (await getConnection().query(`SELECT * FROM anime WHERE "animeId" = ${root.animeId}`))
	
		return response[0]
	}

	@Mutation(() => BoolWithMessageResponse)
	@UseMiddleware(isAuth)
	async rate(
		@Arg("animeId", () => Int) animeId: number,
		@Arg("value", () => Float) value: number,
		@Ctx() { req }: MyContext
	): Promise<BoolWithMessageResponse> {
		const userId = req.session.userId;
		if (!userId) {
			return {
				success: false,
				message: "No user currently logged in, log in to rate.",
			};
		}

		const anime = await getConnection().query(
			`SELECT * FROM anime WHERE "animeId" = ${animeId};`
		)
		
		if (anime.length==0) {
			return {
				success: false,
				message: `No anime with id: ${animeId} exists.`
			}
		}

		const rating = await getConnection().query(
			`SELECT * FROM rating WHERE "animeId" = ${animeId} AND "userId" = ${userId} LIMIT 1;`
		);

		// user hasn't rated yet
		if (rating.length==0) {
			await getConnection().transaction(async (tm) => {
				tm.query(
					`
					INSERT INTO rating ("userId", "animeId", rating)
					values(${userId}, ${animeId}, ${value});
					`
				);
			});

			return {
				success: true,
				message: "user's rating on this post logged",
			};
		}
		// change existing rating value
		else {
			await getConnection().transaction(async (tm) => {
				tm.query(
					`
					UPDATE rating
					SET rating = ${value}
					WHERE "animeId" = ${animeId} and "userId" = ${userId};
					`
				);
			});

			return {
				success: true,
				message: "rating value changed",
			};
		}
	}
}
