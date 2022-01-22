import { ImageSize } from "../typeorm-types/enums";
import {
	Arg,
	FieldResolver,
	Float,
	Int,
	Query,
	Resolver,
	Root,
} from "type-graphql";
import { Anime } from "../entities/Anime";
import { Rating } from "../entities/Ratings";
import { getConnection } from "typeorm";
import { MAX_ANIME_FETCH_LIMIT, RECOMMENDER_API_BASE_URL } from "../constants";
// @ts-ignore
import fetch from "node-fetch";
import { typeAnimeResponse } from "../utils/typeRecommendationResponse";
import { AnimePaginationResponse } from "../typeorm-types/object-types";

@Resolver(Anime)
export class AnimeResolver {
	@FieldResolver(() => String)
	titleImage(
		@Root() root: Anime,
		@Arg("size", () => ImageSize, { nullable: true }) size: ImageSize
	) {
		if (!size) {
			return root.titleImage.medium
				? root.titleImage.medium
				: root.titleImage.small;
		}
		if (!root.titleImage) {
			return "no title image of this size available.";
		} else {
			return root.titleImage[size];
		}
	}

	// docs recommend using a field resolver to get relations rather than use a join
	@FieldResolver(() => [Rating])
	async ratings(@Root() root: Anime) {
		return (await getConnection().query(
			`SELECT * FROM rating WHERE "animeId" = ${root.animeId}`
		)) as Rating[];
	}

	@FieldResolver(() => String)
	synopsisSnippet(@Root() root: Anime) {
		return (
			root.synopsis.slice(0, Math.min(100, root.synopsis.length)) + "..."
		);
	}

	@Query(() => Anime)
	async anime(
		@Arg("animeId", () => Int) animeId: number
	): Promise<Anime | undefined> {
		return (
			await getConnection().query(
				`SELECT * FROM anime WHERE "animeId" = ${animeId}`
			)
		)[0] as Anime;
	}

	@Query(() => [Anime])
	async allAnimes() {
		return await getConnection().query(`SELECT * FROM anime`);
	}

	@Query(() => AnimePaginationResponse)
	// cursor is a maximum rating
	async someAnimes(
		@Arg("limit", () => Int) limit: number,
		@Arg("cursor", () => Float, { nullable: true }) cursor: number
	) {
		if (!cursor) {
			const response = await fetch(
				`${RECOMMENDER_API_BASE_URL}/popularity-recommender?recommendationCount=${limit}&verbose=True`
			);
			const responseJson = await response.json();
			const typedResponse = typeAnimeResponse(
				responseJson.recommendations
			);
			return {
				animes: typedResponse,
				allFetched: false,
			};
		} else {
			const effectiveLimit = Math.min(MAX_ANIME_FETCH_LIMIT, limit);
			const animes = await getConnection().query(
				`SELECT * FROM anime WHERE rating < ${cursor} ORDER BY rating DESC LIMIT ${effectiveLimit}`
			);
			const allFetched = animes.length < effectiveLimit;
			animes.forEach((anime: Anime) => {
				if (!anime.synopsis) {
					console.log(anime)
				}
			});
			return {
				animes,
				allFetched,
			};
		}
	}
}
