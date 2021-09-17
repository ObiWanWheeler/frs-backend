import { registerEnumType } from "type-graphql";

export enum ImageSize {
	TINY = "tiny",
	LARGE = "large",
	SMALL = "small",
	MEDIUM = "medium",
	ORIGINAL = "original",
}

registerEnumType(ImageSize, {
	name: "UpdootDirection",
	description: "UP or DOWN",
});
