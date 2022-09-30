CREATE TABLE room (
	id SERIAL PRIMARY KEY,
	name VARCHAR(32) NOT NULL,
	messages JSONB[] NOT NULL,
	timestamp BIGINT NOT NULL,
	owner INT NOT NULL,
	protected BOOLEAN NOT NULL
);

CREATE TABLE post (
	id SERIAL PRIMARY KEY,
	owner INT NOT NULL,
	title VARCHAR(90) NOT NULL,
	description VARCHAR(130) NOT NULL,
	content TEXT NOT NULL,
	comments JSONB[] NOT NULL,
	tags VARCHAR(32)[] NOT NULL,
	slug VARCHAR(150) NOT NULL,
	timestamp BIGINT NOT NULL,
	image_pending BOOLEAN NOT NULL,
	image_blur VARCHAR(6000) NOT NULL,
	protected BOOLEAN NOT NULL
);

CREATE TABLE account (
	id SERIAL PRIMARY KEY,
	email VARCHAR(150) NOT NULL,
	username VARCHAR(24) NOT NULL,
	password VARCHAR(64) NOT NULL,
	conversations INT[] NOT NULL,
	rooms INT[] NOT NULL,
	inbox JSONB,
	verify_email_otp VARCHAR(64),
	email_verified BOOLEAN NOT NULL,
	login_method VARCHAR(64),
	tokens VARCHAR(128)[],
	protected BOOLEAN,
	timestamp BIGINT NOT NULL
);

CREATE TABLE pfp (
	owner INT NOT NULL PRIMARY KEY,
	base64 VARCHAR(50000) NOT NULL,
	protected BOOLEAN
);

CREATE TABLE roomImage (
	room INT NOT NULL PRIMARY KEY,
	base64 VARCHAR(100000) NOT NULL,
	protected BOOLEAN
);