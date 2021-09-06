import { MyContext } from "src/types";
import { Arg, Ctx, Int, Mutation, Resolver, UseMiddleware } from "type-graphql";
import { Entity, getConnection } from "typeorm";
import { Rating } from "../entities/Ratings";
import { isAuth } from "../middleware/isAuth";
import { BoolWithMessageResponse } from "../typeorm-types/object-types";

@Entity()
@Resolver(Rating)
export class RatingResolver {
	@Mutation(() => BoolWithMessageResponse)
	@UseMiddleware(isAuth)
	async rate(
		@Arg("animeId", () => Int) animeId: number,
		@Arg("value", () => Int) value: number,
		@Ctx() { req }: MyContext
	): Promise<BoolWithMessageResponse> {
		const userId = req.session.userId;
		if (!userId) {
			return {
				success: false,
				message: "No user currently logged in, log in to rate."
			}
		}

		const rating = await Rating.findOne({
			where: { animeId, userId },
		});

		// user hasn't rated yet
		if (!rating) {
			await getConnection().transaction(async (tm) => {
				tm.query(
					`
					INSERT INTO rating (user_id, anime_id, rating)
					values(${userId}, ${animeId}, ${value});
			
					UPDATE anime
					SET rating = (SELECT AVG(rating) FROM rating WHERE anime_id = ${animeId})
					WHERE anime_id = ${animeId};
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
					WHERE anime_id = ${animeId} and user_id = ${userId};

					UPDATE anime
					SET rating = (SELECT AVG(rating) FROM rating WHERE anime_id = ${animeId})
					WHERE anime_id = ${animeId};
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
