-- Table: public.UCCCollegeDept

-- DROP TABLE IF EXISTS public."UCCCollegeDept";

CREATE TABLE IF NOT EXISTS public."UCCCollegeDept"
(
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."UCCCollegeDept"
    OWNER to postgres;

COMMENT ON TABLE public."UCCCollegeDept"
    IS '*** UCC COLLEGE REPOSITORY ***';

CREATE TABLE UCCCollegeRepository (
    student_number SERIAL UNIQUE,   -- Unique key for the student number
    email_address VARCHAR(255) PRIMARY KEY,   -- Primary key for the email address
    student_name VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    home_address TEXT UNIQUE,
    subject_1 VARCHAR(100),
    subject_2 VARCHAR(100),
    subject_3 VARCHAR(100),
    subject_4 VARCHAR(100),
	subject_5 VARCHAR(100),
	subject_6 VARCHAR(100),
	subject_7 VARCHAR(100),
	subject_8 VARCHAR(100),
	subject_9 VARCHAR(100),
	subject_10 VARCHAR(100)
);
