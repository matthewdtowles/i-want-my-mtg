import { MigrationInterface, QueryRunner } from "typeorm";

export class SnakeCaseColumns1746681956284 implements MigrationInterface {
    name = 'SnakeCaseColumns1746681956284'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "price" RENAME COLUMN "cardId" TO "card_id"`);
        await queryRunner.query(`ALTER TABLE "price" RENAME CONSTRAINT "PK_5d21e3b7b80eee10fa0bd7ac910" TO "PK_b8288d2373b2e06555bfeca6139"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "imgSrc"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "isReserved"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "manaCost"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "oracleText"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "baseSize"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "keyruneCode"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "parentCode"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "releaseDate"`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_ac4791ef41c948be3de87b927d4"`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_fe4917e809e078929fe517ab762" PRIMARY KEY ("userId")`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP COLUMN "cardId"`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_fe4917e809e078929fe517ab762"`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "card" ADD "img_src" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "card" ADD "is_reserved" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "card" ADD "mana_cost" character varying`);
        await queryRunner.query(`ALTER TABLE "card" ADD "oracle_text" text`);
        await queryRunner.query(`ALTER TABLE "card" ADD "set_code" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set" ADD "base_size" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set" ADD "keyrune_code" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set" ADD "parent_code" character varying`);
        await queryRunner.query(`ALTER TABLE "set" ADD "release_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD "card_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_29f6cc758e96d11676a26c3a7d1" PRIMARY KEY ("card_id")`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD "user_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_29f6cc758e96d11676a26c3a7d1"`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_51fcd2abb9d700b3258e24a4176" PRIMARY KEY ("card_id", "user_id")`);
        await queryRunner.query(`ALTER TYPE "public"."legality_status_enum" RENAME TO "legality_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."legality_status_enum" AS ENUM('legal', 'banned', 'restricted')`);
        await queryRunner.query(`ALTER TABLE "legality" ALTER COLUMN "status" TYPE "public"."legality_status_enum" USING "status"::"text"::"public"."legality_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."legality_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "card" DROP CONSTRAINT "FK_6a3b0e3c3a92d36861b6d7f1957"`);
        await queryRunner.query(`ALTER TYPE "public"."card_rarity_enum" RENAME TO "card_rarity_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."card_rarity_enum" AS ENUM('common', 'uncommon', 'rare', 'mythic', 'bonus', 'special')`);
        await queryRunner.query(`ALTER TABLE "card" ALTER COLUMN "rarity" TYPE "public"."card_rarity_enum" USING "rarity"::"text"::"public"."card_rarity_enum"`);
        await queryRunner.query(`DROP TYPE "public"."card_rarity_enum_old"`);
        await queryRunner.query(`ALTER TABLE "card" ALTER COLUMN "setCode" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "card" ADD CONSTRAINT "FK_9451069b6f1199730791a7f4ae4" FOREIGN KEY ("id") REFERENCES "price"("card_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "card" ADD CONSTRAINT "FK_6a3b0e3c3a92d36861b6d7f1957" FOREIGN KEY ("setCode") REFERENCES "set"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "card" DROP CONSTRAINT "FK_6a3b0e3c3a92d36861b6d7f1957"`);
        await queryRunner.query(`ALTER TABLE "card" DROP CONSTRAINT "FK_9451069b6f1199730791a7f4ae4"`);
        await queryRunner.query(`ALTER TABLE "card" ALTER COLUMN "setCode" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."card_rarity_enum_old" AS ENUM('common', 'uncommon', 'rare', 'mythic', 'bonus', 'special')`);
        await queryRunner.query(`ALTER TABLE "card" ALTER COLUMN "rarity" TYPE "public"."card_rarity_enum_old" USING "rarity"::"text"::"public"."card_rarity_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."card_rarity_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."card_rarity_enum_old" RENAME TO "card_rarity_enum"`);
        await queryRunner.query(`ALTER TABLE "card" ADD CONSTRAINT "FK_6a3b0e3c3a92d36861b6d7f1957" FOREIGN KEY ("setCode") REFERENCES "set"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TYPE "public"."legality_status_enum_old" AS ENUM('legal', 'banned', 'restricted')`);
        await queryRunner.query(`ALTER TABLE "legality" ALTER COLUMN "status" TYPE "public"."legality_status_enum_old" USING "status"::"text"::"public"."legality_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."legality_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."legality_status_enum_old" RENAME TO "legality_status_enum"`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_51fcd2abb9d700b3258e24a4176"`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_29f6cc758e96d11676a26c3a7d1" PRIMARY KEY ("card_id")`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_29f6cc758e96d11676a26c3a7d1"`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP COLUMN "card_id"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "release_date"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "parent_code"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "keyrune_code"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "base_size"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "set_code"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "oracle_text"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "mana_cost"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "is_reserved"`);
        await queryRunner.query(`ALTER TABLE "card" DROP COLUMN "img_src"`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD "userId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_fe4917e809e078929fe517ab762" PRIMARY KEY ("userId")`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD "cardId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_fe4917e809e078929fe517ab762"`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_ac4791ef41c948be3de87b927d4" PRIMARY KEY ("cardId", "userId")`);
        await queryRunner.query(`ALTER TABLE "set" ADD "releaseDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set" ADD "parentCode" character varying`);
        await queryRunner.query(`ALTER TABLE "set" ADD "keyruneCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set" ADD "baseSize" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "card" ADD "oracleText" text`);
        await queryRunner.query(`ALTER TABLE "card" ADD "manaCost" character varying`);
        await queryRunner.query(`ALTER TABLE "card" ADD "isReserved" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "card" ADD "imgSrc" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "price" RENAME CONSTRAINT "PK_b8288d2373b2e06555bfeca6139" TO "PK_5d21e3b7b80eee10fa0bd7ac910"`);
        await queryRunner.query(`ALTER TABLE "price" RENAME COLUMN "card_id" TO "cardId"`);
    }

}
