import { MigrationInterface, QueryRunner } from "typeorm";

export class SnakeCaseColumns1746680500884 implements MigrationInterface {
    name = 'SnakeCaseColumns1746680500884';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename columns and constraints in the "price" table
        await queryRunner.query(`ALTER TABLE "price" RENAME COLUMN "cardId" TO "card_id"`);
        await queryRunner.query(`ALTER TABLE "price" RENAME CONSTRAINT "PK_5d21e3b7b80eee10fa0bd7ac910" TO "PK_b8288d2373b2e06555bfeca6139"`);

        // Rename columns in the "card" table
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "imgSrc" TO "img_src"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "isReserved" TO "is_reserved"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "manaCost" TO "mana_cost"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "oracleText" TO "oracle_text"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "setCode" TO "set_code"`);

        // Drop unnecessary columns in the "set" table
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "baseSize"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "keyruneCode"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "parentCode"`);
        await queryRunner.query(`ALTER TABLE "set" DROP COLUMN "releaseDate"`);

        // Modify the "inventory" table to use snake_case and preserve composite primary key
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_ac4791ef41c948be3de87b927d4"`);
        await queryRunner.query(`ALTER TABLE "inventory" RENAME COLUMN "cardId" TO "card_id"`);
        await queryRunner.query(`ALTER TABLE "inventory" RENAME COLUMN "userId" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_inventory" PRIMARY KEY ("user_id", "card_id")`);

        // Add new enum value to "legality_status_enum" if it doesn't already exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_enum
                    WHERE enumlabel = 'restricted' AND enumtypid = (
                        SELECT oid
                        FROM pg_type
                        WHERE typname = 'legality_status_enum'
                    )
                ) THEN
                    ALTER TYPE "public"."legality_status_enum" ADD VALUE 'restricted';
                END IF;
            END
            $$;
        `);

        // Update the "card_rarity_enum" type
        await queryRunner.query(`ALTER TYPE "public"."card_rarity_enum" RENAME TO "card_rarity_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."card_rarity_enum" AS ENUM('common', 'uncommon', 'rare', 'mythic', 'bonus', 'special')`);
        await queryRunner.query(`ALTER TABLE "card" ALTER COLUMN "rarity" TYPE "public"."card_rarity_enum" USING "rarity"::"text"::"public"."card_rarity_enum"`);
        await queryRunner.query(`DROP TYPE "public"."card_rarity_enum_old"`);

        // Update foreign key constraints in the "card" table
        await queryRunner.query(`ALTER TABLE "card" DROP CONSTRAINT "FK_6a3b0e3c3a92d36861b6d7f1957"`);
        await queryRunner.query(`ALTER TABLE "card" ADD CONSTRAINT "FK_6a3b0e3c3a92d36861b6d7f1957" FOREIGN KEY ("set_code") REFERENCES "set"("code") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "card" ADD CONSTRAINT "FK_9451069b6f1199730791a7f4ae4" FOREIGN KEY ("id") REFERENCES "price"("card_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert foreign key constraints in the "card" table
        await queryRunner.query(`ALTER TABLE "card" DROP CONSTRAINT "FK_9451069b6f1199730791a7f4ae4"`);
        await queryRunner.query(`ALTER TABLE "card" DROP CONSTRAINT "FK_6a3b0e3c3a92d36861b6d7f1957"`);

        // Revert the "card_rarity_enum" type
        await queryRunner.query(`CREATE TYPE "public"."card_rarity_enum_old" AS ENUM('common', 'uncommon', 'rare', 'mythic', 'bonus', 'special')`);
        await queryRunner.query(`ALTER TABLE "card" ALTER COLUMN "rarity" TYPE "public"."card_rarity_enum_old" USING "rarity"::"text"::"public"."card_rarity_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."card_rarity_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."card_rarity_enum_old" RENAME TO "card_rarity_enum"`);

        // Revert enum changes in "legality_status_enum"
        // Note: Removing enum values is not supported in PostgreSQL, so this step may need manual intervention.

        // Revert changes to the "inventory" table
        await queryRunner.query(`ALTER TABLE "inventory" DROP CONSTRAINT "PK_inventory"`);
        await queryRunner.query(`ALTER TABLE "inventory" RENAME COLUMN "card_id" TO "cardId"`);
        await queryRunner.query(`ALTER TABLE "inventory" RENAME COLUMN "user_id" TO "userId"`);
        await queryRunner.query(`ALTER TABLE "inventory" ADD CONSTRAINT "PK_ac4791ef41c948be3de87b927d4" PRIMARY KEY ("cardId", "userId")`);

        // Revert column renaming in the "card" table
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "set_code" TO "setCode"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "oracle_text" TO "oracleText"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "mana_cost" TO "manaCost"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "is_reserved" TO "isReserved"`);
        await queryRunner.query(`ALTER TABLE "card" RENAME COLUMN "img_src" TO "imgSrc"`);

        // Revert column drops in the "set" table
        await queryRunner.query(`ALTER TABLE "set" ADD "releaseDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set" ADD "parentCode" character varying`);
        await queryRunner.query(`ALTER TABLE "set" ADD "keyruneCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "set" ADD "baseSize" integer NOT NULL`);

        // Revert column renaming and constraints in the "price" table
        await queryRunner.query(`ALTER TABLE "price" RENAME CONSTRAINT "PK_b8288d2373b2e06555bfeca6139" TO "PK_5d21e3b7b80eee10fa0bd7ac910"`);
        await queryRunner.query(`ALTER TABLE "price" RENAME COLUMN "card_id" TO "cardId"`);
    }
}
