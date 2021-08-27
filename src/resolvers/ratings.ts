import { isAuth } from "../middleware/isAuth";
import { MyContext } from "src/types";
import { Arg, Ctx, Int, Mutation, UseMiddleware, Resolver } from "type-graphql";
import { Entity, getConnection } from "typeorm";
import { BoolWithMessageResponse } from "../typeorm-types/object-types";
import { Rating } from "../entities/Ratings";

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
		const userId  = req.session.userId;
		console.log("userId: " + userId)
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
