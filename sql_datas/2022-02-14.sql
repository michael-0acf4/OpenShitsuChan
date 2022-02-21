\c postgres
DROP DATABASE afshitsu;
CREATE DATABASE afshitsu;
\c afshitsu

CREATE SEQUENCE "questionSeq" START WITH 1;
CREATE SEQUENCE "characterSeq" START WITH 1;
CREATE SEQUENCE "answerSeq" START WITH 1;
CREATE SEQUENCE "feedbackSeq" START WITH 1;

CREATE TABLE "Question" (
	"idquestion" VARCHAR(50) PRIMARY KEY NOT NULL DEFAULT CONCAT('QST_', NEXTVAL('"questionSeq"')),
	"content" TEXT NOT NULL,
	"weight" INT NOT NULL DEFAULT 1
);

CREATE TABLE "Character" (
	"idcharacter" VARCHAR(50) PRIMARY KEY NOT NULL DEFAULT CONCAT('CHR_', NEXTVAL('"characterSeq"')),
	"name" VARCHAR (120) NOT NULL,
	"image" VARCHAR (120), -- reserved
	"play_count" INT NOT NULL DEFAULT 0,
	"submitted_by" VARCHAR (20) NOT NULL DEFAULT 'X'
);

CREATE TABLE "Answer" (
	"idanswer" VARCHAR(50) PRIMARY KEY NOT NULL DEFAULT CONCAT('ANS_', NEXTVAL('"answerSeq"')),
	"probability" NUMERIC,
	"idquestion" VARCHAR(50) NOT NULL,
	"idcharacter" VARCHAR(20) NOT NULL,
	FOREIGN KEY ("idquestion") REFERENCES "Question" ("idquestion"),
	FOREIGN KEY ("idcharacter") REFERENCES "Character" ("idcharacter")
);

CREATE TABLE "Feedback" (
	"idfeedback" VARCHAR(50) PRIMARY KEY NOT NULL DEFAULT CONCAT('FDB_', NEXTVAL('"feedbackSeq"')),
	"pseudo" VARCHAR (20) NOT NULL,
	"content" TEXT NOT NULL
);


CREATE OR REPLACE VIEW "v_CharaAnswer" AS (
	SELECT
		"Character"."idcharacter",
		"Character"."name",
		"Character"."play_count",
		"Character"."submitted_by",
		COALESCE("Answer"."probability", 0) "probability",
		"Answer"."idquestion"
	FROM
		"Character" 
		LEFT JOIN "Answer" ON "Answer"."idcharacter" = "Character"."idcharacter"
);

CREATE OR REPLACE VIEW "v_CharaQuestionAnswer" AS (
	SELECT
		"v_CharaAnswer".*,
		"Question"."content",
		"Question"."weight"
	FROM
		"v_CharaAnswer" 
		LEFT JOIN "Question" ON "Question"."idquestion" = "v_CharaAnswer"."idquestion"
	ORDER BY
		"v_CharaAnswer"."probability" DESC
);

-- assuming there is an unique answer for every character for each question
-- this view is kinda wrong, that's because even if the question
-- doesn't have any answer it will give a 1, for this to work we need
-- to filter answer for each character (as Temp) then do a LEFT JOIN to Temp instead of Answer.
-- the metric maybe wrong but it works in our particular case (the offset is 1)
CREATE OR REPLACE VIEW "v_QSTCountCHR" AS (
	SELECT
		"Question"."idquestion",
		"Question"."content",
		"Question"."weight",
		COUNT ("Answer"."idanswer") "related_chr_count",
		AVG ("Answer"."probability") "avg_probability"
	FROM
		"Question" JOIN "Answer"
		ON "Question"."idquestion" = "Answer"."idquestion"
	GROUP BY
		"Question"."idquestion",
		"Question"."content",
		"Question"."weight"
	ORDER BY
		"related_chr_count" DESC,
		"Question"."weight" DESC,
		"avg_probability" DESC
);

SELECT * FROM "v_CharaAnswer" WHERE "idcharacter" = 'CHR_1';
SELECT * FROM "v_CharaQuestionAnswer" WHERE "idcharacter" = 'CHR_1';
SELECT * FROM "v_QSTCountCHR";

CREATE OR REPLACE FUNCTION "getAllProbaByIdChara" (VARCHAR (50)) 
RETURNS TABLE(idcharacter VARCHAR(50), idquestion VARCHAR (50), content TEXT, idanswer VARCHAR (50), probability NUMERIC)
AS 
	$$ 
		SELECT
			$1 "idcharacter",
			"Question"."idquestion",
			"Question"."content",
			"temp"."idanswer", -- can be null
			COALESCE("temp"."probability", 0.5) "probability"
		FROM
			"Question" LEFT JOIN (SELECT * FROM "Answer" WHERE "idcharacter" = $1) AS "temp"
		ON "Question"."idquestion" = "temp"."idquestion"; 
	$$
LANGUAGE SQL;