import { Field, Float, Int, ObjectType } from "type-graphql";
import {
	BaseEntity, Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn
} from "typeorm";
import { Rating } from "./Ratings";

@ObjectType()
@Entity({ name: "anime", synchronize: false })
export class Anime extends BaseEntity {
	@Field(() => Int)
	@PrimaryGeneratedColumn({ name: "anime_id" })
	animeId!: number;

	@Field(() => String)
	@Column({ unique: true })
	name!: string;

	@Field(() => String)
	@Column({ unique: true })
	genre!: string;

	@Field(() => String)
	@Column()
	type!: string;

	@Field(() => Int)
	@Column()
	episodes!: number;

	@Field(() => Float)
	@Column()
	rating!: number;

	@Field(() => Int)
	@Column()
	members!: number;

	@Field(() => [Rating])
	@OneToMany(() => Rating, (rating) => rating.anime)
	ratings!: Rating[];

	@Field(() => String)
	@CreateDateColumn()
	createdAt: Date;

	@Field(() => String)
	@UpdateDateColumn()
	updatedAt: Date;
}
