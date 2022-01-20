import { Anime } from "../entities/Anime";
import { plainToClass } from "class-transformer";

export const typeAnimeResponse = (animeJson: any) => {
	const typedRecommendations: Anime[] = [];
	animeJson.forEach((anime: any) => typedRecommendations.push(
		plainToClass(Anime, { animeId: anime.anime_id, ...anime })
	)
	);
	return typedRecommendations;
};
