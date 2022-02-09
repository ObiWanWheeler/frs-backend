import { registerEnumType } from "type-graphql";

export enum ImageSize {
	TINY = "tiny",
	LARGE = "large",
	SMALL = "small",
	MEDIUM = "medium",
	ORIGINAL = "original"
}

registerEnumType(ImageSize, {
	name: "ImageSize",
	description: "tiny, large, small, medium or original",
});